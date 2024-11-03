#ifndef SYSCONF_H
#define SYSCONF_H

#include <Arduino.h>
#include <Storage.h>
#include <WiFi.h>

#define VBATPIN A13
#define uS_TO_S_FACTOR 1000000ull  /* Conversion factor for micro seconds to seconds */

class SysConfig {
    public:
        SysConfig();
        void sleep();
        void configDefaultSleep();
        int readBatteryVoltage();
        void setup_wifi_connection();
    private:
        Storage storage;
};

#endif