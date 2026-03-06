"""
JWT authentication utilities for Cognida.ai IT Helpdesk.

Password hashing uses bcrypt directly (not via passlib) to avoid the
passlib/bcrypt-4.x incompatibility that raises "password > 72 bytes".
We SHA-256 pre-hash the password so the input to bcrypt is always exactly
44 bytes (base64-encoded 32-byte digest) — well within the 72-byte limit.
"""
import os
import hashlib
import base64
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "cognida-helpdesk-secret-key-2026")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 8


def _prepare(password: str) -> bytes:
    """SHA-256 → base64 so bcrypt always receives ≤ 44 bytes."""
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(_prepare(password), bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prepare(plain), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(data: dict, expires_hours: int = TOKEN_EXPIRE_HOURS) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=expires_hours)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
