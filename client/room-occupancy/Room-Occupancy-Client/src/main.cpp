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
#include <SysConfig.h>

#define uS_TO_S_FACTOR 1000000ull  /* Conversion factor for micro seconds to seconds */


unsigned char b64_buff[1000] = {0};
unsigned char byte_buff[48000] = {0};

unsigned long previous_millis = 0;

String devid = "";
int voltage = 0;
JsonDocument doc;


FooterState footerState;
Screen screen {&footerState};

Storage storage;
SysConfig sysconfig;




void setup_wifi_connection() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(storage.getSSID().c_str(), storage.getPSK().c_str());

  // Serial.println();
  // Serial.println();
  printf("Waiting for WiFi... ");
  uint8_t count = 0;
  while (WiFi.status() != WL_CONNECTED && count < 5) {
    printf(".");
    count = count + 1;
    delay(10000);
  }

  if (count == 5) {
      printf("Could not connect to WiFi... ");
      sysconfig.sleep();
  } 

  // Serial.println("");
  printf("WiFi connected");
  // Serial.println("IP address: ");
  // Serial.println(WiFi.localIP());
}

uint8_t getImageDataFromEndpoint() {
    if(WiFi.status() == WL_CONNECTED){
      HTTPClient http;
      
      http.begin(storage.getEndpoint() + "image?devid=" + devid + "&voltage=" + String(voltage));

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
          printf("Updated Metadata");
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
  bool needs_update = storage.checkHash(hash);
  // Redraw screen if metadata changed
  if (needs_update) {
    printf("Update required.");
    if(!getImageDataFromEndpoint()) {
        screen.setup();
        screen.drawImage(byte_buff);
        screen.sleep();
    }
    storage.setHash(hash);
  } else {
      printf("Im Westen nichts neues.");
  }
  storage.getPreferences().end();
  // Serial.println("Configure sleep.");
  long diff = next_update_unix - current_time_unix;
  long sleep_time_in_s = 0;
  int regular_wakeup_interval_in_s = storage.getRegularSleepTimeInS();
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
  printf("Sleep configured.");
  //printf("Wait for ");
  // Serial.print(sleep_time_in_s);
  // Serial.println();

}


void updateState() {
    getMetaDataFromEndpoint();
    handleMetadata();
}

int readBatteryVoltage() {
  float measuredvbat = analogReadMilliVolts(VBATPIN);  
  measuredvbat *= 2;    
  int milivolt = round(measuredvbat);
  return milivolt;
}




void setup() {
  uint64_t sleep_time_in_us = storage.getRegularSleepTimeInS() * uS_TO_S_FACTOR;
  esp_sleep_enable_timer_wakeup(sleep_time_in_us);

  Provisioner p = Provisioner();

  if(storage.getEndpoint() != "" && storage.getSSID() != "" && storage.getPSK() != "")  {
      devid = WiFi.macAddress();
      devid.replace(":","");  
      voltage = readBatteryVoltage();
      // Serial.println(devid);
      setup_wifi_connection();
      updateState();
      sysconfig.sleep();
  } else {
    // Stay awake for configuration if config is incomplete
  }
}


void loop() {}
