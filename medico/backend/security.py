import base64
import hashlib
import hmac
import json
import os


DEFAULT_API_KEY = os.getenv("SMART_HEALTH_API_KEY", "demo-secure-api-key")


def verify_api_key(candidate: str) -> bool:
    return hmac.compare_digest(candidate or "", DEFAULT_API_KEY)


def _derive_secret(key: str) -> bytes:
    return hashlib.sha256(key.encode("utf-8")).digest()


def encrypt_payload(payload: dict, api_key: str) -> str:
    plaintext = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    secret = _derive_secret(api_key)
    encrypted = bytes(byte ^ secret[index % len(secret)] for index, byte in enumerate(plaintext))
    return base64.urlsafe_b64encode(encrypted).decode("utf-8")
