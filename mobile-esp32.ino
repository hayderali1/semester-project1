#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

#define DEVICE_NAME "MobileESP32"
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"

BLEServer* pServer;
BLEService* pService;

void setup() {
  Serial.begin(115200);

  BLEDevice::init(DEVICE_NAME);

  pServer = BLEDevice::createServer();
  pService = pServer->createService(BLEUUID(SERVICE_UUID));

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(pService->getUUID());
  pAdvertising->setScanResponse(true);

  pService->start();

  BLEDevice::startAdvertising();
  Serial.println("Setting up BLE...");
  Serial.println("Waiting for connections...");
}

void loop() {
  // Your main program logic goes here
  delay(1000);
}
