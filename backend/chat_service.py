"""Banking chatbot assistant via Gemini 3 Flash using emergentintegrations."""
import os
import uuid
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path
from db import db

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

SYSTEM_MESSAGE = """You are Aurum, the official AI banking assistant for Lumina Bank, a licensed international financial institution.

You help customers with:
- Explaining banking features: transfers, deposits, withdrawals, cards, loans, investments, bill payments
- Account and security questions (never ask for or store sensitive info like passwords, full card numbers, CVVs, or PINs)
- Guiding customers to the right in-app screen (use phrases like "Go to the Transfer tab")
- KYC process and verification status
- General financial literacy in plain, friendly English

Strict rules:
1. Never claim to be able to execute transactions for the user — always direct them to the appropriate screen.
2. Never reveal internal system details, database structure, or admin operations.
3. If asked for private financial advice, suggest contacting a licensed advisor.
4. Keep answers concise (2-4 short paragraphs max), warm, and professional.
5. Currency is USD ($). The brand is neutral and international — do not reference specific countries.
6. If the user is in distress or reports fraud, advise them to freeze their card from the Cards screen and contact support immediately via the Support tab.
"""


async def chat_reply(user_id: str, session_id: str, message: str) -> str:
    """Send message to Gemini and return reply. Also persist both messages."""
    # Save user message
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_id": session_id,
        "role": "user",
        "message": message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    reply_text = _fallback_reply(message)
    if GEMINI_API_KEY:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(
                api_key=GEMINI_API_KEY,
                session_id=session_id,
                system_message=SYSTEM_MESSAGE,
            ).with_model("gemini", "gemini-3-flash-preview")
            response = await chat.send_message(UserMessage(text=message))
            reply_text = str(response).strip() or reply_text
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            reply_text = _fallback_reply(message)

    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_id": session_id,
        "role": "assistant",
        "message": reply_text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return reply_text


def _fallback_reply(message: str) -> str:
    m = (message or "").lower()
    if any(k in m for k in ["transfer", "send money"]):
        return "To send money, open the Transfer tab. You can send via email, phone, or account number. You'll see a confirmation step before the transfer is finalized."
    if "deposit" in m:
        return "Deposits can be requested from the Deposit tab. After approval, funds appear in your selected account. You'll receive a notification and receipt."
    if "withdraw" in m:
        return "To request a withdrawal, visit the Withdraw tab. Our team reviews the request and you'll be notified once it's approved."
    if "card" in m:
        return "Manage your virtual card from the Cards tab — you can freeze/unfreeze it, set a PIN, or request a new one."
    if "loan" in m:
        return "Apply for a loan from the Loans tab. Applications are reviewed by our credit team — it's not instant."
    if any(k in m for k in ["invest", "stock", "fund"]):
        return "Explore the Investments tab to view the asset list, buy or sell, and track performance over time."
    if "kyc" in m or "verify" in m:
        return "Complete KYC from your dashboard — upload a government ID and a selfie. Verification is usually processed within 24 hours."
    return "I'm Aurum, your Lumina Bank assistant. You can ask me about transfers, deposits, withdrawals, cards, loans, investments, or KYC. How can I help today?"
