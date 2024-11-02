#include "Storage.h"


const char* Storage::keys[] = {"h1", "h2", "h3", "h4", "h5"};


Storage::Storage() {
}

Preferences Storage::getPreferences() {
    return this->preferences;
}


void Storage::setPSK(const String psk) {
      preferences.begin(NAMESPACE, false); 
      preferences.putString(KEY_PSK, psk);
      preferences.end();
}

String Storage::getPSK() {
      preferences.begin(NAMESPACE, true); 
      String result = preferences.getString(KEY_PSK, "");
      preferences.end();
      return result;
}

void Storage::setSSID(const String ssid) {
      preferences.begin(NAMESPACE, false); 
      preferences.putString(KEY_SSID, ssid);
      preferences.end();
}

String Storage::getSSID() {
      preferences.begin(NAMESPACE, true); 
      String result = preferences.getString(KEY_SSID, "");
      preferences.end();
      return result;
}

void Storage::setEndpoint(const String endpoint) {
      preferences.begin(NAMESPACE, false); 
      preferences.putString(KEY_ENDPOINT, endpoint);
      preferences.end();
}

String Storage::getEndpoint() {
      preferences.begin(NAMESPACE, true); 
      String result = preferences.getString(KEY_ENDPOINT, "");
      preferences.end();
      return result;
}

bool Storage::checkHash(const char* hash) {
      bool needs_update = false;
      preferences.begin(NAMESPACE, true); 
      for (uint8_t i = 0; i < 5; i++) {
            char last_hash = preferences.getChar(this->keys[i], 0);
            if(last_hash != hash[i]) {
                  needs_update = true;
                  break;
            }
      }
      preferences.end();
      return needs_update;
}

void Storage::setHash(const char* hash) {
      preferences.begin(NAMESPACE, false); 
      for (uint8_t i = 0; i < 5; i++) {
            preferences.putChar(this->keys[i], hash[i]);
      }
      preferences.end();
}

void Storage::setRegularSleepTimeInS(int sleepTime) {
      preferences.begin(NAMESPACE, false); 
      preferences.putInt(KEY_SLEEPTIME, sleepTime);
      preferences.end();
}

int Storage::getRegularSleepTimeInS() {
      preferences.begin(NAMESPACE, false); 
      int sleepTime = preferences.getInt(KEY_SLEEPTIME, 900);
      preferences.end();
      return sleepTime;
}

