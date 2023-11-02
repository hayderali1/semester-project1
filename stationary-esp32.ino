#include <ArduinoHttpClient.h>
#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <sstream>
#include <WiFi.h>

const char* ssid = "Zyxel_D9B1";
const char* password = "UNHTF48UEY";
const char* mobileServiceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const char* serverAddress = "192.168.1.140";
const int serverPort = 8081;
const char* serverPath = "/update-location";

BLEScan* pBLEScan;
ArduinoHttpClient client; // Declare the client variable outside of the onResult() method

class MyAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
 public:
  void onResult(BLEAdvertisedDevice advertisedDevice) {
    std::stringstream requestBody;
    requestBody << "deviceAddress=" << advertisedDevice.getAddress().toString() << "&rssi=" << advertisedDevice.getRSSI();

    client.begin(serverAddress, serverPort);
    client.addHeader("Content-Type", "application/x-www-form-urlencoded");
    int httpResponseCode = client.POST(serverPath, requestBody);

    if (httpResponseCode > 0) {
      Serial.println(F("Data sent successfully"));
    } else {
      Serial.print(F("Error on sending data. HTTP Error: "));
      Serial.println(httpResponseCode);
    }

    client.end();
  }
};

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println(F("Connecting to WiFi..."));
  }
  Serial.println(F("Connected to WiFi"));
  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new MyAdvertisedDeviceCallbacks());
  pBLEScan->setActiveScan(true);
  pBLEScan->start(0);
}

void loop() {
  delay(5000); // Adjust the scan interval as needed
}
