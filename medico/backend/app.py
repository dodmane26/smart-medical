import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from flask import Flask, jsonify, request

from security import encrypt_payload, verify_api_key
from validator import validate_health_payload

ROOT_DIR = Path(__file__).resolve().parents[1]
DB_PATH = ROOT_DIR / "backend" / "healthcare.db"

import sys

if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from blockchain.blockchain import HealthcareBlockchain  # noqa: E402


app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

blockchain = HealthcareBlockchain()


def get_db_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    connection = get_db_connection()
    with connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS health_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                temperature REAL NOT NULL,
                heart_rate INTEGER NOT NULL,
                status TEXT NOT NULL,
                device_id TEXT NOT NULL,
                received_at TEXT NOT NULL,
                encrypted_payload TEXT NOT NULL,
                block_hash TEXT NOT NULL
            )
            """
        )
    connection.close()


def build_status(temperature: float, heart_rate: int) -> Dict[str, Any]:
    alerts: List[str] = []

    if heart_rate > 120:
        alerts.append("High Risk")
    elif heart_rate < 50:
        alerts.append("Low Risk")

    if temperature > 38:
        alerts.append("Fever Alert")

    overall_status = "Normal" if not alerts else "Alert"

    return {
        "overall_status": overall_status,
        "alerts": alerts or ["Normal"],
    }


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,X-API-Key"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


@app.route("/api/health-data", methods=["POST", "OPTIONS"])
def ingest_health_data():
    if request.method == "OPTIONS":
        return ("", 204)

    api_key = request.headers.get("X-API-Key", "")
    if not verify_api_key(api_key):
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"success": False, "message": "Invalid JSON body"}), 400

    is_valid, errors, normalized = validate_health_payload(payload)
    if not is_valid:
        return jsonify({"success": False, "message": "Validation failed", "errors": errors}), 400

    status = build_status(normalized["temperature"], normalized["heart_rate"])
    received_at = datetime.now(timezone.utc).isoformat()

    secured_payload = {
        **normalized,
        "status": status,
        "received_at": received_at,
    }

    encrypted_payload = encrypt_payload(secured_payload, api_key)
    block = blockchain.create_block(secured_payload)

    connection = get_db_connection()
    with connection:
        connection.execute(
            """
            INSERT INTO health_readings (
                patient_id, temperature, heart_rate, status, device_id,
                received_at, encrypted_payload, block_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                normalized["patient_id"],
                normalized["temperature"],
                normalized["heart_rate"],
                status["overall_status"],
                normalized["device_id"],
                received_at,
                encrypted_payload,
                block["hash"],
            ),
        )
    connection.close()

    return (
        jsonify(
            {
                "success": True,
                "message": "Health data processed successfully",
                "data": {
                    **normalized,
                    "received_at": received_at,
                    "status": status,
                    "block_index": block["index"],
                    "block_hash": block["hash"],
                },
            }
        ),
        201,
    )


@app.route("/api/health-data/latest", methods=["GET"])
def get_latest_health_data():
    connection = get_db_connection()
    row = connection.execute(
        """
        SELECT patient_id, temperature, heart_rate, status, device_id, received_at, block_hash
        FROM health_readings
        ORDER BY id DESC
        LIMIT 1
        """
    ).fetchone()
    connection.close()

    if row is None:
        return jsonify({"success": True, "data": None})

    return jsonify({"success": True, "data": dict(row)})


@app.route("/api/health-data/history", methods=["GET"])
def get_health_history():
    limit = request.args.get("limit", default=20, type=int)
    limit = max(1, min(limit, 100))

    connection = get_db_connection()
    rows = connection.execute(
        """
        SELECT patient_id, temperature, heart_rate, status, device_id, received_at, block_hash
        FROM health_readings
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    connection.close()

    history = [dict(row) for row in rows]
    return jsonify({"success": True, "count": len(history), "data": history[::-1]})


@app.route("/api/blockchain/logs", methods=["GET"])
def get_blockchain_logs():
    return jsonify(
        {
            "success": True,
            "is_chain_valid": blockchain.is_chain_valid(),
            "count": len(blockchain.chain),
            "data": blockchain.chain,
        }
    )


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"success": True, "message": "Smart Healthcare backend is running"})


init_db()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
