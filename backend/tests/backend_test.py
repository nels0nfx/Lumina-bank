"""Lumina Bank — e2e backend test suite.
Follows full user journey: register -> verify -> login (2FA) -> KYC -> admin approve -> transfer -> all features.
"""
import os
import uuid
import io
import time
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lumina-banking.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "lumina_bank")

mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]

RUN_ID = uuid.uuid4().hex[:8]

# Shared state across tests
STATE = {
    "admin_token": None,
    "u1_email": f"alice_{RUN_ID}@example.com",
    "u1_phone": f"+1555{RUN_ID[:7]}",
    "u1_password": "Pass1234!",
    "u1_id": None,
    "u1_token": None,
    "u1_accounts": [],
    "u2_email": f"bob_{RUN_ID}@example.com",
    "u2_phone": f"+1444{RUN_ID[:7]}",
    "u2_password": "Pass1234!",
    "u2_id": None,
    "u2_token": None,
    "u2_accounts": [],
    "txn_id_for_reversal": None,
    "adjustment_txn_id": None,
}


def _get_latest_otp(user_id, purpose):
    """Fetch most recent unused OTP for a given user + purpose."""
    # Allow async email task to store otp
    for _ in range(5):
        doc = db.otps.find_one(
            {"user_id": user_id, "purpose": purpose, "used": False},
            sort=[("created_at", -1)],
        )
        if doc:
            return doc["otp"]
        time.sleep(0.3)
    return None


def _get_latest_challenge(user_id):
    for _ in range(5):
        doc = db.login_challenges.find_one(
            {"user_id": user_id, "used": False}, sort=[("created_at", -1)]
        )
        if doc:
            return doc
        time.sleep(0.3)
    return None


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# =============================================================
# 01 - HEALTH
# =============================================================
def test_01_health(s):
    r = s.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# =============================================================
# 02 - ADMIN LOGIN (no 2FA)
# =============================================================
def test_02_admin_login_no_2fa(s):
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@lumina.com", "password": "admin123"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data, f"Admin login should issue token immediately, got: {data}"
    assert data.get("requires_2fa") is not True
    STATE["admin_token"] = data["token"]


# =============================================================
# 03 - REGISTER USER 1 + 2
# =============================================================
@pytest.mark.parametrize("which", ["u1", "u2"])
def test_03_register(s, which):
    email = STATE[f"{which}_email"]
    phone = STATE[f"{which}_phone"]
    full_name = "Alice T" if which == "u1" else "Bob T"
    r = s.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "phone": phone, "password": STATE[f"{which}_password"], "full_name": full_name},
    )
    assert r.status_code == 200, r.text
    u = db.users.find_one({"email": email})
    assert u, "User not created in DB"
    STATE[f"{which}_id"] = u["id"]
    accs = list(db.accounts.find({"user_id": u["id"]}))
    assert len(accs) == 2, f"Expected 2 default accounts, got {len(accs)}"


# =============================================================
# 04 - VERIFY EMAIL
# =============================================================
@pytest.mark.parametrize("which", ["u1", "u2"])
def test_04_verify_email(s, which):
    otp = _get_latest_otp(STATE[f"{which}_id"], "email_verify")
    assert otp, "Email verify OTP not found"
    r = s.post(
        f"{BASE_URL}/api/auth/verify-email",
        json={"email": STATE[f"{which}_email"], "otp": otp},
    )
    assert r.status_code == 200, r.text
    u = db.users.find_one({"id": STATE[f"{which}_id"]})
    assert u["email_verified"] is True


# =============================================================
# 05 - LOGIN WITH 2FA
# =============================================================
@pytest.mark.parametrize("which", ["u1", "u2"])
def test_05_login_2fa(s, which):
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": STATE[f"{which}_email"], "password": STATE[f"{which}_password"]},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("requires_2fa") is True
    assert "challenge_id" in data
    ch = _get_latest_challenge(STATE[f"{which}_id"])
    assert ch, "Login challenge not found"
    r2 = s.post(
        f"{BASE_URL}/api/auth/verify-2fa",
        json={"challenge_id": data["challenge_id"], "otp": ch["otp"]},
    )
    assert r2.status_code == 200, r2.text
    assert "token" in r2.json()
    STATE[f"{which}_token"] = r2.json()["token"]


# =============================================================
# 06 - AUTH ME + INVALID CREDS
# =============================================================
def test_06_auth_me(s):
    r = s.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["user"]["email"] == STATE["u1_email"]


def test_06b_login_invalid(s):
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": STATE["u1_email"], "password": "WrongPass123!"},
    )
    assert r.status_code == 401


# =============================================================
# 07 - FORGOT/RESET PASSWORD
# =============================================================
def test_07_forgot_and_reset_password(s):
    r = s.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": STATE["u1_email"]})
    assert r.status_code == 200
    otp = _get_latest_otp(STATE["u1_id"], "password_reset")
    assert otp, "Password reset OTP not found"
    new_pw = "NewPass1234!"
    r2 = s.post(
        f"{BASE_URL}/api/auth/reset-password",
        json={"email": STATE["u1_email"], "otp": otp, "new_password": new_pw},
    )
    assert r2.status_code == 200
    # Re-login (2FA again)
    r3 = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": STATE["u1_email"], "password": new_pw},
    )
    assert r3.status_code == 200
    ch_id = r3.json()["challenge_id"]
    ch = _get_latest_challenge(STATE["u1_id"])
    r4 = s.post(
        f"{BASE_URL}/api/auth/verify-2fa",
        json={"challenge_id": ch_id, "otp": ch["otp"]},
    )
    assert r4.status_code == 200
    STATE["u1_token"] = r4.json()["token"]
    STATE["u1_password"] = new_pw


# =============================================================
# 08 - PROFILE update, change password (skip to keep state), 2FA toggle
# =============================================================
def test_08_profile_update(s):
    r = s.patch(
        f"{BASE_URL}/api/profile",
        json={"full_name": "Alice Updated"},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["user"]["full_name"] == "Alice Updated"


def test_08b_sessions_activity(s):
    r = s.get(f"{BASE_URL}/api/profile/sessions",
              headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r.status_code == 200
    assert "sessions" in r.json()
    r2 = s.get(f"{BASE_URL}/api/profile/activity",
               headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r2.status_code == 200


# =============================================================
# 09 - KYC submit (both users)
# =============================================================
@pytest.mark.parametrize("which", ["u1", "u2"])
def test_09_kyc_submit(s, which):
    # Create tiny in-memory files
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 100
    files = {
        "id_document": ("id.png", io.BytesIO(png), "image/png"),
        "selfie": ("selfie.png", io.BytesIO(png), "image/png"),
    }
    data = {
        "dob": "1990-01-01",
        "address": "123 Test St",
        "next_of_kin_name": "Kin Person",
        "next_of_kin_phone": "+15551112222",
        "account_type": "both",
    }
    r = s.post(
        f"{BASE_URL}/api/kyc/submit",
        files=files,
        data=data,
        headers={"Authorization": f"Bearer {STATE[f'{which}_token']}"},
    )
    assert r.status_code == 200, r.text


# =============================================================
# 10 - ADMIN APPROVE KYC
# =============================================================
@pytest.mark.parametrize("which", ["u1", "u2"])
def test_10_admin_approve_kyc(s, which):
    r = s.post(
        f"{BASE_URL}/api/admin/kyc/action",
        json={"user_id": STATE[f"{which}_id"], "action": "approve", "note": "ok"},
        headers={"Authorization": f"Bearer {STATE['admin_token']}"},
    )
    assert r.status_code == 200, r.text
    u = db.users.find_one({"id": STATE[f"{which}_id"]})
    assert u["kyc_status"] == "approved"


# =============================================================
# 11 - GET ACCOUNTS
# =============================================================
@pytest.mark.parametrize("which", ["u1", "u2"])
def test_11_accounts(s, which):
    r = s.get(
        f"{BASE_URL}/api/accounts",
        headers={"Authorization": f"Bearer {STATE[f'{which}_token']}"},
    )
    assert r.status_code == 200
    accs = r.json()["accounts"]
    assert len(accs) == 2
    STATE[f"{which}_accounts"] = accs


# =============================================================
# 12 - ADMIN BALANCE ADJUSTMENT (seed funds)
# =============================================================
def test_12_admin_balance_adjustment(s):
    checking = next(a for a in STATE["u1_accounts"] if a["type"] == "checking")
    before = float(checking["balance"])
    r = s.post(
        f"{BASE_URL}/api/admin/balance-adjustment",
        json={
            "account_id": checking["id"],
            "adjustment_type": "credit",
            "amount": 10000.0,
            "reason": "Initial seed for tests",
            "admin_password": "admin123",
        },
        headers={"Authorization": f"Bearer {STATE['admin_token']}"},
    )
    assert r.status_code == 200, r.text
    txn = r.json()["transaction"]
    assert "reference" in txn
    STATE["adjustment_txn_id"] = txn["id"]
    # Verify balance updated
    a = db.accounts.find_one({"id": checking["id"]})
    assert float(a["balance"]) == before + 10000.0
    # Audit log
    assert db.audit_logs.find_one({"reference": txn["reference"]}) is not None or \
           db.audit_logs.find_one({"action": {"$regex": "balance_adjustment"}}) is not None


def test_12b_wrong_admin_password(s):
    checking = next(a for a in STATE["u1_accounts"] if a["type"] == "checking")
    r = s.post(
        f"{BASE_URL}/api/admin/balance-adjustment",
        json={
            "account_id": checking["id"],
            "adjustment_type": "credit",
            "amount": 1.0,
            "reason": "bad pw test",
            "admin_password": "wrongpass",
        },
        headers={"Authorization": f"Bearer {STATE['admin_token']}"},
    )
    assert r.status_code == 403


# =============================================================
# 13 - TRANSFER u1 -> u2
# =============================================================
def test_13_transfer_email(s):
    src = next(a for a in STATE["u1_accounts"] if a["type"] == "checking")
    r = s.post(
        f"{BASE_URL}/api/transfers",
        json={
            "from_account_id": src["id"],
            "recipient_type": "email",
            "recipient": STATE["u2_email"],
            "amount": 500.0,
            "description": "Test transfer",
            "save_beneficiary": True,
            "beneficiary_name": "Bob",
        },
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "completed"
    STATE["txn_id_for_reversal"] = data["transaction_id"]


def test_13b_insufficient_funds(s):
    savings = next(a for a in STATE["u1_accounts"] if a["type"] == "savings")
    r = s.post(
        f"{BASE_URL}/api/transfers",
        json={
            "from_account_id": savings["id"],
            "recipient_type": "email",
            "recipient": STATE["u2_email"],
            "amount": 999999.0,
        },
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r.status_code == 400


# =============================================================
# 14 - BENEFICIARIES
# =============================================================
def test_14_beneficiaries(s):
    r = s.get(f"{BASE_URL}/api/beneficiaries",
              headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r.status_code == 200
    assert len(r.json()["beneficiaries"]) >= 1

    r2 = s.post(
        f"{BASE_URL}/api/beneficiaries",
        json={"name": "Manual", "identifier": STATE["u2_phone"], "identifier_type": "phone"},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r2.status_code == 200
    bid = r2.json()["beneficiary"]["id"]
    r3 = s.delete(f"{BASE_URL}/api/beneficiaries/{bid}",
                  headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r3.status_code == 200


# =============================================================
# 15 - TRANSACTIONS + RECEIPT + STATEMENT PDF
# =============================================================
def test_15_transactions(s):
    r = s.get(f"{BASE_URL}/api/transactions",
              headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_15b_receipt_pdf(s):
    r = s.get(f"{BASE_URL}/api/transactions/{STATE['txn_id_for_reversal']}/receipt",
              headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r.status_code == 200
    assert r.headers.get("content-type") == "application/pdf"
    assert r.content[:4] == b"%PDF"


def test_15c_statement_pdf(s):
    checking = next(a for a in STATE["u1_accounts"] if a["type"] == "checking")
    r = s.get(f"{BASE_URL}/api/accounts/{checking['id']}/statement",
              headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"


# =============================================================
# 16 - DEPOSITS (pending -> admin approve)
# =============================================================
def test_16_deposit_flow(s):
    savings = next(a for a in STATE["u1_accounts"] if a["type"] == "savings")
    r = s.post(
        f"{BASE_URL}/api/deposits",
        json={"account_id": savings["id"], "amount": 200.0, "method": "bank_transfer"},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r.status_code == 200, r.text
    # Fetch pending deposit
    dep = db.deposit_requests.find_one({"user_id": STATE["u1_id"], "status": "pending"},
                                        sort=[("created_at", -1)])
    assert dep
    r2 = s.post(
        f"{BASE_URL}/api/admin/deposits/{dep['id']}/approve",
        headers={"Authorization": f"Bearer {STATE['admin_token']}"},
    )
    assert r2.status_code == 200


# =============================================================
# 17 - WITHDRAWALS
# =============================================================
def test_17_withdrawal(s):
    # Use checking (has funds)
    checking = next(a for a in STATE["u1_accounts"] if a["type"] == "checking")
    r = s.post(
        f"{BASE_URL}/api/withdrawals",
        json={"account_id": checking["id"], "amount": 50.0, "method": "atm"},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r.status_code == 200, r.text
    wd = db.withdrawal_requests.find_one({"user_id": STATE["u1_id"], "status": "pending"},
                                          sort=[("created_at", -1)])
    assert wd
    r2 = s.post(
        f"{BASE_URL}/api/admin/withdrawals/{wd['id']}/approve",
        headers={"Authorization": f"Bearer {STATE['admin_token']}"},
    )
    assert r2.status_code == 200


# =============================================================
# 18 - BILLS
# =============================================================
def test_18_bills(s):
    r = s.get(f"{BASE_URL}/api/bills/billers",
              headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r.status_code == 200
    checking = next(a for a in STATE["u1_accounts"] if a["type"] == "checking")
    r2 = s.post(
        f"{BASE_URL}/api/bills/pay",
        json={"account_id": checking["id"], "biller_category": "utilities",
              "biller_name": "City Electric", "customer_ref": "ACC123", "amount": 25.0},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r2.status_code == 200, r2.text


# =============================================================
# 19 - CARDS
# =============================================================
def test_19_cards(s):
    checking = next(a for a in STATE["u1_accounts"] if a["type"] == "checking")
    r = s.post(
        f"{BASE_URL}/api/cards/request",
        json={"account_id": checking["id"], "card_type": "virtual"},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r.status_code == 200, r.text
    card_id = r.json()["card"]["id"]
    # List
    r2 = s.get(f"{BASE_URL}/api/cards",
               headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r2.status_code == 200 and len(r2.json()["cards"]) >= 1
    # Reveal
    r3 = s.get(f"{BASE_URL}/api/cards/{card_id}/reveal",
               headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r3.status_code == 200
    # Freeze
    r4 = s.post(f"{BASE_URL}/api/cards/{card_id}/freeze",
                headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r4.status_code == 200
    # Set PIN
    r5 = s.post(f"{BASE_URL}/api/cards/{card_id}/pin",
                json={"card_id": card_id, "pin": "1234", "current_password": STATE["u1_password"]},
                headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r5.status_code == 200, r5.text


# =============================================================
# 20 - LOANS
# =============================================================
def test_20_loan_flow(s):
    checking = next(a for a in STATE["u1_accounts"] if a["type"] == "checking")
    r = s.post(
        f"{BASE_URL}/api/loans/apply",
        json={"amount": 1000.0, "purpose": "personal", "duration_months": 6, "account_id": checking["id"]},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r.status_code == 200, r.text
    loan_id = r.json()["loan"]["id"]
    # Admin approve
    r2 = s.post(
        f"{BASE_URL}/api/admin/loans/action",
        json={"loan_id": loan_id, "action": "approve", "interest_rate": 12.0},
        headers={"Authorization": f"Bearer {STATE['admin_token']}"},
    )
    assert r2.status_code == 200, r2.text
    # Repay partial
    r3 = s.post(
        f"{BASE_URL}/api/loans/repay",
        json={"loan_id": loan_id, "amount": 100.0, "account_id": checking["id"]},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r3.status_code == 200, r3.text


# =============================================================
# 21 - INVESTMENTS
# =============================================================
def test_21_investments(s):
    r = s.get(f"{BASE_URL}/api/investments/assets")
    assert r.status_code == 200
    checking = next(a for a in STATE["u1_accounts"] if a["type"] == "checking")
    r2 = s.post(
        f"{BASE_URL}/api/investments/buy",
        json={"symbol": "LUMN", "quantity": 1.0, "account_id": checking["id"]},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r2.status_code == 200, r2.text
    r3 = s.get(f"{BASE_URL}/api/investments/portfolio",
               headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r3.status_code == 200
    assert len(r3.json()["holdings"]) >= 1
    r4 = s.post(
        f"{BASE_URL}/api/investments/sell",
        json={"symbol": "LUMN", "quantity": 1.0, "account_id": checking["id"]},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r4.status_code == 200, r4.text


# =============================================================
# 22 - NOTIFICATIONS
# =============================================================
def test_22_notifications(s):
    r = s.get(f"{BASE_URL}/api/notifications",
              headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r.status_code == 200
    items = r.json()["notifications"]
    if items:
        nid = items[0]["id"]
        r2 = s.post(f"{BASE_URL}/api/notifications/{nid}/read",
                    headers={"Authorization": f"Bearer {STATE['u1_token']}"})
        assert r2.status_code == 200
    r3 = s.post(f"{BASE_URL}/api/notifications/read-all",
                headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r3.status_code == 200


# =============================================================
# 23 - CHAT
# =============================================================
def test_23_chat(s):
    sid = str(uuid.uuid4())
    r = s.post(
        f"{BASE_URL}/api/chat/message",
        json={"session_id": sid, "message": "Hello, what is my balance?"},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r.status_code == 200, r.text
    assert "reply" in r.json() and len(r.json()["reply"]) > 0
    r2 = s.get(f"{BASE_URL}/api/chat/history?session_id={sid}",
               headers={"Authorization": f"Bearer {STATE['u1_token']}"})
    assert r2.status_code == 200


# =============================================================
# 24 - SUPPORT TICKETS
# =============================================================
def test_24_support(s):
    r = s.post(
        f"{BASE_URL}/api/support/tickets",
        json={"subject": "Test", "message": "Need help", "category": "general"},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r.status_code == 200
    tid = r.json()["ticket"]["id"]
    r2 = s.get(f"{BASE_URL}/api/admin/tickets",
               headers={"Authorization": f"Bearer {STATE['admin_token']}"})
    assert r2.status_code == 200
    r3 = s.post(f"{BASE_URL}/api/admin/tickets/{tid}/reply",
                json={"message": "Thanks, checking", "status": "open"},
                headers={"Authorization": f"Bearer {STATE['admin_token']}"})
    assert r3.status_code == 200


# =============================================================
# 25 - ADMIN STATS / USERS / AUDIT LOGS
# =============================================================
def test_25_admin_stats(s):
    r = s.get(f"{BASE_URL}/api/admin/stats",
              headers={"Authorization": f"Bearer {STATE['admin_token']}"})
    assert r.status_code == 200
    j = r.json()
    for k in ("users", "accounts", "total_balance", "total_deposits", "total_loans",
              "pending_kyc", "pending_loans"):
        assert k in j


def test_25b_admin_users_search(s):
    r = s.get(f"{BASE_URL}/api/admin/users?q={STATE['u1_email'][:6]}",
              headers={"Authorization": f"Bearer {STATE['admin_token']}"})
    assert r.status_code == 200
    users = r.json()["users"]
    assert any(u["id"] == STATE["u1_id"] for u in users)


def test_25c_admin_user_detail(s):
    r = s.get(f"{BASE_URL}/api/admin/users/{STATE['u1_id']}",
              headers={"Authorization": f"Bearer {STATE['admin_token']}"})
    assert r.status_code == 200
    assert r.json()["user"]["id"] == STATE["u1_id"]


def test_25d_audit_logs(s):
    r = s.get(f"{BASE_URL}/api/admin/audit-logs",
              headers={"Authorization": f"Bearer {STATE['admin_token']}"})
    assert r.status_code == 200
    assert len(r.json()["logs"]) >= 1


# =============================================================
# 26 - ADMIN REVERSE TRANSACTION
# =============================================================
def test_26_admin_reverse_txn(s):
    r = s.post(
        f"{BASE_URL}/api/admin/transactions/reverse",
        json={"transaction_id": STATE["txn_id_for_reversal"],
              "reason": "Test reversal by QA",
              "admin_password": "admin123"},
        headers={"Authorization": f"Bearer {STATE['admin_token']}"},
    )
    assert r.status_code == 200, r.text
    # Verify audit log
    log = db.audit_logs.find_one({"action": "transaction_reversal",
                                   "original_txn_id": STATE["txn_id_for_reversal"]})
    assert log is not None


# =============================================================
# 27 - FREEZE ACCOUNT + CANNOT DEBIT
# =============================================================
def test_27_freeze_blocks_debit(s):
    # Freeze u2's checking
    checking_u2 = next(a for a in STATE["u2_accounts"] if a["type"] == "checking")
    r = s.post(
        f"{BASE_URL}/api/admin/accounts/freeze",
        json={"account_id": checking_u2["id"], "freeze": True, "reason": "test"},
        headers={"Authorization": f"Bearer {STATE['admin_token']}"},
    )
    assert r.status_code == 200
    # Attempt transfer to frozen account from u1
    src = next(a for a in STATE["u1_accounts"] if a["type"] == "checking")
    r2 = s.post(
        f"{BASE_URL}/api/transfers",
        json={"from_account_id": src["id"], "recipient_type": "account",
              "recipient": checking_u2["account_number"], "amount": 10.0},
        headers={"Authorization": f"Bearer {STATE['u1_token']}"},
    )
    assert r2.status_code == 403
    # Unfreeze
    s.post(
        f"{BASE_URL}/api/admin/accounts/freeze",
        json={"account_id": checking_u2["id"], "freeze": False, "reason": "test over"},
        headers={"Authorization": f"Bearer {STATE['admin_token']}"},
    )


# =============================================================
# 28 - KYC-REQUIRED endpoints reject non-approved users
# =============================================================
def test_28_kyc_required_blocked(s):
    # Register a fresh user (not approved), verify email, login, try transfer
    email = f"nocyc_{RUN_ID}@example.com"
    phone = f"+1333{RUN_ID[:7]}"
    password = "Pass1234!"
    s.post(f"{BASE_URL}/api/auth/register",
           json={"email": email, "phone": phone, "password": password, "full_name": "NoKYC"})
    u = db.users.find_one({"email": email})
    otp = _get_latest_otp(u["id"], "email_verify")
    s.post(f"{BASE_URL}/api/auth/verify-email", json={"email": email, "otp": otp})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    ch_id = r.json()["challenge_id"]
    ch = _get_latest_challenge(u["id"])
    r2 = s.post(f"{BASE_URL}/api/auth/verify-2fa",
                json={"challenge_id": ch_id, "otp": ch["otp"]})
    token = r2.json()["token"]
    accs = s.get(f"{BASE_URL}/api/accounts",
                 headers={"Authorization": f"Bearer {token}"}).json()["accounts"]
    src = accs[0]
    r3 = s.post(
        f"{BASE_URL}/api/transfers",
        json={"from_account_id": src["id"], "recipient_type": "email",
              "recipient": STATE["u2_email"], "amount": 10.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r3.status_code == 403


# =============================================================
# 29 - LOGOUT
# =============================================================
def test_29_logout(s):
    r = s.post(f"{BASE_URL}/api/auth/logout",
               headers={"Authorization": f"Bearer {STATE['u2_token']}"})
    assert r.status_code == 200


# =============================================================
# 30 - CLEANUP
# =============================================================
def test_30_cleanup():
    """Remove test-created users/accounts/etc. Keep admin intact."""
    for which in ("u1", "u2"):
        uid = STATE.get(f"{which}_id")
        if uid:
            db.users.delete_one({"id": uid})
            db.accounts.delete_many({"user_id": uid})
            db.transactions.delete_many({"user_id": uid})
            db.otps.delete_many({"user_id": uid})
            db.login_challenges.delete_many({"user_id": uid})
            db.sessions.delete_many({"user_id": uid})
            db.kyc_documents.delete_many({"user_id": uid})
            db.deposit_requests.delete_many({"user_id": uid})
            db.withdrawal_requests.delete_many({"user_id": uid})
            db.loans.delete_many({"user_id": uid})
            db.investments.delete_many({"user_id": uid})
            db.bill_payments.delete_many({"user_id": uid})
            db.cards.delete_many({"user_id": uid})
            db.beneficiaries.delete_many({"user_id": uid})
            db.notifications.delete_many({"user_id": uid})
            db.support_tickets.delete_many({"user_id": uid})
            db.chat_messages.delete_many({"user_id": uid})
            db.activity_logs.delete_many({"user_id": uid})
    # Fresh no-kyc user too
    nokyc = db.users.find_one({"email": f"nocyc_{RUN_ID}@example.com"})
    if nokyc:
        db.users.delete_one({"id": nokyc["id"]})
        db.accounts.delete_many({"user_id": nokyc["id"]})
