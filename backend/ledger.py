"""Backend-controlled ledger. All balance mutations go through here.
Never mutate balances directly outside this module.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException
from db import db
from auth_utils import generate_reference


async def get_account(account_id: str) -> Optional[dict]:
    return await db.accounts.find_one({"id": account_id}, {"_id": 0})


async def get_user_accounts(user_id: str) -> list:
    return await db.accounts.find({"user_id": user_id}, {"_id": 0}).to_list(100)


async def _insert_transaction(doc: dict):
    await db.transactions.insert_one(doc)
    doc.pop("_id", None)


async def _create_notification(user_id: str, title: str, message: str, category: str = "transaction"):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "category": category,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def credit_account(
    account_id: str,
    amount: float,
    description: str,
    txn_type: str = "credit",
    reference: Optional[str] = None,
    counterparty: Optional[str] = None,
    metadata: Optional[dict] = None,
    status: str = "completed",
    skip_frozen_check: bool = False,
) -> dict:
    """Add funds to an account. Returns created transaction."""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    account = await get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.get("is_frozen") and not skip_frozen_check:
        raise HTTPException(status_code=403, detail="Account is frozen")

    previous_balance = float(account["balance"])
    new_balance = previous_balance + amount

    if status == "completed":
        await db.accounts.update_one(
            {"id": account_id},
            {"$inc": {"balance": amount}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    txn = {
        "id": str(uuid.uuid4()),
        "reference": reference or generate_reference(),
        "account_id": account_id,
        "user_id": account["user_id"],
        "type": txn_type,
        "direction": "credit",
        "amount": amount,
        "currency": "USD",
        "status": status,
        "description": description,
        "counterparty": counterparty,
        "previous_balance": previous_balance,
        "new_balance": new_balance if status == "completed" else previous_balance,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _insert_transaction(txn)

    if status == "completed":
        await _create_notification(
            account["user_id"],
            f"Credit: ${amount:,.2f}",
            f"{description} — Ref {txn['reference']}",
        )
    return txn


async def debit_account(
    account_id: str,
    amount: float,
    description: str,
    txn_type: str = "debit",
    reference: Optional[str] = None,
    counterparty: Optional[str] = None,
    metadata: Optional[dict] = None,
    status: str = "completed",
    skip_frozen_check: bool = False,
    allow_overdraft: bool = False,
) -> dict:
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    account = await get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.get("is_frozen") and not skip_frozen_check:
        raise HTTPException(status_code=403, detail="Account is frozen")

    previous_balance = float(account["balance"])
    if status == "completed" and not allow_overdraft and previous_balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
    new_balance = previous_balance - amount

    if status == "completed":
        await db.accounts.update_one(
            {"id": account_id},
            {"$inc": {"balance": -amount}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    txn = {
        "id": str(uuid.uuid4()),
        "reference": reference or generate_reference(),
        "account_id": account_id,
        "user_id": account["user_id"],
        "type": txn_type,
        "direction": "debit",
        "amount": amount,
        "currency": "USD",
        "status": status,
        "description": description,
        "counterparty": counterparty,
        "previous_balance": previous_balance,
        "new_balance": new_balance if status == "completed" else previous_balance,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _insert_transaction(txn)

    if status == "completed":
        await _create_notification(
            account["user_id"],
            f"Debit: ${amount:,.2f}",
            f"{description} — Ref {txn['reference']}",
        )
    return txn


async def internal_transfer(
    from_account_id: str,
    to_account_id: str,
    amount: float,
    description: str,
    metadata: Optional[dict] = None,
) -> dict:
    """Transfer funds between two internal accounts. Returns {debit, credit}."""
    if from_account_id == to_account_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to same account")
    ref = generate_reference()
    to_acc = await get_account(to_account_id)
    from_acc = await get_account(from_account_id)
    if not to_acc or not from_acc:
        raise HTTPException(status_code=404, detail="Account not found")

    debit = await debit_account(
        from_account_id, amount, description, txn_type="transfer",
        reference=ref, counterparty=to_acc.get("account_number"),
        metadata={**(metadata or {}), "to_account_id": to_account_id}
    )
    credit = await credit_account(
        to_account_id, amount, f"Transfer from {from_acc.get('account_number')}",
        txn_type="transfer", reference=ref, counterparty=from_acc.get("account_number"),
        metadata={**(metadata or {}), "from_account_id": from_account_id}
    )
    return {"debit": debit, "credit": credit, "reference": ref}


async def reverse_transaction(original_txn_id: str, admin_id: str, reason: str) -> dict:
    """Create a linked reversal entry. Original transaction remains immutable.
    The reversal flips direction on the same account.
    """
    orig = await db.transactions.find_one({"id": original_txn_id}, {"_id": 0})
    if not orig:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if orig.get("reversed_by") or orig.get("type") == "reversal":
        raise HTTPException(status_code=400, detail="Transaction already reversed or is a reversal")
    if orig["status"] != "completed":
        raise HTTPException(status_code=400, detail="Only completed transactions can be reversed")

    ref = generate_reference()
    amount = float(orig["amount"])
    account_id = orig["account_id"]
    desc = f"Reversal of {orig['reference']}: {reason}"

    if orig["direction"] == "debit":
        # Original was debit, so reversal credits the account back
        rev = await credit_account(
            account_id, amount, desc, txn_type="reversal", reference=ref,
            metadata={"original_txn_id": original_txn_id, "admin_id": admin_id, "reason": reason}
        )
    else:
        rev = await debit_account(
            account_id, amount, desc, txn_type="reversal", reference=ref,
            metadata={"original_txn_id": original_txn_id, "admin_id": admin_id, "reason": reason},
            allow_overdraft=True, skip_frozen_check=True
        )

    # Mark original as reversed (add linked ref, but don't modify amount/direction/status of original)
    await db.transactions.update_one(
        {"id": original_txn_id},
        {"$set": {"reversed_by": rev["id"], "reversed_ref": ref, "reversal_reason": reason}}
    )
    return {"reversal": rev, "original_id": original_txn_id, "reference": ref}


async def admin_adjustment(
    account_id: str,
    amount: float,
    adj_type: str,  # "credit" or "debit"
    reason: str,
    admin_id: str,
    admin_info: dict,
) -> dict:
    """Admin-controlled balance adjustment. Logged in audit trail."""
    if adj_type not in ("credit", "debit"):
        raise HTTPException(status_code=400, detail="adj_type must be credit or debit")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    account = await get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    previous_balance = float(account["balance"])

    desc = f"Admin Adjustment — {reason}"
    metadata = {
        "admin_id": admin_id,
        "admin_ip": admin_info.get("ip"),
        "admin_device": admin_info.get("device"),
        "reason": reason,
        "previous_balance": previous_balance,
    }

    if adj_type == "credit":
        txn = await credit_account(
            account_id, amount, desc, txn_type="admin_adjustment",
            metadata=metadata, skip_frozen_check=True
        )
    else:
        txn = await debit_account(
            account_id, amount, desc, txn_type="admin_adjustment",
            metadata=metadata, skip_frozen_check=True, allow_overdraft=True
        )

    # Immutable audit log
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin_id,
        "action": f"balance_adjustment_{adj_type}",
        "target_user_id": account["user_id"],
        "target_account_id": account_id,
        "amount": amount,
        "previous_balance": previous_balance,
        "new_balance": txn["new_balance"],
        "reference": txn["reference"],
        "reason": reason,
        "ip": admin_info.get("ip"),
        "device": admin_info.get("device"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return txn
