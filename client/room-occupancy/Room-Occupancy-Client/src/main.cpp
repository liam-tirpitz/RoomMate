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

const char* NTP_HOST = "pool.ntp.org";
const int NTP_OFFSET = 1;  // UTC+1
const int NTP_PORT = 123;
const char* ssid = "RWTH-devices";
const char* pass = "N9alrk2ULDSWpidF";

WiFiUDP g_ntpUDP;
EasyNTPClient g_ntpClient(g_ntpUDP, NTP_HOST, NTP_OFFSET);

WiFiMulti WiFiMulti;

const String endpoint = "http://your-server.example.com:3001/example";
//const String endpoint = "http://google.com/";

void setup() {
  Serial.begin(115200);
  delay(1000);
  //Serial.print("\nDefault ESP32 MAC Address: ");
  //Serial.println(Network.macAddress());
  // We start by connecting to a WiFi network
  WiFiMulti.addAP(ssid, pass);

  Serial.println();
  Serial.println();
  Serial.print("Waiting for WiFi... ");

  while (WiFiMulti.run() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  delay(500);
}

void stop() {
    Serial.println("END" + endpoint);
    while(true) {
        delay(1000);
    }
}

void loop() {
  if(WiFi.status()== WL_CONNECTED){
    HTTPClient http;
    
    http.begin(endpoint);

    int httpResponseCode = http.GET();
    
    if (httpResponseCode>0) {
        Serial.print("HTTP Response code: ");
        Serial.println(httpResponseCode);
      String payload = http.getString();
      Serial.println(payload);

      JsonDocument doc;
      deserializeJson(doc, payload);

      
      unsigned now = g_ntpClient.getUnixTime();

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
  delay(10000);
}

