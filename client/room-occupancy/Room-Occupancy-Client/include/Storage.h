#ifndef STORAGE_H
#define STORAGE_H

#include <Preferences.h>

#define NAMESPACE "CALENDAR"
#define KEY_SSID "SSID"
#define KEY_PSK "PSK"
#define KEY_ENDPOINT "ENDPOINT"
#define KEY_SLEEPTIME "SLEEPTIME"
#define KEY_LOWBAT "LOWBAT"

// Bounds for every configured or calculated sleep time. The minimum keeps a bogus interval from
// turning into a permanent wakeup loop, the maximum covers a full night without parking the device.
#define MIN_SLEEP_TIME_IN_S 60
#define MAX_SLEEP_TIME_IN_S 86400




class Storage {
    public:
        Storage();
        void setPSK(const String psk);
        String getPSK();
        
        void setSSID(const String ssid);
        String getSSID();

        void setEndpoint(const String endpoint);
        String getEndpoint();

        void setHash(const char* hash);
        bool checkHash(const char* hash);
        void invalidateHash();

        void setLowBatteryShown(bool shown);
        bool getLowBatteryShown();

        void setRegularSleepTimeInS(int sleepTime);
        int getRegularSleepTimeInS();


        Preferences getPreferences();

    private:
        Preferences preferences;
        static const char* keys[];


};

#endif