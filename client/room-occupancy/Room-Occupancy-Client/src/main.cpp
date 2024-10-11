/*
 *  This sketch sends a message to a TCP server
 *
 */
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Screen.h>
#include "mbedtls/base64.h"

#define uS_TO_S_FACTOR 1000000ull  /* Conversion factor for micro seconds to seconds */
#define regular_wakeup_interval_in_s  900        /* Time ESP32 will go to sleep (in seconds) */


const char* ssid = "RWTH-devices";
const char* pass = "N9alrk2ULDSWpidF";

unsigned char b64_buff[1000] = {0};
unsigned char byte_buff[48000] = {0};

unsigned long previous_millis = 0;

String devid = "";
JsonDocument doc;
RTC_DATA_ATTR char last_hash[16];


FooterState footerState;
Screen screen {&footerState};

WiFiMulti wifiMulti;

const String endpoint = "http://your-server.example.com:3001/";



void setup_wifi_connection() {
  wifiMulti.addAP(ssid, pass);

  Serial.println();
  Serial.println();
  Serial.print("Waiting for WiFi... ");

  while (wifiMulti.run() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

uint8_t getImageDataFromEndpoint() {
    if(WiFi.status() == WL_CONNECTED){
      HTTPClient http;
      
      http.begin(endpoint + "image?devid=" + devid);

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

          Serial.println();
          Serial.print("[HTTP] connection closed or file end.\n");
          http.end();
          return 0;
        }
      }
      else {
        Serial.print("Error code: ");
        Serial.println(httpResponseCode);
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

    http.begin(endpoint + "data?devid=" + devid);
    int httpResponseCode = http.GET();

    if (httpResponseCode>0) {
      if (httpResponseCode == HTTP_CODE_OK) {
        String payload = http.getString();
        DeserializationError error = deserializeJson(doc, payload);
        if (error) {
          Serial.print(F("deserializeJson() failed: "));
          Serial.println(error.f_str());
       } else {
          Serial.println("Updated Metadata");
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
  for (uint8_t i = 0; i < 5; i++) {
    if(last_hash[i] != hash[i]) {
      needs_update = true;
      break;
    }
  }
  if (needs_update) {
    Serial.println("Update required.");
    if(!getImageDataFromEndpoint()) {
        screen.setup();
        screen.drawImage(byte_buff);
        screen.sleep();
    }
    for (uint8_t i = 0; i < 5; i++) {
      last_hash[i] = hash[i];
    }
  } else {
      Serial.println("Im Westen nichts neues.");
  }

  Serial.println("Configure sleep.");
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
  Serial.println("Sleep configured.");
  Serial.print("Wait for ");
  Serial.print(sleep_time_in_s);
  Serial.println();

}


void updateState() {
    getMetaDataFromEndpoint();
    handleMetadata();
}

void sleep() {
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  setup_wifi_connection();
  devid = WiFi.macAddress();
  devid.replace(":","");  
  updateState();
  sleep();
}


void loop() {

}
