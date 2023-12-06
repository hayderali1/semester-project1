#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "HUAWEI P30 lite";
const char* password = "7319174eaa25";
const char* serverAddress = "192.168.1.140";
const int serverPort = 3000;
const char* serverPath = "/update-location";  // Use the actual endpoint

BLEScan* pBLEScan;
bool deviceFound = false;

class MyAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
public:
  void onResult(BLEAdvertisedDevice advertisedDevice) {
    if (advertisedDevice.haveServiceUUID() && advertisedDevice.getServiceUUID().equals(BLEUUID("4fafc201-1fb5-459e-8fcc-c5c9c331914b"))) {
      deviceFound = true;
      BLEDevice::getScan()->stop();

      int8_t rssi = advertisedDevice.getRSSI();
      Serial.printf("Device Name: %s, Address: %s, RSSI: %d\n", advertisedDevice.getName().c_str(), advertisedDevice.getAddress().toString().c_str(), rssi);

      Serial.println("Connecting to server...");
      WiFiClient client;
      if (client.connect(serverAddress, serverPort)) {
        Serial.println("Connected to server. Sending data...");

        // Construct the data to be sent
        String postData;
        postData.reserve(100); // Adjust the size based on your expected maximum length

        // Add ESP32 address to the data
        postData = "device=" + String(advertisedDevice.getAddress().toString().c_str()) + "&rssi=" + String(rssi) + "&esp32_address=" + WiFi.macAddress();

        // Set up the HTTP POST request
        HTTPClient http;
        http.begin("http://" + String(serverAddress) + ":" + String(serverPort) + serverPath);
        http.addHeader("Content-Type", "application/x-www-form-urlencoded");

        // Send the POST request
        int httpResponseCode = http.POST(postData);

        // Check for a successful response
        if (httpResponseCode > 0) {
          Serial.print("HTTP Response code: ");
          Serial.println(httpResponseCode);
        } else {
          Serial.print("HTTP POST failed, error: ");
          Serial.println(httpResponseCode);
        }

        // End the HTTP request
        http.end();
      } else {
        Serial.print("Failed to connect to server. Connection status: ");
        Serial.println(client.connected());  // Print the connection status for debugging
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
