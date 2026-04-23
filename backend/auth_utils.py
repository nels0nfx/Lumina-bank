"""Authentication helpers: JWT, password hashing, current user dependency."""
import os
import bcrypt
import jwt
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db import db

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_HOURS = int(os.environ.get('JWT_EXPIRE_HOURS', '24'))

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_access_token(user_id: str, is_admin: bool = False, session_id: Optional[str] = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "is_admin": is_admin,
        "sid": session_id or str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_EXPIRE_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def generate_otp(length: int = 6) -> str:
    return ''.join([str(secrets.randbelow(10)) for _ in range(length)])


def generate_reference() -> str:
    ts = datetime.now(timezone.utc).strftime('%Y%m%d')
    rand = secrets.token_hex(4).upper()
    return f"LMN-{ts}-{rand}"


def generate_account_number() -> str:
    return ''.join([str(secrets.randbelow(10)) for _ in range(10)])


def client_info(request: Request) -> dict:
    return {
        "ip": request.client.host if request.client else "unknown",
        "device": request.headers.get('user-agent', 'unknown')[:200],
    }


async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = decode_token(creds.credentials)
    user_id = payload.get("sub")
    session_id = payload.get("sid")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    # Update session last_seen (best-effort)
    if session_id:
        await db.sessions.update_one(
            {"id": session_id, "revoked": {"$ne": True}},
            {"$set": {"last_seen": datetime.now(timezone.utc).isoformat()}}
        )
    user["_session_id"] = session_id
    return user


async def get_current_admin(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def log_activity(user_id: str, action: str, request: Request, metadata: Optional[dict] = None):
    info = client_info(request)
    await db.activity_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "ip": info["ip"],
        "device": info["device"],
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
