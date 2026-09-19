#include <SysConfig.h>


SysConfig::SysConfig() {
};

void SysConfig::sleep() {
    esp_sleep_pd_config(ESP_PD_DOMAIN_RTC_PERIPH,   ESP_PD_OPTION_OFF);
    esp_sleep_pd_config(ESP_PD_DOMAIN_RTC_SLOW_MEM, ESP_PD_OPTION_OFF);
    esp_sleep_pd_config(ESP_PD_DOMAIN_RTC_FAST_MEM, ESP_PD_OPTION_OFF);
    esp_sleep_pd_config(ESP_PD_DOMAIN_XTAL,         ESP_PD_OPTION_OFF);
    esp_deep_sleep_start();
}

void SysConfig::configDefaultSleep() {
    esp_sleep_enable_timer_wakeup(storage.getRegularSleepTimeInS() * uS_TO_S_FACTOR);
}

int SysConfig::readBatteryVoltage() {
    #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2
    float measuredvbat = analogReadMilliVolts(VBATPIN);  
    measuredvbat *= 2;    
    int milivolt = round(measuredvbat);
    return milivolt;
    #else
    return 0;
    #endif 
}

void SysConfig::setup_wifi_connection() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(storage.getSSID().c_str(), storage.getPSK().c_str());

  // Serial.println();
  // Serial.println();
  printf("Waiting for WiFi... ");
  unsigned long connect_start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - connect_start) < WIFI_CONNECT_TIMEOUT_MS) {
    printf(".");
    delay(250);
  }

  // Do not stay awake with the radio on if the network is unavailable
  if (WiFi.status() != WL_CONNECTED) {
      printf("Could not connect to WiFi... ");
      sleep();
  }

  // Serial.println("");
  printf("WiFi connected");
  // Serial.println("IP address: ");
  // Serial.println(WiFi.localIP());
}
