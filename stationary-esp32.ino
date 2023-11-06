#include <BLEDevice.h>
#include <BLEScan.h>
#include <WiFi.h>

const char* ssid = "Zyxel_D9B1";
const char* password = "UNHTF48UEY";
const char serverAddress[] = "192.168.1.140";
const int serverPort = 8081;
const char serverPath[] = "/update-location";
const char DEVICE_NAME[] = "MobileESP32";
BLEScan* pBLEScan;
bool deviceFound = false;

// Forward declaration of sendPostRequest
void sendPostRequest(BLEAdvertisedDevice& advertisedDevice);

// Callback class for BLE scanning
class MyAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
public:
  void onResult(BLEAdvertisedDevice advertisedDevice) {
    if (advertisedDevice.haveName() && advertisedDevice.getName() == DEVICE_NAME) {
      deviceFound = true;
      BLEDevice::getScan()->stop();
      // Call sendPostRequest function
      sendPostRequest(advertisedDevice);
    }
  }
};

// Setup function to initialize WiFi and BLE
void setup() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(1000);
  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new MyAdvertisedDeviceCallbacks());
  pBLEScan->setActiveScan(true);
  pBLEScan->start(0);
}

// Main loop function
void loop() {
  if (deviceFound) {
    deviceFound = false; // Reset the flag
    pBLEScan->start(0);  // Restart scanning
  }
  delay(5000); // Scan every 5 seconds
}

// Function to send POST request to the server
void sendPostRequest(BLEAdvertisedDevice& advertisedDevice) {
  int8_t rssi = advertisedDevice.getRSSI();
  char postData[32];
  snprintf(postData, sizeof(postData), "device=%s&rssi=%d", advertisedDevice.getAddress().toString().c_str(), rssi);
  WiFiClient client;
  if (client.connect(serverAddress, serverPort)) {
    client.print(F("POST "));
    client.print(serverPath);
    client.print(F(" HTTP/1.1\r\nHost: "));
    client.print(serverAddress);
    client.print(F("\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: "));
    client.print(strlen(postData));
    client.print(F("\r\n\r\n"));
    client.print(postData);
    client.stop();
  }
}