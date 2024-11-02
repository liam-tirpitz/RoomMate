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
