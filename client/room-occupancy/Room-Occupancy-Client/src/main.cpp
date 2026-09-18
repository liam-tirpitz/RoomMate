/*
 *  This sketch sends a message to a TCP server
 *
 */
#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Screen.h>
#include "mbedtls/base64.h"
#include <Provisioner.h>
#include <Storage.h>
#include <SysConfig.h>
#include <ETH.h>

#define IMAGE_BUFFER_SIZE 48000
#define IMAGE_DOWNLOAD_TIMEOUT_MS 30000
// Below this voltage the radio is kept off, above the second one normal operation resumes.
// The cutoff must not be higher than low_battery_voltage_cutoff_in_mv on the server, otherwise the
// server still renders a normal screen while the device already stops updating.
#define LOW_BATTERY_CUTOFF_IN_MV 3100
#define LOW_BATTERY_RECOVERY_IN_MV 3300
#define LOW_BATTERY_SLEEP_IN_S 3600
// Time the device stays awake for serial provisioning before it goes to sleep
#define PROVISIONING_TIMEOUT_MS 600000
#define UNPROVISIONED_SLEEP_IN_S 3600
// Stored instead of a server hash while the server answers 404 for this device
#define UNKNOWN_DEVICE_HASH "unknown-device"

unsigned char b64_buff[800] = {0};
unsigned char byte_buff[IMAGE_BUFFER_SIZE] = {0};

bool eth_connection_established = false;
bool unprovisioned = false;

String devid = "";
int voltage = 0;
JsonDocument doc;


FooterState footerState;
Screen screen {&footerState};

Storage storage;
SysConfig sysconfig;


uint8_t getImageDataFromEndpoint() {
    #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2
      if(WiFi.status() == WL_CONNECTED){
    #else
      if(true) {
    #endif
      HTTPClient http;
      
      String endpoint = storage.getEndpoint() + "image?devid=" + devid;
      #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2
      endpoint += "&voltage=" + String(voltage);
      #endif


      http.begin(endpoint);

      int httpResponseCode = http.GET();
      size_t buffer_offset = 0;
      if (httpResponseCode>0) {
        if (httpResponseCode == HTTP_CODE_OK) {
            int len = http.getSize();
            WiFiClient *stream = http.getStreamPtr();
            // Base64 can only be decoded in complete 4-character groups, but the stream
            // delivers arbitrary chunk sizes. Up to 3 leftover characters are carried
            // over to the front of b64_buff and decoded together with the next chunk.
            size_t carry = 0;
            bool decode_failed = false;
            unsigned long download_start = millis();
            while (http.connected() && (len > 0 || len == -1)) {
              if (millis() - download_start > IMAGE_DOWNLOAD_TIMEOUT_MS) {
                printf("Image download timed out\n");
                decode_failed = true;
                break;
              }
              size_t size = stream->available();
              if (size) {
                size_t space = sizeof(b64_buff) - carry;
                int c = stream->readBytes(b64_buff + carry, (size > space) ? space : size);
                if (len > 0) {
                  len -= c;
                }
                size_t available_chars = carry + c;
                size_t decodable_chars = available_chars - (available_chars % 4);
                if (decodable_chars > 0) {
                  size_t outlen = 0;
                  int decode = mbedtls_base64_decode(byte_buff + buffer_offset, IMAGE_BUFFER_SIZE - buffer_offset,
                                                     &outlen, b64_buff, decodable_chars);
                  if (decode != 0) {
                    printf("Base64 decode failed: %d at offset %u\n", decode, (unsigned) buffer_offset);
                    decode_failed = true;
                    break;
                  }
                  buffer_offset += outlen;
                }
                carry = available_chars - decodable_chars;
                memmove(b64_buff, b64_buff + decodable_chars, carry);
              } else {
                delay(1);
              }
            }

          http.end();
          if (decode_failed || carry != 0 || buffer_offset != IMAGE_BUFFER_SIZE) {
            printf("Incomplete image: %u of %d bytes\n", (unsigned) buffer_offset, IMAGE_BUFFER_SIZE);
            return 4;
          }
          return 0;
        }
      }
      else {
        // Serial.print("Error code: ");
        // Serial.println(httpResponseCode);
        http.end();
        return 1;
      }
      // Free resources
    }
    else {
      printf("WiFi Disconnected\n");
      return 2;
    }
    return 3;
}

bool getMetaDataFromEndpoint() {
  bool success = false;
  #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2
  if(WiFi.status() == WL_CONNECTED){
  #else
  if(true) {
  #endif
    HTTPClient http;
    String endpoint = storage.getEndpoint() + "data?devid=" + devid;
    // Sent with every wake-up so the server can keep a battery history
    #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2
    if (voltage > 0) {
      endpoint += "&voltage=" + String(voltage);
    }
    #endif
    http.begin(endpoint);
    printf("BEGIN\n");
    int httpResponseCode = http.GET();
    if (httpResponseCode>0) {
      if (httpResponseCode == HTTP_CODE_OK) {
        String payload = http.getString();
        DeserializationError error = deserializeJson(doc, payload);
        if (error) {
          // Serial.print(F("deserializeJson() failed: "));
          // Serial.println(error.f_str());
          printf("%s \n", payload.c_str());

       } else {
          printf("Retrieved Metadata\n");
          success = true;
       }
      } else if (httpResponseCode == HTTP_CODE_NOT_FOUND
                 && !deserializeJson(doc, http.getString()) && doc["error"].is<const char*>()) {
        // The server does not know this device. Its image endpoint still serves the "new device" screen
        // with the MAC, so draw that once under a fixed hash and check again at the regular interval.
        printf("Device not registered on the server.\n");
        doc.clear();
        doc["hash"] = UNKNOWN_DEVICE_HASH;
        success = true;
      } else {
        printf("Connection failed: %d\n", httpResponseCode);
      }
    }
    printf("Close connection\n");
    http.end();
  }
  return success;
}

void configureSleep(long sleep_time_in_s) {
    // A wakeup time in the past would wrap around to an unpredictable, potentially very long sleep
    if (sleep_time_in_s <= 0) {
      printf("Invalid sleep time %ld s, falling back to the regular interval.\n", sleep_time_in_s);
      sleep_time_in_s = storage.getRegularSleepTimeInS();
    }
    // The stored interval is not validated either, so clamp here as well
    if (sleep_time_in_s < MIN_SLEEP_TIME_IN_S) {
      sleep_time_in_s = MIN_SLEEP_TIME_IN_S;
    }
    if (sleep_time_in_s > MAX_SLEEP_TIME_IN_S) {
      sleep_time_in_s = MAX_SLEEP_TIME_IN_S;
    }
    esp_sleep_enable_timer_wakeup((uint64_t) sleep_time_in_s * uS_TO_S_FACTOR);
    printf("Sleep configured for %ld s.\n", sleep_time_in_s);
}

// Returns whether the screen is known to show the current content
bool handleMetadata() {
  long next_update_unix = doc["next_update_unix"]; // 1728220858
  const char* hash = doc["hash"]; // "d41d8cd98f00b204e9800998ecf8427e"
  long current_time_unix = doc["current_time_unix"]; // 1728220858
  bool is_night = doc["is_night"]; // false
  bool is_weekend = doc["is_weekend"]; // false
  // Without valid metadata there is nothing to draw and nothing to schedule. Sleeping regularly here
  // avoids a reboot loop that would drain the battery while the server is unreachable.
  bool needs_update = hash != nullptr && storage.checkHash(hash);
  if (hash == nullptr) {
    printf("No metadata available.\n");
  }
  bool up_to_date = hash != nullptr;
  // Redraw screen if metadata changed
  if (needs_update) {
    printf("Update required.\n");
    up_to_date = false;
    if(!getImageDataFromEndpoint()) {
        screen.setup();
        screen.drawImage(byte_buff);
        screen.sleep();
        // Only remember the hash after a successful draw, so a failed download is retried on the next wakeup
        storage.setHash(hash);
        up_to_date = true;
    }
  } else {
      printf("Im Westen nichts neues.\n");
  }
  storage.getPreferences().end();
  // Serial.println("Configure sleep.");

  #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2

    long diff = next_update_unix - current_time_unix;
    long sleep_time_in_s = 0;
    int regular_wakeup_interval_in_s = storage.getRegularSleepTimeInS();
    if (
        next_update_unix > 0
        && diff > 0
        // Skip next regular update if next event is less than 10 minutes in the future
        && ((diff < regular_wakeup_interval_in_s) || (diff - regular_wakeup_interval_in_s) < 600)) {
      sleep_time_in_s = diff + 30;
    } else if ((is_night || is_weekend) && next_update_unix > 0 && diff > 0) {
      sleep_time_in_s = diff + 30;
    } else {
      sleep_time_in_s = regular_wakeup_interval_in_s;
    }
    configureSleep(sleep_time_in_s);
  #endif
  return up_to_date;
  //printf("Wait for ");
  // Serial.print(sleep_time_in_s);
  // Serial.println();

}


bool updateState() {
    getMetaDataFromEndpoint();
    return handleMetadata();
}


// Actually, those are Ethernet Events.
void ETHEvent(WiFiEvent_t event)
{

  switch (event) {

    case ARDUINO_EVENT_ETH_START:
      // This will happen during setup, when the Ethernet service starts
      printf("ETH Started\n");
      //set eth hostname here
      // ETH.setHostname("esp32-ethernet");
      eth_connection_established = false;

      break;

    case ARDUINO_EVENT_ETH_CONNECTED:
      // This will happen when the Ethernet cable is plugged 
      printf("ETH Connected\n");
      break;

    case ARDUINO_EVENT_ETH_GOT_IP:
    // This will happen when we obtain an IP address through DHCP:
      devid = ETH.macAddress();
      devid.replace(":","");  
      printf("Got an IP Address for ETH MAC. \n");
      // Serial.print(ETH.macAddress());
      // Serial.print(", IPv4: ");
      // Serial.print(ETH.localIP());
      // if (ETH.fullDuplex()) {
      //   Serial.print(", FULL_DUPLEX");
      // }
      // Serial.print(", ");
      // Serial.print(ETH.linkSpeed());
      // Serial.println("Mbps");
      eth_connection_established = true;
      break;

    case ARDUINO_EVENT_ETH_DISCONNECTED:
      // This will happen when the Ethernet cable is unplugged 
      printf("ETH Disconnected\n");
      eth_connection_established = false;

      break;

    case ARDUINO_EVENT_ETH_STOP:
      // This will happen when the ETH interface is stopped but this never happens
      printf("ETH Stopped\n");
      break;

    default:
      break;
  }
}



void setup() {
    Provisioner p = Provisioner();
    #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2
      devid = WiFi.macAddress();
      sysconfig.configDefaultSleep();
      if(storage.getEndpoint() != "" && storage.getSSID() != "" && storage.getPSK() != "")  {
          devid.replace(":","");
          voltage = sysconfig.readBatteryVoltage();
          printf("Battery: %d mV\n", voltage);
          // Stay in low battery mode until the battery is charged well above the cutoff, otherwise a
          // voltage hovering around it would alternate between the warning and normal updates.
          if (voltage > 0 && (voltage < LOW_BATTERY_CUTOFF_IN_MV
                              || (storage.getLowBatteryShown() && voltage < LOW_BATTERY_RECOVERY_IN_MV))) {
              // Arm the low battery interval before the radio is powered, because a failed WiFi
              // connection sleeps immediately and would otherwise use the regular interval
              configureSleep(LOW_BATTERY_SLEEP_IN_S);
              // Fetch the low battery screen once, then keep the radio off until the device is charged again.
              // Waking up regularly on an empty battery drains it further and risks brownout reboots.
              if (!storage.getLowBatteryShown()) {
                  // The warning replaces the current content, so it has to be drawn even though the
                  // calendar data itself did not change
                  storage.invalidateHash();
                  sysconfig.setup_wifi_connection();
                  // Only stop updating once the warning is actually on the screen
                  if (updateState()) {
                      storage.setLowBatteryShown(true);
                  }
              } else {
                  printf("Battery still low, skipping update.\n");
              }
              // updateState() configures the sleep time from the metadata, so set it again
              configureSleep(LOW_BATTERY_SLEEP_IN_S);
              sysconfig.sleep();
          }
          if (storage.getLowBatteryShown()) {
              printf("Battery charged, resuming normal operation.\n");
              storage.setLowBatteryShown(false);
              // The screen still shows the warning and has to be replaced
              storage.invalidateHash();
          }
          // Serial.println(devid);
          sysconfig.setup_wifi_connection();
          updateState();
          sysconfig.sleep();
      } else {
        screen.setup();
        screen.drawNewDeviceImage(devid.c_str());
        screen.sleep();
        // Stay awake for configuration if config is incomplete, see loop()
        unprovisioned = true;
      }

    #else
      WiFi.onEvent(ETHEvent);
      ETH.begin();

    #endif 

}


void loop() {
  #ifdef ARDUINO_ADAFRUIT_FEATHER_ESP32_V2
      if(unprovisioned) {
        // The console runs in its own task, so pick up a configuration as soon as it is complete
        if(storage.getEndpoint() != "" && storage.getSSID() != "" && storage.getPSK() != "") {
          printf("Configuration received, restarting.\n");
          ESP.restart();
        }
        // Do not stay awake forever waiting for a serial configuration that may never come
        if(millis() > PROVISIONING_TIMEOUT_MS) {
          printf("No configuration received, going to sleep.\n");
          configureSleep(UNPROVISIONED_SLEEP_IN_S);
          sysconfig.sleep();
        }
        delay(500);
      }
  #else
      if(eth_connection_established) {
        updateState();
        delay(60000);
      }
  #endif
}
