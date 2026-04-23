"""Lumina Bank — Main FastAPI application.
All financial operations happen server-side via the ledger module.
"""
import os
import uuid
import logging
import asyncio
import shutil
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, Query
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from db import db, close_db
from auth_utils import (
    hash_password, verify_password, create_access_token, decode_token,
    generate_otp, generate_reference, generate_account_number,
    get_current_user, get_current_admin, log_activity, client_info
)
from models import (
    RegisterRequest, VerifyEmailRequest, LoginRequest, Verify2FARequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest,
    KYCSubmitRequest, TransferRequest, BeneficiaryCreate,
    DepositRequestModel, WithdrawalRequestModel, BillPayRequest,
    CardRequestModel, CardPinRequest, LoanApplicationModel, LoanRepaymentModel,
    InvestmentBuyModel, InvestmentSellModel, ChatMessageRequest,
    SupportTicketCreate, ProfileUpdateRequest, Toggle2FARequest,
    AdminBalanceAdjustmentRequest, AdminReverseTxnRequest,
    AdminKYCActionRequest, AdminLoanActionRequest, AdminFreezeAccountRequest,
)
from ledger import (
    credit_account, debit_account, internal_transfer, reverse_transaction,
    admin_adjustment, get_account, get_user_accounts,
)
from email_service import send_otp_email, send_transaction_email, _brand_wrap
from pdf_service import generate_statement_pdf, generate_receipt_pdf
from chat_service import chat_reply

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', str(ROOT_DIR / 'uploads')))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Lumina Bank API", version="1.0.0")
api = APIRouter(prefix="/api")

# =============================================================================
# STARTUP — create indexes & seed admin
# =============================================================================

@app.on_event("startup")
async def startup_event():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("phone")
    await db.accounts.create_index("account_number", unique=True)
    await db.accounts.create_index("user_id")
    await db.transactions.create_index("user_id")
    await db.transactions.create_index("account_id")
    await db.transactions.create_index("reference")
    await db.transactions.create_index("created_at")
    await db.sessions.create_index("user_id")
    await db.notifications.create_index("user_id")

    # Seed admin
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@lumina.com')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        admin_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": admin_id,
            "email": admin_email,
            "phone": "+10000000000",
            "password_hash": hash_password(admin_password),
            "full_name": "Lumina Administrator",
            "is_admin": True,
            "is_active": True,
            "email_verified": True,
            "kyc_status": "approved",
            "two_factor_enabled": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin user {admin_email}")
    else:
        # Ensure admin flag and active
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"is_admin": True, "is_active": True, "email_verified": True}}
        )


@app.on_event("shutdown")
async def shutdown_event():
    await close_db()


# =============================================================================
# HEALTH
# =============================================================================

@api.get("/")
async def root():
    return {"name": "Lumina Bank API", "version": "1.0.0", "status": "ok"}


@api.get("/health")
async def health():
    return {"status": "healthy", "time": datetime.now(timezone.utc).isoformat()}


# =============================================================================
# AUTH
# =============================================================================

async def _create_default_accounts(user_id: str):
    """Create savings + checking accounts for a new user."""
    now = datetime.now(timezone.utc).isoformat()
    for acc_type in ["checking", "savings"]:
        await db.accounts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": acc_type,
            "account_number": generate_account_number(),
            "balance": 0.0,
            "currency": "USD",
            "is_frozen": False,
            "created_at": now,
            "updated_at": now,
        })


async def _store_otp(user_id: str, purpose: str, otp: str, ttl_minutes: int = 10):
    await db.otps.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "purpose": purpose,
        "otp": otp,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)).isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def _verify_otp(user_id: str, purpose: str, otp: str) -> bool:
    doc = await db.otps.find_one(
        {"user_id": user_id, "purpose": purpose, "otp": otp, "used": False},
        sort=[("created_at", -1)]
    )
    if not doc:
        return False
    try:
        exp = datetime.fromisoformat(doc["expires_at"])
    except Exception:
        return False
    if exp < datetime.now(timezone.utc):
        return False
    await db.otps.update_one({"id": doc["id"]}, {"$set": {"used": True}})
    return True


@api.post("/auth/register")
async def register(data: RegisterRequest, request: Request):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one({
        "id": user_id,
        "email": data.email,
        "phone": data.phone,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name,
        "is_admin": False,
        "is_active": True,
        "email_verified": False,
        "kyc_status": "not_started",
        "two_factor_enabled": True,  # default on for security
        "created_at": now,
    })
    await _create_default_accounts(user_id)
    otp = generate_otp()
    await _store_otp(user_id, "email_verify", otp)
    asyncio.create_task(send_otp_email(data.email, otp, "Email Verification"))
    await log_activity(user_id, "register", request)
    return {"message": "Registered. Please verify your email.", "email": data.email}


@api.post("/auth/verify-email")
async def verify_email(data: VerifyEmailRequest, request: Request):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not await _verify_otp(user["id"], "email_verify", data.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    await db.users.update_one({"id": user["id"]}, {"$set": {"email_verified": True}})
    await log_activity(user["id"], "verify_email", request)
    return {"message": "Email verified. You can now log in."}


@api.post("/auth/resend-otp")
async def resend_otp(data: ForgotPasswordRequest, request: Request):
    user = await db.users.find_one({"email": data.email})
    if not user:
        # Don't reveal
        return {"message": "If the email exists, a code has been sent."}
    purpose = "email_verify" if not user.get("email_verified") else "login_2fa"
    otp = generate_otp()
    await _store_otp(user["id"], purpose, otp)
    asyncio.create_task(send_otp_email(data.email, otp, "Verification"))
    return {"message": "Code sent."}


@api.post("/auth/login")
async def login(data: LoginRequest, request: Request):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled. Contact support.")
    if not user.get("email_verified", False) and not user.get("is_admin", False):
        # Trigger email verification
        otp = generate_otp()
        await _store_otp(user["id"], "email_verify", otp)
        asyncio.create_task(send_otp_email(data.email, otp, "Email Verification"))
        raise HTTPException(status_code=403, detail="Email not verified. A new code has been sent.")

    # Admins and users with 2FA off skip 2FA step
    two_fa = user.get("two_factor_enabled", True) and not user.get("is_admin", False)
    if two_fa:
        challenge_id = str(uuid.uuid4())
        otp = generate_otp()
        await db.login_challenges.insert_one({
            "id": challenge_id,
            "user_id": user["id"],
            "otp": otp,
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        asyncio.create_task(send_otp_email(user["email"], otp, "Login Verification"))
        return {"requires_2fa": True, "challenge_id": challenge_id, "email": user["email"]}

    # Issue token immediately
    return await _issue_session(user, request)


async def _issue_session(user: dict, request: Request) -> dict:
    info = client_info(request)
    session_id = str(uuid.uuid4())
    await db.sessions.insert_one({
        "id": session_id,
        "user_id": user["id"],
        "ip": info["ip"],
        "device": info["device"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_seen": datetime.now(timezone.utc).isoformat(),
        "revoked": False,
    })
    await log_activity(user["id"], "login", request)
    token = create_access_token(user["id"], is_admin=user.get("is_admin", False), session_id=session_id)
    safe_user = {k: v for k, v in user.items() if k not in ("_id", "password_hash")}
    return {"token": token, "user": safe_user, "session_id": session_id}


@api.post("/auth/verify-2fa")
async def verify_2fa(data: Verify2FARequest, request: Request):
    challenge = await db.login_challenges.find_one({"id": data.challenge_id, "used": False})
    if not challenge:
        raise HTTPException(status_code=400, detail="Invalid challenge")
    try:
        exp = datetime.fromisoformat(challenge["expires_at"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid challenge")
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Code expired")
    if challenge["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid code")
    await db.login_challenges.update_one({"id": data.challenge_id}, {"$set": {"used": True}})
    user = await db.users.find_one({"id": challenge["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return await _issue_session(user, request)


@api.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await db.users.find_one({"email": data.email})
    if user:
        otp = generate_otp()
        await _store_otp(user["id"], "password_reset", otp)
        asyncio.create_task(send_otp_email(data.email, otp, "Password Reset"))
    return {"message": "If the email exists, a reset code has been sent."}


@api.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest, request: Request):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid request")
    if not await _verify_otp(user["id"], "password_reset", data.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(data.new_password)}})
    # Revoke all sessions
    await db.sessions.update_many({"user_id": user["id"]}, {"$set": {"revoked": True}})
    await log_activity(user["id"], "password_reset", request)
    return {"message": "Password updated. Please log in."}


@api.post("/auth/logout")
async def logout(request: Request, user: dict = Depends(get_current_user)):
    sid = user.get("_session_id")
    if sid:
        await db.sessions.update_one({"id": sid}, {"$set": {"revoked": True}})
    await log_activity(user["id"], "logout", request)
    return {"message": "Logged out"}


@api.post("/auth/logout-all")
async def logout_all(request: Request, user: dict = Depends(get_current_user)):
    await db.sessions.update_many({"user_id": user["id"]}, {"$set": {"revoked": True}})
    await log_activity(user["id"], "logout_all", request)
    return {"message": "All sessions revoked"}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    user.pop("_session_id", None)
    return {"user": user}


# =============================================================================
# PROFILE & SETTINGS
# =============================================================================

@api.patch("/profile")
async def update_profile(data: ProfileUpdateRequest, request: Request, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
        await log_activity(user["id"], "profile_update", request, updates)
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"user": fresh}


@api.post("/profile/change-password")
async def change_password(data: ChangePasswordRequest, request: Request, user: dict = Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]})
    if not verify_password(data.current_password, full.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(data.new_password)}})
    await log_activity(user["id"], "change_password", request)
    return {"message": "Password changed"}


@api.post("/profile/2fa")
async def toggle_2fa(data: Toggle2FARequest, request: Request, user: dict = Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]})
    if not verify_password(data.current_password, full.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    await db.users.update_one({"id": user["id"]}, {"$set": {"two_factor_enabled": data.enabled}})
    await log_activity(user["id"], f"2fa_{'on' if data.enabled else 'off'}", request)
    return {"message": "Updated", "two_factor_enabled": data.enabled}


@api.get("/profile/sessions")
async def list_sessions(user: dict = Depends(get_current_user)):
    items = await db.sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"sessions": items, "current": user.get("_session_id")}


@api.get("/profile/activity")
async def activity_logs(user: dict = Depends(get_current_user)):
    items = await db.activity_logs.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"activity": items}


# =============================================================================
# KYC
# =============================================================================

@api.post("/kyc/submit")
async def kyc_submit(
    request: Request,
    dob: str = Form(...),
    address: str = Form(...),
    next_of_kin_name: str = Form(...),
    next_of_kin_phone: str = Form(...),
    account_type: str = Form("both"),
    id_document: UploadFile = File(...),
    selfie: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    # Save files
    kyc_dir = UPLOAD_DIR / "kyc" / user["id"]
    kyc_dir.mkdir(parents=True, exist_ok=True)

    id_path = kyc_dir / f"id_{secrets.token_hex(4)}_{id_document.filename}"
    selfie_path = kyc_dir / f"selfie_{secrets.token_hex(4)}_{selfie.filename}"
    with open(id_path, 'wb') as f:
        shutil.copyfileobj(id_document.file, f)
    with open(selfie_path, 'wb') as f:
        shutil.copyfileobj(selfie.file, f)

    await db.kyc_documents.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "id_document_path": str(id_path),
        "selfie_path": str(selfie_path),
        "dob": dob,
        "address": address,
        "next_of_kin_name": next_of_kin_name,
        "next_of_kin_phone": next_of_kin_phone,
        "account_type_preference": account_type,
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.users.update_one({"id": user["id"]}, {"$set": {
        "kyc_status": "pending",
        "dob": dob,
        "address": address,
        "next_of_kin_name": next_of_kin_name,
        "next_of_kin_phone": next_of_kin_phone,
    }})
    await log_activity(user["id"], "kyc_submit", request)
    return {"message": "KYC submitted. Pending review.", "status": "pending"}


@api.get("/kyc/status")
async def kyc_status(user: dict = Depends(get_current_user)):
    doc = await db.kyc_documents.find_one({"user_id": user["id"]}, {"_id": 0, "id_document_path": 0, "selfie_path": 0}, sort=[("submitted_at", -1)])
    return {"status": user.get("kyc_status", "not_started"), "submission": doc}


# =============================================================================
# ACCOUNTS & TRANSACTIONS
# =============================================================================

@api.get("/accounts")
async def list_accounts(user: dict = Depends(get_current_user)):
    accounts = await get_user_accounts(user["id"])
    total = sum(float(a.get("balance", 0)) for a in accounts)
    return {"accounts": accounts, "total_balance": total}


@api.get("/accounts/{account_id}")
async def get_account_detail(account_id: str, user: dict = Depends(get_current_user)):
    acc = await get_account(account_id)
    if not acc or acc["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"account": acc}


@api.get("/transactions")
async def list_transactions(
    user: dict = Depends(get_current_user),
    account_id: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
):
    q = {"user_id": user["id"]}
    if account_id:
        q["account_id"] = account_id
    items = await db.transactions.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(min(limit, 200)).to_list(limit)
    total = await db.transactions.count_documents(q)
    return {"transactions": items, "total": total}


@api.get("/transactions/{txn_id}")
async def get_transaction(txn_id: str, user: dict = Depends(get_current_user)):
    t = await db.transactions.find_one({"id": txn_id, "user_id": user["id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"transaction": t}


@api.get("/transactions/{txn_id}/receipt")
async def get_receipt(txn_id: str, user: dict = Depends(get_current_user)):
    t = await db.transactions.find_one({"id": txn_id, "user_id": user["id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    acc = await get_account(t["account_id"])
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    pdf = generate_receipt_pdf(t, u, acc)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="receipt-{t["reference"]}.pdf"'})


@api.get("/accounts/{account_id}/statement")
async def account_statement(account_id: str, user: dict = Depends(get_current_user)):
    acc = await get_account(account_id)
    if not acc or acc["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Account not found")
    txns = await db.transactions.find({"account_id": account_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    pdf = generate_statement_pdf(u, acc, txns)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="statement-{acc["account_number"]}.pdf"'})


# =============================================================================
# TRANSFERS
# =============================================================================

@api.post("/transfers")
async def create_transfer(data: TransferRequest, request: Request, user: dict = Depends(get_current_user)):
    if user.get("kyc_status") != "approved":
        raise HTTPException(status_code=403, detail="Complete KYC to transfer funds.")

    # Validate source account
    src = await get_account(data.from_account_id)
    if not src or src["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Source account not found")

    # Find recipient account
    recipient_user = None
    recipient_account = None
    if data.recipient_type == "email":
        recipient_user = await db.users.find_one({"email": data.recipient.lower()})
    elif data.recipient_type == "phone":
        recipient_user = await db.users.find_one({"phone": data.recipient})
    elif data.recipient_type == "account":
        recipient_account = await db.accounts.find_one({"account_number": data.recipient})
        if recipient_account:
            recipient_user = await db.users.find_one({"id": recipient_account["user_id"]})

    if not recipient_user:
        raise HTTPException(status_code=404, detail="Recipient not found")
    if recipient_user["id"] == user["id"] and not recipient_account:
        # Allow internal transfer between own accounts if account number used
        raise HTTPException(status_code=400, detail="Cannot transfer to your own account via this method. Use account number.")

    # Pick recipient account (prefer checking)
    if not recipient_account:
        accs = await get_user_accounts(recipient_user["id"])
        recipient_account = next((a for a in accs if a["type"] == "checking"), accs[0] if accs else None)
    if not recipient_account:
        raise HTTPException(status_code=404, detail="Recipient has no account")
    if recipient_account["is_frozen"]:
        raise HTTPException(status_code=403, detail="Recipient account is frozen")

    # Transfer limit check (daily)
    today = datetime.now(timezone.utc).date().isoformat()
    daily_sum = 0.0
    async for t in db.transactions.find({
        "user_id": user["id"], "type": "transfer", "direction": "debit",
        "created_at": {"$gte": today}
    }):
        daily_sum += float(t.get("amount", 0))
    DAILY_LIMIT = 50000.0
    if daily_sum + data.amount > DAILY_LIMIT:
        raise HTTPException(status_code=400, detail=f"Daily transfer limit ${DAILY_LIMIT:,.0f} exceeded")

    desc = data.description or f"Transfer to {recipient_user.get('full_name')}"
    result = await internal_transfer(
        from_account_id=data.from_account_id,
        to_account_id=recipient_account["id"],
        amount=data.amount,
        description=desc,
        metadata={"initiated_by": user["id"]}
    )

    # Update debit txn counterparty with recipient name
    await db.transactions.update_one(
        {"id": result["debit"]["id"]},
        {"$set": {"counterparty": f"{recipient_user.get('full_name')} ({recipient_account['account_number']})"}}
    )
    await db.transactions.update_one(
        {"id": result["credit"]["id"]},
        {"$set": {"counterparty": f"{user.get('full_name')} ({src['account_number']})"}}
    )

    # Save beneficiary
    if data.save_beneficiary and data.beneficiary_name:
        await db.beneficiaries.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "name": data.beneficiary_name,
            "identifier": data.recipient,
            "identifier_type": data.recipient_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    await log_activity(user["id"], "transfer", request, {"amount": data.amount, "reference": result["reference"]})
    asyncio.create_task(send_transaction_email(
        user["email"], "Transfer Sent",
        f"You sent <b>${data.amount:,.2f}</b> to {recipient_user.get('full_name')}.<br/>Reference: {result['reference']}"
    ))
    asyncio.create_task(send_transaction_email(
        recipient_user["email"], "Transfer Received",
        f"You received <b>${data.amount:,.2f}</b> from {user.get('full_name')}.<br/>Reference: {result['reference']}"
    ))

    return {"reference": result["reference"], "transaction_id": result["debit"]["id"], "status": "completed"}


@api.get("/beneficiaries")
async def list_beneficiaries(user: dict = Depends(get_current_user)):
    items = await db.beneficiaries.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"beneficiaries": items}


@api.post("/beneficiaries")
async def create_beneficiary(data: BeneficiaryCreate, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": data.name,
        "identifier": data.identifier,
        "identifier_type": data.identifier_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.beneficiaries.insert_one(doc)
    doc.pop("_id", None)
    return {"beneficiary": doc}


@api.delete("/beneficiaries/{bid}")
async def delete_beneficiary(bid: str, user: dict = Depends(get_current_user)):
    res = await db.beneficiaries.delete_one({"id": bid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}


# =============================================================================
# DEPOSITS & WITHDRAWALS
# =============================================================================

@api.post("/deposits")
async def request_deposit(data: DepositRequestModel, request: Request, user: dict = Depends(get_current_user)):
    acc = await get_account(data.account_id)
    if not acc or acc["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Account not found")

    # Create a pending transaction
    txn = await credit_account(
        data.account_id, data.amount,
        f"Deposit via {data.method}",
        txn_type="deposit",
        metadata={"method": data.method, "note": data.note},
        status="pending",
    )
    await db.deposit_requests.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "account_id": data.account_id,
        "amount": data.amount,
        "method": data.method,
        "note": data.note,
        "status": "pending",
        "transaction_id": txn["id"],
        "reference": txn["reference"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await log_activity(user["id"], "deposit_request", request, {"amount": data.amount})
    return {"message": "Deposit requested. Pending approval.", "transaction": txn}


@api.post("/withdrawals")
async def request_withdrawal(data: WithdrawalRequestModel, request: Request, user: dict = Depends(get_current_user)):
    if user.get("kyc_status") != "approved":
        raise HTTPException(status_code=403, detail="Complete KYC to withdraw funds.")

    acc = await get_account(data.account_id)
    if not acc or acc["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Account not found")
    if acc["is_frozen"]:
        raise HTTPException(status_code=403, detail="Account is frozen")
    if float(acc["balance"]) < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")

    # Place as pending (funds held but not yet debited — for simplicity, debit immediately but mark pending)
    # Better: debit on approval. We'll debit immediately and mark pending to hold the amount.
    txn = await debit_account(
        data.account_id, data.amount,
        f"Withdrawal via {data.method}",
        txn_type="withdrawal",
        metadata={"method": data.method, "destination": data.destination},
        status="completed",  # funds taken out; on reject we reverse
    )
    await db.withdrawal_requests.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "account_id": data.account_id,
        "amount": data.amount,
        "method": data.method,
        "destination": data.destination,
        "status": "pending",
        "transaction_id": txn["id"],
        "reference": txn["reference"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await log_activity(user["id"], "withdrawal_request", request, {"amount": data.amount})
    return {"message": "Withdrawal requested. Pending approval.", "transaction": txn}


@api.get("/deposits")
async def my_deposits(user: dict = Depends(get_current_user)):
    items = await db.deposit_requests.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"deposits": items}


@api.get("/withdrawals")
async def my_withdrawals(user: dict = Depends(get_current_user)):
    items = await db.withdrawal_requests.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"withdrawals": items}


# =============================================================================
# BILL PAYMENTS
# =============================================================================

@api.get("/bills/billers")
async def list_billers():
    return {"billers": {
        "utilities": ["City Electric", "Metro Water", "Gas Co."],
        "mobile": ["Nova Mobile", "Vero Telecom", "Sky Wireless"],
        "internet": ["FiberNet", "BlueWave ISP", "Meridian Broadband"],
        "streaming": ["StreamPlus", "Cineflix", "TuneWave Music"],
    }}


@api.post("/bills/pay")
async def pay_bill(data: BillPayRequest, request: Request, user: dict = Depends(get_current_user)):
    if user.get("kyc_status") != "approved":
        raise HTTPException(status_code=403, detail="Complete KYC to pay bills.")
    acc = await get_account(data.account_id)
    if not acc or acc["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Account not found")

    desc = f"Bill: {data.biller_name} ({data.biller_category}) - {data.customer_ref}"
    txn = await debit_account(data.account_id, data.amount, desc, txn_type="bill_payment",
                              counterparty=data.biller_name,
                              metadata={"category": data.biller_category, "customer_ref": data.customer_ref})
    await db.bill_payments.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "biller_category": data.biller_category,
        "biller_name": data.biller_name,
        "customer_ref": data.customer_ref,
        "amount": data.amount,
        "reference": txn["reference"],
        "transaction_id": txn["id"],
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await log_activity(user["id"], "bill_payment", request, {"amount": data.amount, "biller": data.biller_name})
    return {"transaction": txn, "reference": txn["reference"]}


@api.get("/bills/history")
async def bill_history(user: dict = Depends(get_current_user)):
    items = await db.bill_payments.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"payments": items}


# =============================================================================
# CARDS
# =============================================================================

def _mask_card(num: str) -> str:
    return f"**** **** **** {num[-4:]}"


@api.get("/cards")
async def list_cards(user: dict = Depends(get_current_user)):
    cards = await db.cards.find({"user_id": user["id"]}, {"_id": 0, "pin_hash": 0, "cvv": 0}).sort("created_at", -1).to_list(50)
    return {"cards": cards}


@api.get("/cards/{card_id}/reveal")
async def reveal_card(card_id: str, user: dict = Depends(get_current_user)):
    card = await db.cards.find_one({"id": card_id, "user_id": user["id"]}, {"_id": 0, "pin_hash": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    # Return full card details (virtual card). In production this would require additional auth.
    return {"card": card}


@api.post("/cards/request")
async def request_card(data: CardRequestModel, request: Request, user: dict = Depends(get_current_user)):
    acc = await get_account(data.account_id)
    if not acc or acc["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.get("kyc_status") != "approved":
        raise HTTPException(status_code=403, detail="Complete KYC to request a card.")

    existing = await db.cards.count_documents({"user_id": user["id"], "account_id": data.account_id, "status": {"$in": ["active", "pending"]}})
    if existing >= 2:
        raise HTTPException(status_code=400, detail="Card limit reached for this account")

    number = "4" + ''.join([str(secrets.randbelow(10)) for _ in range(15)])
    cvv = ''.join([str(secrets.randbelow(10)) for _ in range(3)])
    now = datetime.now(timezone.utc)
    expiry = now.replace(year=now.year + 4)
    card = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "account_id": data.account_id,
        "card_type": data.card_type,
        "number": number,
        "number_masked": _mask_card(number),
        "cvv": cvv,
        "expiry": expiry.strftime("%m/%y"),
        "holder_name": user.get("full_name", ""),
        "is_frozen": False,
        "pin_hash": None,
        "status": "active" if data.card_type == "virtual" else "pending",
        "network": "LuminaPay",
        "created_at": now.isoformat(),
    }
    await db.cards.insert_one(card)
    card.pop("_id", None)
    await log_activity(user["id"], "card_request", request, {"card_id": card["id"], "type": data.card_type})
    safe = {k: v for k, v in card.items() if k not in ("pin_hash",)}
    return {"card": safe}


@api.post("/cards/{card_id}/freeze")
async def freeze_card(card_id: str, request: Request, user: dict = Depends(get_current_user)):
    card = await db.cards.find_one({"id": card_id, "user_id": user["id"]})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    new_state = not card.get("is_frozen", False)
    await db.cards.update_one({"id": card_id}, {"$set": {"is_frozen": new_state}})
    await log_activity(user["id"], "card_freeze" if new_state else "card_unfreeze", request, {"card_id": card_id})
    return {"is_frozen": new_state}


@api.post("/cards/{card_id}/pin")
async def set_pin(card_id: str, data: CardPinRequest, request: Request, user: dict = Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]})
    if not verify_password(data.current_password, full.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    card = await db.cards.find_one({"id": card_id, "user_id": user["id"]})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    await db.cards.update_one({"id": card_id}, {"$set": {"pin_hash": hash_password(data.pin)}})
    await log_activity(user["id"], "card_pin_set", request, {"card_id": card_id})
    return {"message": "PIN set"}


@api.post("/cards/{card_id}/replace")
async def replace_card(card_id: str, request: Request, user: dict = Depends(get_current_user)):
    card = await db.cards.find_one({"id": card_id, "user_id": user["id"]})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    await db.cards.update_one({"id": card_id}, {"$set": {"status": "replaced", "is_frozen": True}})
    # Issue a new one with same type
    number = "4" + ''.join([str(secrets.randbelow(10)) for _ in range(15)])
    cvv = ''.join([str(secrets.randbelow(10)) for _ in range(3)])
    now = datetime.now(timezone.utc)
    expiry = now.replace(year=now.year + 4)
    new_card = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "account_id": card["account_id"],
        "card_type": card["card_type"],
        "number": number,
        "number_masked": _mask_card(number),
        "cvv": cvv,
        "expiry": expiry.strftime("%m/%y"),
        "holder_name": user.get("full_name", ""),
        "is_frozen": False,
        "pin_hash": None,
        "status": "active" if card["card_type"] == "virtual" else "pending",
        "network": "LuminaPay",
        "created_at": now.isoformat(),
        "replaces": card_id,
    }
    await db.cards.insert_one(new_card)
    new_card.pop("_id", None)
    await log_activity(user["id"], "card_replace", request, {"old": card_id, "new": new_card["id"]})
    safe = {k: v for k, v in new_card.items() if k not in ("pin_hash",)}
    return {"card": safe}


# =============================================================================
# LOANS
# =============================================================================

@api.post("/loans/apply")
async def apply_loan(data: LoanApplicationModel, request: Request, user: dict = Depends(get_current_user)):
    if user.get("kyc_status") != "approved":
        raise HTTPException(status_code=403, detail="Complete KYC to apply for a loan.")
    acc = await get_account(data.account_id)
    if not acc or acc["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Account not found")

    loan = {
        "id": str(uuid.uuid4()),
        "reference": generate_reference(),
        "user_id": user["id"],
        "account_id": data.account_id,
        "amount": data.amount,
        "purpose": data.purpose,
        "duration_months": data.duration_months,
        "interest_rate": None,
        "status": "pending",  # pending | approved | rejected | active | closed
        "outstanding": 0.0,
        "total_repayable": 0.0,
        "monthly_payment": 0.0,
        "repayments": [],
        "applied_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.loans.insert_one(loan)
    await log_activity(user["id"], "loan_apply", request, {"amount": data.amount})
    loan.pop("_id", None)
    return {"loan": loan}


@api.get("/loans")
async def list_loans(user: dict = Depends(get_current_user)):
    items = await db.loans.find({"user_id": user["id"]}, {"_id": 0}).sort("applied_at", -1).to_list(100)
    return {"loans": items}


@api.post("/loans/repay")
async def repay_loan(data: LoanRepaymentModel, request: Request, user: dict = Depends(get_current_user)):
    loan = await db.loans.find_one({"id": data.loan_id, "user_id": user["id"]}, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan["status"] not in ("active",):
        raise HTTPException(status_code=400, detail="Loan is not active")
    if data.amount <= 0 or data.amount > loan["outstanding"]:
        raise HTTPException(status_code=400, detail=f"Invalid amount. Outstanding: ${loan['outstanding']:,.2f}")

    txn = await debit_account(data.account_id, data.amount,
                              f"Loan repayment: {loan['reference']}",
                              txn_type="loan_repayment",
                              metadata={"loan_id": loan["id"]})
    new_outstanding = round(float(loan["outstanding"]) - data.amount, 2)
    repayment = {
        "id": str(uuid.uuid4()),
        "amount": data.amount,
        "reference": txn["reference"],
        "paid_at": datetime.now(timezone.utc).isoformat(),
    }
    status = "closed" if new_outstanding <= 0.0 else "active"
    await db.loans.update_one({"id": loan["id"]}, {
        "$set": {"outstanding": max(new_outstanding, 0.0), "status": status},
        "$push": {"repayments": repayment}
    })
    await log_activity(user["id"], "loan_repayment", request, {"loan_id": loan["id"], "amount": data.amount})
    return {"outstanding": max(new_outstanding, 0.0), "status": status, "transaction": txn}


# =============================================================================
# INVESTMENTS (synthetic market data)
# =============================================================================

ASSETS = [
    {"symbol": "LUMN", "name": "Lumina Growth Fund", "price": 125.40, "category": "fund"},
    {"symbol": "AURM", "name": "Aurum Gold ETF", "price": 205.80, "category": "etf"},
    {"symbol": "TECH", "name": "Global Tech Index", "price": 342.15, "category": "fund"},
    {"symbol": "BOND", "name": "Sovereign Bond Fund", "price": 98.20, "category": "fund"},
    {"symbol": "REAL", "name": "Real Estate Trust", "price": 78.55, "category": "reit"},
    {"symbol": "ESGX", "name": "ESG Impact Fund", "price": 154.90, "category": "fund"},
    {"symbol": "ENRG", "name": "Clean Energy ETF", "price": 89.65, "category": "etf"},
    {"symbol": "HLTH", "name": "Global Healthcare", "price": 212.30, "category": "fund"},
]


def _price(symbol: str) -> float:
    for a in ASSETS:
        if a["symbol"] == symbol:
            # Small deterministic variation by hour
            seed = (datetime.now(timezone.utc).hour + sum(ord(c) for c in symbol)) % 10
            return round(a["price"] * (1 + (seed - 5) / 500.0), 2)
    raise HTTPException(status_code=404, detail="Asset not found")


@api.get("/investments/assets")
async def list_assets():
    data = []
    for a in ASSETS:
        p = _price(a["symbol"])
        change = round((p - a["price"]) / a["price"] * 100, 2)
        data.append({**a, "current_price": p, "change_pct": change})
    return {"assets": data}


@api.get("/investments/portfolio")
async def portfolio(user: dict = Depends(get_current_user)):
    holdings = await db.investments.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    enriched = []
    total_value = 0.0
    total_cost = 0.0
    for h in holdings:
        current = _price(h["symbol"])
        value = current * float(h["quantity"])
        cost = float(h["avg_price"]) * float(h["quantity"])
        total_value += value
        total_cost += cost
        enriched.append({
            **h,
            "current_price": current,
            "value": round(value, 2),
            "pnl": round(value - cost, 2),
            "pnl_pct": round((value - cost) / cost * 100 if cost else 0, 2),
        })
    return {
        "holdings": enriched,
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_pnl": round(total_value - total_cost, 2),
    }


@api.post("/investments/buy")
async def buy(data: InvestmentBuyModel, request: Request, user: dict = Depends(get_current_user)):
    if user.get("kyc_status") != "approved":
        raise HTTPException(status_code=403, detail="Complete KYC to invest.")
    price = _price(data.symbol)
    cost = round(price * data.quantity, 2)
    txn = await debit_account(data.account_id, cost,
                              f"Buy {data.quantity} {data.symbol} @ ${price}",
                              txn_type="investment_buy",
                              metadata={"symbol": data.symbol, "qty": data.quantity, "price": price})
    # Update holding
    existing = await db.investments.find_one({"user_id": user["id"], "symbol": data.symbol})
    if existing:
        new_qty = float(existing["quantity"]) + data.quantity
        new_avg = round((float(existing["avg_price"]) * float(existing["quantity"]) + cost) / new_qty, 4)
        await db.investments.update_one({"id": existing["id"]}, {"$set": {"quantity": new_qty, "avg_price": new_avg}})
    else:
        asset = next((a for a in ASSETS if a["symbol"] == data.symbol), None)
        await db.investments.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "symbol": data.symbol,
            "name": asset["name"] if asset else data.symbol,
            "quantity": data.quantity,
            "avg_price": price,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    await log_activity(user["id"], "investment_buy", request, {"symbol": data.symbol, "cost": cost})
    return {"transaction": txn, "symbol": data.symbol, "quantity": data.quantity, "price": price}


@api.post("/investments/sell")
async def sell(data: InvestmentSellModel, request: Request, user: dict = Depends(get_current_user)):
    existing = await db.investments.find_one({"user_id": user["id"], "symbol": data.symbol})
    if not existing or float(existing["quantity"]) < data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient holdings")
    price = _price(data.symbol)
    proceeds = round(price * data.quantity, 2)
    txn = await credit_account(data.account_id, proceeds,
                               f"Sell {data.quantity} {data.symbol} @ ${price}",
                               txn_type="investment_sell",
                               metadata={"symbol": data.symbol, "qty": data.quantity, "price": price})
    new_qty = float(existing["quantity"]) - data.quantity
    if new_qty <= 0.0001:
        await db.investments.delete_one({"id": existing["id"]})
    else:
        await db.investments.update_one({"id": existing["id"]}, {"$set": {"quantity": new_qty}})
    await log_activity(user["id"], "investment_sell", request, {"symbol": data.symbol, "proceeds": proceeds})
    return {"transaction": txn, "proceeds": proceeds}


# =============================================================================
# NOTIFICATIONS
# =============================================================================

@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user), limit: int = 50):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"notifications": items, "unread": unread}


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


# =============================================================================
# CHAT
# =============================================================================

@api.post("/chat/message")
async def chat_message(data: ChatMessageRequest, user: dict = Depends(get_current_user)):
    reply = await chat_reply(user["id"], data.session_id, data.message)
    return {"reply": reply}


@api.get("/chat/history")
async def chat_history(session_id: str, user: dict = Depends(get_current_user)):
    items = await db.chat_messages.find(
        {"user_id": user["id"], "session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return {"messages": items}


# =============================================================================
# SUPPORT TICKETS
# =============================================================================

@api.post("/support/tickets")
async def create_ticket(data: SupportTicketCreate, user: dict = Depends(get_current_user)):
    ticket = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "user_name": user.get("full_name"),
        "subject": data.subject,
        "message": data.message,
        "category": data.category,
        "status": "open",
        "messages": [{"role": "user", "message": data.message, "created_at": datetime.now(timezone.utc).isoformat()}],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.support_tickets.insert_one(ticket)
    ticket.pop("_id", None)
    return {"ticket": ticket}


@api.get("/support/tickets")
async def list_my_tickets(user: dict = Depends(get_current_user)):
    items = await db.support_tickets.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"tickets": items}


# =============================================================================
# ADMIN
# =============================================================================

@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(get_current_admin)):
    users = await db.users.count_documents({"is_admin": {"$ne": True}})
    accounts = await db.accounts.count_documents({})
    txns = await db.transactions.count_documents({})
    total_balance = 0.0
    async for a in db.accounts.find({}, {"balance": 1}):
        total_balance += float(a.get("balance", 0))
    total_deposits = 0.0
    async for t in db.transactions.find({"type": "deposit", "status": "completed"}, {"amount": 1}):
        total_deposits += float(t.get("amount", 0))
    total_loans = 0.0
    async for l in db.loans.find({"status": {"$in": ["active", "approved"]}}, {"amount": 1}):
        total_loans += float(l.get("amount", 0))
    pending_kyc = await db.users.count_documents({"kyc_status": "pending"})
    pending_loans = await db.loans.count_documents({"status": "pending"})
    pending_deposits = await db.deposit_requests.count_documents({"status": "pending"})
    pending_withdrawals = await db.withdrawal_requests.count_documents({"status": "pending"})
    return {
        "users": users,
        "accounts": accounts,
        "transactions": txns,
        "total_balance": round(total_balance, 2),
        "total_deposits": round(total_deposits, 2),
        "total_loans": round(total_loans, 2),
        "pending_kyc": pending_kyc,
        "pending_loans": pending_loans,
        "pending_deposits": pending_deposits,
        "pending_withdrawals": pending_withdrawals,
    }


@api.get("/admin/users")
async def admin_list_users(_: dict = Depends(get_current_admin), q: Optional[str] = None, limit: int = 100):
    query = {"is_admin": {"$ne": True}}
    if q:
        query["$or"] = [
            {"email": {"$regex": q, "$options": "i"}},
            {"full_name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    # Attach balance
    for u in users:
        accs = await get_user_accounts(u["id"])
        u["accounts_count"] = len(accs)
        u["total_balance"] = round(sum(float(a.get("balance", 0)) for a in accs), 2)
    return {"users": users}


@api.get("/admin/users/{user_id}")
async def admin_user_detail(user_id: str, _: dict = Depends(get_current_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    accs = await get_user_accounts(user_id)
    txns = await db.transactions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    kyc = await db.kyc_documents.find_one({"user_id": user_id}, {"_id": 0, "id_document_path": 0, "selfie_path": 0}, sort=[("submitted_at", -1)])
    loans = await db.loans.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    cards = await db.cards.find({"user_id": user_id}, {"_id": 0, "pin_hash": 0}).to_list(50)
    return {"user": u, "accounts": accs, "transactions": txns, "kyc": kyc, "loans": loans, "cards": cards}


@api.get("/admin/kyc/pending")
async def admin_kyc_pending(_: dict = Depends(get_current_admin)):
    users = await db.users.find({"kyc_status": "pending"}, {"_id": 0, "password_hash": 0}).to_list(100)
    return {"users": users}


@api.post("/admin/kyc/action")
async def admin_kyc_action(data: AdminKYCActionRequest, request: Request, admin: dict = Depends(get_current_admin)):
    user = await db.users.find_one({"id": data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_status = "approved" if data.action == "approve" else "rejected"
    await db.users.update_one({"id": data.user_id}, {"$set": {"kyc_status": new_status}})
    await db.kyc_documents.update_many(
        {"user_id": data.user_id, "status": "pending"},
        {"$set": {"status": new_status, "reviewed_by": admin["id"], "reviewed_at": datetime.now(timezone.utc).isoformat(), "note": data.note}}
    )
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "action": f"kyc_{data.action}",
        "target_user_id": data.user_id,
        "note": data.note,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **client_info(request),
    })
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": data.user_id,
        "title": f"KYC {new_status.title()}",
        "message": f"Your KYC has been {new_status}." + (f" Note: {data.note}" if data.note else ""),
        "category": "kyc",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    asyncio.create_task(send_transaction_email(user["email"], f"KYC {new_status.title()}",
                                               f"Your KYC verification has been <b>{new_status}</b>." + (f"<br/>Note: {data.note}" if data.note else "")))
    return {"message": f"KYC {new_status}"}


@api.get("/admin/loans/pending")
async def admin_loans_pending(_: dict = Depends(get_current_admin)):
    loans = await db.loans.find({"status": "pending"}, {"_id": 0}).sort("applied_at", -1).to_list(100)
    for l in loans:
        u = await db.users.find_one({"id": l["user_id"]}, {"_id": 0, "full_name": 1, "email": 1})
        l["user"] = u
    return {"loans": loans}


@api.post("/admin/loans/action")
async def admin_loan_action(data: AdminLoanActionRequest, request: Request, admin: dict = Depends(get_current_admin)):
    loan = await db.loans.find_one({"id": data.loan_id}, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan["status"] != "pending":
        raise HTTPException(status_code=400, detail="Loan is not pending")

    if data.action == "approve":
        rate = data.interest_rate or 12.0
        months = loan["duration_months"]
        total = round(loan["amount"] * (1 + rate / 100 * months / 12), 2)
        monthly = round(total / months, 2)
        # Disburse to account
        await credit_account(loan["account_id"], loan["amount"],
                             f"Loan disbursement: {loan['reference']}",
                             txn_type="loan_disbursement",
                             metadata={"loan_id": loan["id"]})
        await db.loans.update_one({"id": loan["id"]}, {"$set": {
            "status": "active",
            "interest_rate": rate,
            "total_repayable": total,
            "monthly_payment": monthly,
            "outstanding": total,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": admin["id"],
        }})
        title = "Loan Approved"
        msg = f"Your loan of ${loan['amount']:,.2f} has been approved. Total repayable: ${total:,.2f}."
    else:
        await db.loans.update_one({"id": loan["id"]}, {"$set": {
            "status": "rejected",
            "rejection_note": data.note,
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejected_by": admin["id"],
        }})
        title = "Loan Rejected"
        msg = f"Your loan application was rejected." + (f" Reason: {data.note}" if data.note else "")

    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "action": f"loan_{data.action}",
        "target_user_id": loan["user_id"],
        "loan_id": loan["id"],
        "note": data.note,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **client_info(request),
    })
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": loan["user_id"],
        "title": title,
        "message": msg,
        "category": "loan",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    u = await db.users.find_one({"id": loan["user_id"]})
    if u:
        asyncio.create_task(send_transaction_email(u["email"], title, msg))
    return {"message": f"Loan {data.action}d"}


@api.get("/admin/deposits/pending")
async def admin_deposits_pending(_: dict = Depends(get_current_admin)):
    items = await db.deposit_requests.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for d in items:
        u = await db.users.find_one({"id": d["user_id"]}, {"_id": 0, "full_name": 1, "email": 1})
        d["user"] = u
    return {"deposits": items}


@api.post("/admin/deposits/{req_id}/approve")
async def admin_approve_deposit(req_id: str, request: Request, admin: dict = Depends(get_current_admin)):
    req = await db.deposit_requests.find_one({"id": req_id}, {"_id": 0})
    if not req or req["status"] != "pending":
        raise HTTPException(status_code=404, detail="Pending deposit not found")
    # Mark original txn completed and credit the account
    txn = await db.transactions.find_one({"id": req["transaction_id"]}, {"_id": 0})
    if txn and txn["status"] == "pending":
        # Update balance and txn
        await db.accounts.update_one({"id": txn["account_id"]}, {"$inc": {"balance": txn["amount"]}})
        new_bal = (await get_account(txn["account_id"]))["balance"]
        await db.transactions.update_one({"id": txn["id"]}, {"$set": {"status": "completed", "new_balance": new_bal}})
    await db.deposit_requests.update_one({"id": req_id}, {"$set": {"status": "approved", "approved_by": admin["id"], "approved_at": datetime.now(timezone.utc).isoformat()}})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": req["user_id"], "title": "Deposit Approved",
        "message": f"Your deposit of ${req['amount']:,.2f} has been credited.",
        "category": "deposit", "read": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()), "admin_id": admin["id"], "action": "deposit_approve",
        "target_user_id": req["user_id"], "reference": req["reference"],
        "created_at": datetime.now(timezone.utc).isoformat(), **client_info(request),
    })
    return {"message": "Deposit approved"}


@api.post("/admin/deposits/{req_id}/reject")
async def admin_reject_deposit(req_id: str, request: Request, admin: dict = Depends(get_current_admin)):
    req = await db.deposit_requests.find_one({"id": req_id}, {"_id": 0})
    if not req or req["status"] != "pending":
        raise HTTPException(status_code=404, detail="Pending deposit not found")
    await db.transactions.update_one({"id": req["transaction_id"]}, {"$set": {"status": "failed"}})
    await db.deposit_requests.update_one({"id": req_id}, {"$set": {"status": "rejected", "rejected_by": admin["id"], "rejected_at": datetime.now(timezone.utc).isoformat()}})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": req["user_id"], "title": "Deposit Rejected",
        "message": f"Your deposit of ${req['amount']:,.2f} was not approved.",
        "category": "deposit", "read": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()), "admin_id": admin["id"], "action": "deposit_reject",
        "target_user_id": req["user_id"], "reference": req["reference"],
        "created_at": datetime.now(timezone.utc).isoformat(), **client_info(request),
    })
    return {"message": "Deposit rejected"}


@api.get("/admin/withdrawals/pending")
async def admin_withdrawals_pending(_: dict = Depends(get_current_admin)):
    items = await db.withdrawal_requests.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for d in items:
        u = await db.users.find_one({"id": d["user_id"]}, {"_id": 0, "full_name": 1, "email": 1})
        d["user"] = u
    return {"withdrawals": items}


@api.post("/admin/withdrawals/{req_id}/approve")
async def admin_approve_withdrawal(req_id: str, request: Request, admin: dict = Depends(get_current_admin)):
    req = await db.withdrawal_requests.find_one({"id": req_id}, {"_id": 0})
    if not req or req["status"] != "pending":
        raise HTTPException(status_code=404, detail="Pending withdrawal not found")
    # Funds were already debited at request time. Just mark approved.
    await db.withdrawal_requests.update_one({"id": req_id}, {"$set": {"status": "approved", "approved_by": admin["id"], "approved_at": datetime.now(timezone.utc).isoformat()}})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": req["user_id"], "title": "Withdrawal Approved",
        "message": f"Your withdrawal of ${req['amount']:,.2f} has been processed.",
        "category": "withdrawal", "read": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()), "admin_id": admin["id"], "action": "withdrawal_approve",
        "target_user_id": req["user_id"], "reference": req["reference"],
        "created_at": datetime.now(timezone.utc).isoformat(), **client_info(request),
    })
    return {"message": "Withdrawal approved"}


@api.post("/admin/withdrawals/{req_id}/reject")
async def admin_reject_withdrawal(req_id: str, request: Request, admin: dict = Depends(get_current_admin)):
    req = await db.withdrawal_requests.find_one({"id": req_id}, {"_id": 0})
    if not req or req["status"] != "pending":
        raise HTTPException(status_code=404, detail="Pending withdrawal not found")
    # Reverse the debit
    await reverse_transaction(req["transaction_id"], admin["id"], "Withdrawal rejected by admin")
    await db.withdrawal_requests.update_one({"id": req_id}, {"$set": {"status": "rejected", "rejected_by": admin["id"], "rejected_at": datetime.now(timezone.utc).isoformat()}})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": req["user_id"], "title": "Withdrawal Rejected",
        "message": f"Your withdrawal of ${req['amount']:,.2f} was not approved. Funds returned to your account.",
        "category": "withdrawal", "read": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()), "admin_id": admin["id"], "action": "withdrawal_reject",
        "target_user_id": req["user_id"], "reference": req["reference"],
        "created_at": datetime.now(timezone.utc).isoformat(), **client_info(request),
    })
    return {"message": "Withdrawal rejected and reversed"}


@api.post("/admin/balance-adjustment")
async def admin_balance_adjustment(data: AdminBalanceAdjustmentRequest, request: Request, admin: dict = Depends(get_current_admin)):
    # Admin password re-confirmation
    full = await db.users.find_one({"id": admin["id"]})
    if not verify_password(data.admin_password, full.get("password_hash", "")):
        raise HTTPException(status_code=403, detail="Admin password is incorrect")

    txn = await admin_adjustment(
        account_id=data.account_id,
        amount=data.amount,
        adj_type=data.adjustment_type,
        reason=data.reason,
        admin_id=admin["id"],
        admin_info=client_info(request),
    )
    # Notify user
    acc = await get_account(data.account_id)
    if acc:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": acc["user_id"],
            "title": "Admin Adjustment",
            "message": f"Admin adjustment {data.adjustment_type}: ${data.amount:,.2f}. Reason: {data.reason}. Ref {txn['reference']}.",
            "category": "adjustment",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return {"transaction": txn}


@api.post("/admin/transactions/reverse")
async def admin_reverse(data: AdminReverseTxnRequest, request: Request, admin: dict = Depends(get_current_admin)):
    full = await db.users.find_one({"id": admin["id"]})
    if not verify_password(data.admin_password, full.get("password_hash", "")):
        raise HTTPException(status_code=403, detail="Admin password is incorrect")

    res = await reverse_transaction(data.transaction_id, admin["id"], data.reason)
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "action": "transaction_reversal",
        "original_txn_id": data.transaction_id,
        "reversal_ref": res["reference"],
        "reason": data.reason,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **client_info(request),
    })
    # Notify user
    orig = await db.transactions.find_one({"id": data.transaction_id}, {"_id": 0})
    if orig:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": orig["user_id"],
            "title": "Transaction Reversed",
            "message": f"Transaction {orig['reference']} was reversed. Reason: {data.reason}.",
            "category": "reversal",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return res


@api.post("/admin/accounts/freeze")
async def admin_freeze(data: AdminFreezeAccountRequest, request: Request, admin: dict = Depends(get_current_admin)):
    acc = await get_account(data.account_id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.accounts.update_one({"id": data.account_id}, {"$set": {"is_frozen": data.freeze}})
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "action": "account_freeze" if data.freeze else "account_unfreeze",
        "target_user_id": acc["user_id"],
        "target_account_id": data.account_id,
        "reason": data.reason,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **client_info(request),
    })
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": acc["user_id"],
        "title": "Account " + ("Frozen" if data.freeze else "Unfrozen"),
        "message": f"Your {acc['type']} account {acc['account_number']} has been {'frozen' if data.freeze else 'unfrozen'}." + (f" Reason: {data.reason}" if data.reason else ""),
        "category": "account",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"is_frozen": data.freeze}


@api.get("/admin/audit-logs")
async def admin_audit_logs(_: dict = Depends(get_current_admin), limit: int = 200):
    items = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"logs": items}


@api.get("/admin/tickets")
async def admin_tickets(_: dict = Depends(get_current_admin)):
    items = await db.support_tickets.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"tickets": items}


@api.post("/admin/tickets/{tid}/reply")
async def admin_reply_ticket(tid: str, payload: dict, admin: dict = Depends(get_current_admin)):
    message = payload.get("message", "").strip()
    status = payload.get("status")
    if not message:
        raise HTTPException(status_code=400, detail="Message required")
    update = {"$push": {"messages": {
        "role": "admin", "admin_id": admin["id"], "message": message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }}}
    if status in ("open", "resolved", "closed"):
        update["$set"] = {"status": status}
    await db.support_tickets.update_one({"id": tid}, update)
    ticket = await db.support_tickets.find_one({"id": tid}, {"_id": 0})
    if ticket:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": ticket["user_id"],
            "title": "Support Response",
            "message": f"New reply on your ticket: {ticket['subject']}",
            "category": "support",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return {"ticket": ticket}


# Mount routes
app.include_router(api)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
