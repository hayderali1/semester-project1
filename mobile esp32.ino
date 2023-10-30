#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLEAdvertising.h>

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    Serial.println("Device connected");
  }

  void onDisconnect(BLEServer* pServer) {
    Serial.println("Device disconnected");
  }
};

#define DEVICE_NAME "MobileESP32"
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"

BLEAdvertising* pAdvertising;

void setup() {
  Serial.begin(115200);
  BLEDevice::init(DEVICE_NAME);

  BLEServer* pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pAdvertising = pServer->getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // 6ms
  pAdvertising->setMinPreferred(0x12);  // 12ms

  pService->start();
  pAdvertising->start();
  Serial.println("Waiting for connections...");
}

void loop() {
  // You can perform other tasks here
}
