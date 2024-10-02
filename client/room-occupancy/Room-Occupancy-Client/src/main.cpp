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


const char* NTP_HOST = "pool.ntp.org";
const int NTP_OFFSET = 1;  // UTC+1
const int NTP_PORT = 123;
const char* ssid = "RWTH-devices";
const char* pass = "N9alrk2ULDSWpidF";

WiFiUDP g_ntpUDP;
EasyNTPClient g_ntpClient(g_ntpUDP, NTP_HOST, NTP_OFFSET);

FooterState footerState;
Screen screen {&footerState};

WiFiMulti wifiMulti;

const String endpoint = "http://your-server.example.com:3001/example";
//const String endpoint = "http://google.com/";

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
  screen.setup();
  screen.draw();
}

void stop() {
    Serial.println("END" + endpoint);
    while(true) {
        delay(1000);
    }
}


void loop() {
  delay(10000);
}

