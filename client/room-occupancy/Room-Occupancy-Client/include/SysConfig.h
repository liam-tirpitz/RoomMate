#ifndef SYSCONF_H
#define SYSCONF_H

#include <Arduino.h>

#define VBATPIN A13

class SysConfig {
    public:
        SysConfig();
        void sleep();
    private:
};

#endif