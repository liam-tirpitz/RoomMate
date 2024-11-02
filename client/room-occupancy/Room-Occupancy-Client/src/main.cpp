/*
 *  This sketch sends a message to a TCP server
 *
 */
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Screen.h>
#include "mbedtls/base64.h"
#include <Provisioner.h>
#include <Storage.h>

#define uS_TO_S_FACTOR 1000000ull  /* Conversion factor for micro seconds to seconds */
#define regular_wakeup_interval_in_s  900        /* Time ESP32 will go to sleep (in seconds) */


const char* keys[] = {"h1", "h2", "h3", "h4", "h5"};

unsigned char b64_buff[1000] = {0};
unsigned char byte_buff[48000] = {0};

unsigned long previous_millis = 0;

String devid = "";
JsonDocument doc;
//RTC_DATA_ATTR char last_hash[16];


FooterState footerState;
Screen screen {&footerState};

Storage storage;

void sleep() {
  esp_sleep_pd_config(ESP_PD_DOMAIN_RTC_PERIPH,   ESP_PD_OPTION_OFF);
  esp_sleep_pd_config(ESP_PD_DOMAIN_RTC_SLOW_MEM, ESP_PD_OPTION_OFF);
  esp_sleep_pd_config(ESP_PD_DOMAIN_RTC_FAST_MEM, ESP_PD_OPTION_OFF);
  esp_sleep_pd_config(ESP_PD_DOMAIN_XTAL,         ESP_PD_OPTION_OFF);
  esp_deep_sleep_start();
}



void setup_wifi_connection() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(storage.getSSID().c_str(), storage.getPSK().c_str());

  // Serial.println();
  // Serial.println();
  // Serial.print("Waiting for WiFi... ");
  uint8_t count = 0;
  while (WiFi.status() != WL_CONNECTED && count < 5) {
    // Serial.print(".");
    count = count + 1;
    delay(10000);
  }

  if (count == 5) {
      sleep();
  } 

  // Serial.println("");
  // Serial.println("WiFi connected");
  // Serial.println("IP address: ");
  // Serial.println(WiFi.localIP());
}

uint8_t getImageDataFromEndpoint() {
    if(WiFi.status() == WL_CONNECTED){
      HTTPClient http;
      
      http.begin(storage.getEndpoint() + "image?devid=" + devid);

      int httpResponseCode = http.GET();
      int buffer_offset = 0;
      if (httpResponseCode>0) {
        if (httpResponseCode == HTTP_CODE_OK) {
            int len = http.getSize();
            WiFiClient *stream = http.getStreamPtr();
            
            while (http.connected() && (len > 0 || len == -1)) {
              size_t size = stream->available();
              if (size) {
                int c = stream->readBytes(b64_buff, ((size > sizeof(b64_buff)) ? sizeof(b64_buff) : size));
                if (len > 0) {
                  len -= c;
                }
                size_t outlen;
                int size_left = 48000-buffer_offset;
                if (size_left < 0) size_left = 0;
                mbedtls_base64_decode(byte_buff+buffer_offset, size_left, &outlen, b64_buff, c);
                buffer_offset = buffer_offset + outlen;
              }
              delay(1);
            }

          // Serial.println();
          // Serial.print("[HTTP] connection closed or file end.\n");
          http.end();
          return 0;
        }
      }
      else {
        // Serial.print("Error code: ");
        // Serial.println(httpResponseCode);
        http.end();
        return 1;
      }
      // Free resources
    }
    else {
      Serial.println("WiFi Disconnected");
      return 2;
    }
    return 3;
}

void getMetaDataFromEndpoint() {
  if(WiFi.status() == WL_CONNECTED){
    HTTPClient http;

    http.begin(storage.getEndpoint() + "data?devid=" + devid);
    int httpResponseCode = http.GET();

    if (httpResponseCode>0) {
      if (httpResponseCode == HTTP_CODE_OK) {
        String payload = http.getString();
        DeserializationError error = deserializeJson(doc, payload);
        if (error) {
          // Serial.print(F("deserializeJson() failed: "));
          // Serial.println(error.f_str());
       } else {
          // Serial.println("Updated Metadata");
       }
      }
    }
    http.end();
  }
}

void handleMetadata() {
  long next_update_unix = doc["next_update_unix"]; // 1728220858
  const char* hash = doc["hash"]; // "d41d8cd98f00b204e9800998ecf8427e"
  long current_time_unix = doc["current_time_unix"]; // 1728220858  
  bool is_night = doc["is_night"]; // false
  bool is_weekend = doc["is_weekend"]; // false

  // Redraw screen if metadata changed
  bool needs_update = false;
  storage.getPreferences().begin(NAMESPACE, false); 
  for (uint8_t i = 0; i < 5; i++) {
    char last_hash = storage.getPreferences().getChar(keys[i], 0);
    if(last_hash != hash[i]) {
      needs_update = true;
      break;
    }
  }
  if (needs_update) {
    // Serial.println("Update required.");
    if(!getImageDataFromEndpoint()) {
        screen.setup();
        screen.drawImage(byte_buff);
        screen.sleep();
    }
    for (uint8_t i = 0; i < 5; i++) {
      storage.getPreferences().putChar(keys[i], hash[i]);
    }
  } else {
      // Serial.println("Im Westen nichts neues.");
  }
  storage.getPreferences().end();
  // Serial.println("Configure sleep.");
  long diff = next_update_unix - current_time_unix;
  long sleep_time_in_s = 0;
  if (
      next_update_unix > 0 
      && diff > 0 
      // Skip next regular update if next event is less than 10 minutes in the future
      && ((diff < regular_wakeup_interval_in_s) || (diff - regular_wakeup_interval_in_s) < 600)) { 
    sleep_time_in_s = diff + 30;
  } else if (is_night || is_weekend) {
    sleep_time_in_s = diff + 30;
  } else {
    sleep_time_in_s = regular_wakeup_interval_in_s;
  }
  uint64_t sleep_time_in_us = sleep_time_in_s * uS_TO_S_FACTOR;
  esp_sleep_enable_timer_wakeup(sleep_time_in_us);
  // Serial.println("Sleep configured.");
  // Serial.print("Wait for ");
  // Serial.print(sleep_time_in_s);
  // Serial.println();

}


void updateState() {
    getMetaDataFromEndpoint();
    handleMetadata();
}



void setup() {
  uint64_t sleep_time_in_us = regular_wakeup_interval_in_s * uS_TO_S_FACTOR;
  esp_sleep_enable_timer_wakeup(sleep_time_in_us);

  Provisioner p = Provisioner();

  if(storage.getEndpoint() != "" && storage.getSSID() != "" && storage.getPSK() != "")  {
      devid = WiFi.macAddress();
      devid.replace(":","");  
      // Serial.println(devid);
      // setup_wifi_connection();
      // updateState();
      // sleep();
  } else {
    // Stay awake for configuration if config is incomplete
  }
}


void loop() {

}
