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
    float measuredvbat = analogReadMilliVolts(VBATPIN);  
    measuredvbat *= 2;    
    int milivolt = round(measuredvbat);
    return milivolt;
}

void SysConfig::setup_wifi_connection() {
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
      sleep();
  } 

  // Serial.println("");
  printf("WiFi connected");
  // Serial.println("IP address: ");
  // Serial.println(WiFi.localIP());
}
