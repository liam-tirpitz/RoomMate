#ifndef STORAGE_H
#define STORAGE_H

#include <Preferences.h>

#define NAMESPACE "CALENDAR"
#define KEY_SSID "SSID"
#define KEY_PSK "PSK"
#define KEY_ENDPOINT "ENDPOINT"



class Storage {
    public:
        Storage();
        void setPSK(const String psk);
        String getPSK();
        
        void setSSID(const String ssid);
        String getSSID();

        void setEndpoint(const String endpoint);
        String getEndpoint();

        void setHash();
        void getHash();

        Preferences getPreferences();

    private:
        Preferences preferences;


};

#endif