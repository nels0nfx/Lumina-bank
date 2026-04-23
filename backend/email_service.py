"""Email sending via Resend (async non-blocking)."""
import os
import asyncio
import logging
import resend
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
logger = logging.getLogger(__name__)


def _brand_wrap(title: str, body_html: str) -> str:
    return f"""
    <div style="font-family: Arial, Helvetica, sans-serif; background:#F8F9FA; padding:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E5E7EB;">
        <tr><td style="background:#0B132B;padding:20px 24px;">
          <span style="color:#D4AF37;font-size:20px;font-weight:700;letter-spacing:2px;">LUMINA BANK</span>
        </td></tr>
        <tr><td style="padding:28px 24px;">
          <h2 style="margin:0 0 12px 0;color:#0B132B;font-size:22px;">{title}</h2>
          <div style="color:#1C2541;font-size:14px;line-height:1.6;">{body_html}</div>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#F8F9FA;color:#6B7280;font-size:12px;">
          Secure, international banking. This is an automated message — please do not reply.
        </td></tr>
      </table>
    </div>
    """


async def send_email(to: str, subject: str, html: str) -> dict:
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not set, email not sent")
        return {"status": "skipped", "reason": "no_api_key"}
    params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "sent", "id": result.get("id") if isinstance(result, dict) else None}
    except Exception as e:
        logger.error(f"Resend error: {e}")
        return {"status": "error", "error": str(e)}


async def send_otp_email(to: str, otp: str, purpose: str = "Verification") -> dict:
    body = f"""
      <p>Your {purpose} code is:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#D4AF37;background:#0B132B;padding:16px;text-align:center;margin:16px 0;">{otp}</div>
      <p style="color:#6B7280;">This code expires in 10 minutes. If you didn't request this, please ignore.</p>
    """
    return await send_email(to, f"Lumina Bank — {purpose} Code", _brand_wrap(f"{purpose} Code", body))


async def send_transaction_email(to: str, subject: str, body_html: str) -> dict:
    return await send_email(to, f"Lumina Bank — {subject}", _brand_wrap(subject, body_html))
