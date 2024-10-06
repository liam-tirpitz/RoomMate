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


const char* ssid = "RWTH-devices";
const char* pass = "N9alrk2ULDSWpidF";

unsigned char b64_buff[1000] = {0};
unsigned char byte_buff[48000] = {0};

unsigned long previous_millis = 0;



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

void getImageDataFromEndpoint() {
    String devid = WiFi.macAddress();
    devid.replace(":","");
    Serial.println(devid);
    if(WiFi.status()== WL_CONNECTED){
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
        }
      }
      else {
        Serial.print("Error code: ");
        Serial.println(httpResponseCode);
      }
      // Free resources
      http.end();
    }
    else {
      Serial.println("WiFi Disconnected");
      setup_wifi_connection();
    }
}


void updateState() {
    getImageDataFromEndpoint();
    screen.drawImage(byte_buff);

}

void setup() {
  Serial.begin(115200);
  setup_wifi_connection();
  screen.setup();
  updateState();
}


void loop() {
  if (millis() - previous_millis > 600000) { 
    previous_millis = millis();
    updateState();
  }
}
