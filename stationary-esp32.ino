#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <WiFi.h>

const char* ssid = "Zyxel_D9B1";
const char* password = "UNHTF48UEY";
const char serverAddress[] = "192.168.1.140";
const int serverPort = 8081;
const char serverPath[] = "/update-location";
const char DEVICE_NAME[] = "MobileESP32";

BLEScan* pBLEScan;
bool deviceFound = false;

class MyAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
public:
  void onResult(BLEAdvertisedDevice advertisedDevice) {
    if (advertisedDevice.haveName() && advertisedDevice.getName() == DEVICE_NAME) {
      deviceFound = true;
      BLEDevice::getScan()->stop();

      int8_t rssi = advertisedDevice.getRSSI();
      char postData[32];
      snprintf(postData, sizeof(postData), "device=%s&rssi=%d", advertisedDevice.getAddress().toString().c_str(), rssi);

      WiFiClient client;
      if (client.connect(serverAddress, serverPort)) {
        char requestHeader[64];
        snprintf(requestHeader, sizeof(requestHeader), "POST %s HTTP/1.1\r\nHost: %s\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: %d\r\n\r\n", serverPath, serverAddress, strlen(postData));

        client.print(requestHeader);
        client.print(postData);

        while (client.available()) {
          client.read();
        }
      }
      client.stop();
    }
  }
};

void setup() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
  }

  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new MyAdvertisedDeviceCallbacks());
  pBLEScan->setActiveScan(true);
  pBLEScan->start(0);
}

void loop() {
  if (deviceFound) {
    // Do something when the device is found
  }

  delay(5000);
}
