"""Bank-wide settings (single document in collection)."""
from datetime import datetime, timezone
from db import db

DEFAULTS = {
    "id": "settings",
    "contact_email": "hello@lumina.com",
    "support_email": "support@lumina.com",
    "press_email": "press@lumina.com",
    "support_phone": "+1 (800) 555-LUMN",
    "support_hours": "24/7",
    "virtual_card_price": 25.0,
    "physical_card_price": 100.0,
    "tagline": "Premium digital banking for a borderless life.",
}


async def get_settings() -> dict:
    doc = await db.bank_settings.find_one({"id": "settings"}, {"_id": 0})
    if not doc:
        doc = DEFAULTS.copy()
        doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.bank_settings.insert_one(doc.copy())
        doc.pop("_id", None)
    # Fill any missing keys with defaults
    for k, v in DEFAULTS.items():
        doc.setdefault(k, v)
    return doc


async def update_settings(updates: dict, admin_id: str) -> dict:
    filtered = {k: v for k, v in updates.items() if v is not None}
    if filtered:
        filtered["updated_at"] = datetime.now(timezone.utc).isoformat()
        filtered["updated_by"] = admin_id
        await db.bank_settings.update_one(
            {"id": "settings"},
            {"$set": filtered},
            upsert=True,
        )
    return await get_settings()
