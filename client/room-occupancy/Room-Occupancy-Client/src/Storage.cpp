#include "Storage.h"


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
      preferences.begin(NAMESPACE, false); 
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
      preferences.begin(NAMESPACE, false); 
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
      preferences.begin(NAMESPACE, false); 
      String result = preferences.getString(KEY_ENDPOINT, "");
      preferences.end();
      return result;
}
