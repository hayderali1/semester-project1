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
    if (advertisedDevice.haveName()) {
      if (advertisedDevice.getName() == DEVICE_NAME) {
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
        Serial.printf("Found a BLE device: %s, but not the one we are looking for.\n", advertisedDevice.getName().c_str());
      }
    }
  }
};

void setup() {
  Serial.begin(115200); // Initialize serial monitor with baud rate 115200
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
  pBLEScan->start(5, false); // Scan for 5 seconds
  pBLEScan->clearResults();  // Clear scan results to save memory

  if (deviceFound) {
    Serial.println("Specific BLE Device Found!");
    // Do something when the device is found
    // Add your logic here
    // For example: Serial.println("BLE Device Found!");
    deviceFound = false; // Reset the flag for the next scan
  }

  delay(5000);
}
