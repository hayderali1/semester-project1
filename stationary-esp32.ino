#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <WiFi.h>

const char* ssid = "Zyxel_D9B1";
const char* password = "UNHTF48UEY";
const char serverAddress[] = "192.168.1.140";
const int serverPort = 8081;
const char serverPath[] = "/update-location";
const char SERVICE_UUID[] = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";

BLEScan* pBLEScan;
bool deviceFound = false;

class MyAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
public:
  void onResult(BLEAdvertisedDevice advertisedDevice) {
    if (advertisedDevice.haveServiceUUID() && advertisedDevice.getServiceUUID().equals(BLEUUID(SERVICE_UUID))) {
      deviceFound = true;
      BLEDevice::getScan()->stop();

      int8_t rssi = advertisedDevice.getRSSI();
      Serial.printf("Device Name: %s, Address: %s, RSSI: %d\n", advertisedDevice.getName().c_str(), advertisedDevice.getAddress().toString().c_str(), rssi);

      Serial.println("Connecting to server...");
      WiFiClient client;
      if (client.connect(serverAddress, serverPort)) {
        Serial.println("Connected to server. Sending data...");
        char postData[32];
        snprintf(postData, sizeof(postData), "device=%s&rssi=%d", advertisedDevice.getAddress().toString().c_str(), rssi);

        char requestHeader[64];
        snprintf(requestHeader, sizeof(requestHeader), "POST %s HTTP/1.1\r\nHost: %s\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: %d\r\n\r\n", serverPath, serverAddress, strlen(postData));

        client.print(requestHeader);
        client.print(postData);

        while (client.available()) {
          client.read();
        }
        Serial.println("Data sent to server.");
      } else {
        Serial.println("Failed to connect to server.");
      }
      client.stop();
    } else {
      Serial.println("Found a BLE device, but not the one we are looking for.");
    }
  }
};

void setup() {
  Serial.begin(115200);
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
  }
  Serial.println("Wi-Fi connected.");

  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new MyAdvertisedDeviceCallbacks());
}

void loop() {
  Serial.println("Scanning for BLE devices...");
  pBLEScan->start(5, false);
  pBLEScan->clearResults();

  if (deviceFound) {
    Serial.println("Specific BLE Device Found!");
    deviceFound = false;
  }

  delay(5000);
}
