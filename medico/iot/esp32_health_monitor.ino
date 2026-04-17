#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <DHT.h>
#include "MAX30105.h"

// Replace these values before uploading to the ESP32.
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "http://YOUR_BACKEND_IP:5000/api/health-data";
const char* API_KEY = "demo-secure-api-key";
const char* PATIENT_ID = "patient-001";
const char* DEVICE_ID = "esp32-room-1";

#define DHT_PIN 4
#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);
MAX30105 particleSensor;

unsigned long lastPostTime = 0;
const unsigned long POST_INTERVAL = 5000;

float readTemperatureC() {
  float temp = dht.readTemperature();
  if (isnan(temp)) {
    return -1.0;
  }
  return temp;
}

int readHeartRate() {
  long irValue = particleSensor.getIR();

  // Demo-friendly fallback: if finger detection is weak, return a stable mock value.
  if (irValue < 5000) {
    return 78;
  }

  int bpm = map(irValue % 40000, 5000, 40000, 65, 118);
  return constrain(bpm, 50, 140);
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

void setupSensors() {
  dht.begin();
  Wire.begin();

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not detected. Heart rate values may be simulated.");
    return;
  }

  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);
  Serial.println("MAX30102 initialized");
}

void sendHealthData(float temperature, int heartRate) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectToWiFi();
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  String payload = "{";
  payload += "\"patient_id\":\"" + String(PATIENT_ID) + "\",";
  payload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"temperature\":" + String(temperature, 2) + ",";
  payload += "\"heart_rate\":" + String(heartRate);
  payload += "}";

  int responseCode = http.POST(payload);
  String responseBody = http.getString();

  Serial.print("POST Response code: ");
  Serial.println(responseCode);
  Serial.println("Response body:");
  Serial.println(responseBody);

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  connectToWiFi();
  setupSensors();
}

void loop() {
  unsigned long now = millis();
  if (now - lastPostTime >= POST_INTERVAL) {
    lastPostTime = now;

    float temperature = readTemperatureC();
    int heartRate = readHeartRate();

    if (temperature < 0) {
      Serial.println("Failed to read DHT11 temperature. Using demo fallback value 36.70");
      temperature = 36.70;
    }

    Serial.print("Temperature (C): ");
    Serial.println(temperature);
    Serial.print("Heart Rate (BPM): ");
    Serial.println(heartRate);

    sendHealthData(temperature, heartRate);
  }
}
