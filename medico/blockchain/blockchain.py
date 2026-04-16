import copy
import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List


class HealthcareBlockchain:
    def __init__(self) -> None:
        self.chain: List[Dict[str, Any]] = [self._create_genesis_block()]

    def _create_genesis_block(self) -> Dict[str, Any]:
        block = {
            "index": 0,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sensor_data": {"message": "Genesis Block"},
            "previous_hash": "0",
        }
        block["hash"] = self.hash_block(block)
        return block

    def hash_block(self, block: Dict[str, Any]) -> str:
        hashable_block = copy.deepcopy(block)
        hashable_block.pop("hash", None)
        block_string = json.dumps(hashable_block, sort_keys=True).encode("utf-8")
        return hashlib.sha256(block_string).hexdigest()

    def create_block(self, sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        previous_block = self.chain[-1]
        block = {
            "index": len(self.chain),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sensor_data": sensor_data,
            "previous_hash": previous_block["hash"],
        }
        block["hash"] = self.hash_block(block)
        self.chain.append(block)
        return block

    def is_chain_valid(self) -> bool:
        for index in range(1, len(self.chain)):
            current_block = self.chain[index]
            previous_block = self.chain[index - 1]

            if current_block["previous_hash"] != previous_block["hash"]:
                return False

            if self.hash_block(current_block) != current_block["hash"]:
                return False

        return True
