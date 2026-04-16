# Smart Healthcare Monitoring System

Hackathon-ready real-time healthcare platform combining IoT telemetry, AI risk detection, cybersecurity controls, and a tamper-evident blockchain log.

## Project Structure

```text
medico/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── security.py
│   └── validator.py
├── blockchain/
│   ├── __init__.py
│   └── blockchain.py
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── iot/
│   └── esp32_health_monitor.ino
└── README.md
```

## Features

- ESP32 firmware for DHT11 and MAX30102 sensor collection
- Flask REST API with API-key authentication and input validation
- AI rule engine for risk detection
- SQLite storage for readings
- Simulated encryption for sensitive payload storage
- Simple blockchain to create tamper-evident logs
- Live dashboard with vitals, status, trend chart, and blockchain blocks

## Backend Setup

1. Create and activate a virtual environment:

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Set the API key if you want to override the default:

   ```bash
   export SMART_HEALTH_API_KEY="demo-secure-api-key"
   ```

4. Run the Flask server:

   ```bash
   python app.py
   ```

Backend runs at `http://127.0.0.1:5000`.

## Frontend Setup

Open `frontend/index.html` directly in a browser for a quick demo, or serve it locally:

```bash
cd frontend
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080`.

## ESP32 Setup

1. Open `iot/esp32_health_monitor.ino` in Arduino IDE.
2. Install libraries:
   - `DHT sensor library`
   - `MAX30105 by SparkFun`
3. Update:
   - `WIFI_SSID`
   - `WIFI_PASSWORD`
   - `API_URL`
   - `API_KEY`
4. Flash to ESP32.

The ESP32 posts JSON to the backend every 5 seconds.

## API Contract

### POST `/api/health-data`

Headers:

```http
Content-Type: application/json
X-API-Key: demo-secure-api-key
```

Request body:

```json
{
  "patient_id": "patient-001",
  "device_id": "esp32-room-1",
  "temperature": 36.8,
  "heart_rate": 82
}
```

Success response:

```json
{
  "success": true,
  "message": "Health data processed successfully",
  "data": {
    "patient_id": "patient-001",
    "device_id": "esp32-room-1",
    "temperature": 36.8,
    "heart_rate": 82,
    "received_at": "2026-04-16T10:20:14.213840+00:00",
    "status": {
      "overall_status": "Normal",
      "alerts": [
        "Normal"
      ]
    },
    "block_index": 1,
    "block_hash": "..."
  }
}
```

## Available Endpoints

- `GET /api/health` : backend health check
- `POST /api/health-data` : ingest ESP32 readings
- `GET /api/health-data/latest` : latest reading for dashboard
- `GET /api/health-data/history?limit=20` : latest history
- `GET /api/blockchain/logs` : blockchain blocks and validation status

## AI Logic

- `heart_rate > 120` -> `High Risk`
- `heart_rate < 50` -> `Low Risk`
- `temperature > 38` -> `Fever Alert`
- Otherwise -> `Normal`

## Demo Flow

1. Start Flask backend.
2. Open the dashboard.
3. Flash ESP32 and update backend IP in the firmware.
4. Watch real-time vitals, AI alerts, and blockchain blocks update every 5 seconds.

## Notes

- Blockchain is intentionally lightweight for hackathon demos.
- Encryption is simulated with XOR + base64 obfuscation to demonstrate secure storage concepts.
- SQLite database file is created automatically at `backend/healthcare.db`.
