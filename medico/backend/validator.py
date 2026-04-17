from typing import Any, Dict, List, Tuple


def validate_health_payload(payload: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
    errors: List[str] = []
    normalized: Dict[str, Any] = {}

    required_fields = ["patient_id", "device_id", "temperature", "heart_rate"]
    for field in required_fields:
        if field not in payload:
            errors.append(f"Missing required field: {field}")

    if errors:
        return False, errors, normalized

    patient_id = str(payload["patient_id"]).strip()
    device_id = str(payload["device_id"]).strip()

    try:
        temperature = float(payload["temperature"])
    except (TypeError, ValueError):
        errors.append("temperature must be a number")
        temperature = 0.0

    try:
        heart_rate = int(payload["heart_rate"])
    except (TypeError, ValueError):
        errors.append("heart_rate must be an integer")
        heart_rate = 0

    if not patient_id:
        errors.append("patient_id must not be empty")
    if not device_id:
        errors.append("device_id must not be empty")
    if not (25 <= temperature <= 45):
        errors.append("temperature must be between 25C and 45C")
    if not (30 <= heart_rate <= 220):
        errors.append("heart_rate must be between 30 and 220 bpm")

    normalized = {
        "patient_id": patient_id,
        "device_id": device_id,
        "temperature": round(temperature, 2),
        "heart_rate": heart_rate,
    }

    return len(errors) == 0, errors, normalized
