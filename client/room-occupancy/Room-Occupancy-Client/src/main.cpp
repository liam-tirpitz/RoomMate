/*
 *  This sketch sends a message to a TCP server
 *
 */
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <EasyNTPClient.h>
#include <ArduinoJson.h>
#include <Screen.h>
#include "mbedtls/base64.h"


const char* NTP_HOST = "ntp1.rwth-aachen.de";
const int NTP_OFFSET = 1;  // UTC+1
const int NTP_PORT = 123;
const char* ssid = "RWTH-devices";
const char* pass = "N9alrk2ULDSWpidF";

unsigned char b64_buff[1000] = {0};
unsigned char byte_buff[48000] = {0};


WiFiUDP g_ntpUDP;
EasyNTPClient g_ntpClient(g_ntpUDP, NTP_HOST, NTP_OFFSET);

FooterState footerState;
Screen screen {&footerState};

WiFiMulti wifiMulti;

const String endpoint = "http://your-server.example.com:3001/occupancy";

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

void setup() {
  Serial.begin(115200);
  setup_wifi_connection();
  screen.setup();
  //screen.draw();
}

void stop() {
    Serial.println("END" + endpoint);
    while(true) {
        delay(1000);
    }
}


void getDataFromEndpoint() {
    String devid = WiFi.macAddress();
    devid.replace(":","");
    Serial.println(devid);
    if(WiFi.status()== WL_CONNECTED){
      HTTPClient http;
      
      http.begin(endpoint + "?devid=" + devid);

      int httpResponseCode = http.GET();
      int buffer_offset = 0;
      if (httpResponseCode>0) {
        if (httpResponseCode == HTTP_CODE_OK) {
            int len = http.getSize();
            WiFiClient *stream = http.getStreamPtr();
            Serial.println(len);
            
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
                Serial.println(outlen);
                buffer_offset = buffer_offset + outlen;
              }
              delay(1);
            }

        Serial.println();
        Serial.print("[HTTP] connection closed or file end.\n");
        }
        screen.drawImage(byte_buff);

        
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
    }

}


void loop() {
  getDataFromEndpoint();
  delay(900000);
}
