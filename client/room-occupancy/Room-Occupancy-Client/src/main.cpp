/*
 *  This sketch sends a message to a TCP server
 *
 */
#include <Arduino.h>
#include <HttpClient.h>
#include <ArduinoJson.h>
#include <Screen.h>
#include "mbedtls/base64.h"
#include <Provisioner.h>
#include <Storage.h>
#include <SysConfig.h>
#include <ETH.h>

unsigned char b64_buff[1000] = {0};
unsigned char byte_buff[48000] = {0};

bool eth_connection_established = false;

String devid = "";
int voltage = 0;
JsonDocument doc;


FooterState footerState;
Screen screen {&footerState};

Storage storage;
SysConfig sysconfig;


uint8_t getImageDataFromEndpoint() {
    #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2
      if(WiFi.status() == WL_CONNECTED){
    #else
      if(true) {
    #endif
      HTTPClient http;
      
      String endpoint = storage.getEndpoint() + "image?devid=" + devid;
      #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2
      endpoint += "&voltage=" + String(voltage);
      #endif


      http.begin(endpoint);

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
      printf("WiFi Disconnected");
      return 2;
    }
    return 3;
}

void getMetaDataFromEndpoint() {
  #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2
  if(WiFi.status() == WL_CONNECTED){
  #else
  if(true) {
  #endif
    HTTPClient http;
    http.begin(storage.getEndpoint() + "data?devid=" + devid);
    printf("BEGIN");
    int httpResponseCode = http.GET();
    if (httpResponseCode>0) {
      if (httpResponseCode == HTTP_CODE_OK) {
        String payload = http.getString();
        DeserializationError error = deserializeJson(doc, payload);
        if (error) {
          // Serial.print(F("deserializeJson() failed: "));
          // Serial.println(error.f_str());
          printf(payload.c_str());

       } else {
          printf("Retrieved Metadata");
       }
      } else {
        printf("Connection failed:" + httpResponseCode);
      }
    }
    printf("Close connection");
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

  #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2

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
  #endif
  //printf("Wait for ");
  // Serial.print(sleep_time_in_s);
  // Serial.println();

}


void updateState() {
    getMetaDataFromEndpoint();
    handleMetadata();
}


// Actually, those are Ethernet Events.
void ETHEvent(WiFiEvent_t event)
{

  switch (event) {

    case ARDUINO_EVENT_ETH_START:
      // This will happen during setup, when the Ethernet service starts
      printf("ETH Started");
      //set eth hostname here
      // ETH.setHostname("esp32-ethernet");
      eth_connection_established = false;

      break;

    case ARDUINO_EVENT_ETH_CONNECTED:
      // This will happen when the Ethernet cable is plugged 
      printf("ETH Connected");
      break;

    case ARDUINO_EVENT_ETH_GOT_IP:
    // This will happen when we obtain an IP address through DHCP:
      devid = ETH.macAddress();
      devid.replace(":","");  
      printf("Got an IP Address for ETH MAC: ");
      // Serial.print(ETH.macAddress());
      // Serial.print(", IPv4: ");
      // Serial.print(ETH.localIP());
      // if (ETH.fullDuplex()) {
      //   Serial.print(", FULL_DUPLEX");
      // }
      // Serial.print(", ");
      // Serial.print(ETH.linkSpeed());
      // Serial.println("Mbps");
      eth_connection_established = true;
      break;

    case ARDUINO_EVENT_ETH_DISCONNECTED:
      // This will happen when the Ethernet cable is unplugged 
      printf("ETH Disconnected");
      eth_connection_established = false;

      break;

    case ARDUINO_EVENT_ETH_STOP:
      // This will happen when the ETH interface is stopped but this never happens
      printf("ETH Stopped");
      break;

    default:
      break;
  }
}



void setup() {
    Provisioner p = Provisioner();

    #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2
      devid = WiFi.macAddress();
      sysconfig.configDefaultSleep();
      if(storage.getEndpoint() != "" && storage.getSSID() != "" && storage.getPSK() != "")  {
          devid.replace(":","");  
          voltage = sysconfig.readBatteryVoltage();
          // Serial.println(devid);
          sysconfig.setup_wifi_connection();
          updateState();
          sysconfig.sleep();
      } else {
        screen.setup();
        screen.drawNewDeviceImage(devid.c_str());
        screen.sleep();
        // Stay awake for configuration if config is incomplete
      }

    #else
      WiFi.onEvent(ETHEvent);
      ETH.begin();

    #endif 

}


void loop() {
  #ifndef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2
      if(eth_connection_established) {
        updateState();
        delay(60000);
      }
  #endif 
}
