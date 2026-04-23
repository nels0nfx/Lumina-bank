# Lumina Bank — Product Requirements Document

**Generated:** 2026-04-23  
**Architecture:** FastAPI + MongoDB (backend) · React + Tailwind + Shadcn (frontend) · Resend (email) · Gemini 3 Flash (chat) · ReportLab (PDFs)

## Original Problem Statement
Production-grade digital banking platform "Lumina Bank" for a licensed financial institution. Real backend-controlled ledger (no localStorage for financial data), USD currency, neutral international brand, blue + gold + white design. Complete banking suite: public site, auth + 2FA, KYC, dashboard, accounts & ledger, transfers, deposits/withdrawals, bill payments, virtual cards, loans, investments, notifications, chat support, admin dashboard with balance adjustment (controlled, audited) + transaction reversal.

## User Personas
1. **Retail Customer** — Opens account, transfers money, pays bills, uses cards, borrows, invests.
2. **KYC Applicant** — New signup in verification pipeline.
3. **Administrator** — Approves KYC/loans/deposits/withdrawals, adjusts balances with audit trail, reverses transactions, manages support tickets.

## Core Requirements (Static)
- Server-side ledger — balances ONLY mutated via `ledger.py`.
- Unique transaction reference IDs (`LMN-YYYYMMDD-XXXXX`).
- Transaction statuses: pending / completed / failed / reversed.
- 2FA via email OTP; admin bypass for seeded account.
- KYC-gated operations (transfers, withdrawals, bills, loans, investments).
- Admin balance adjustments require admin password re-confirmation + produce immutable audit log entries with IP/device/prev/new balance.
- Transaction reversals create linked entries, original transaction never mutated.
- Full PDF receipts + statements.

## What's Been Implemented (2026-04-23)
### Backend (all REST, /api prefix)
- **Auth**: register, verify-email (OTP), login (2FA challenge flow), verify-2fa, forgot-password, reset-password, logout, logout-all, /me, sessions, activity.
- **KYC**: multipart submission with ID + selfie upload, status tracking.
- **Accounts**: auto-creates savings + checking on registration. Unique 10-digit account numbers. PDF statements.
- **Transactions**: paginated listing, PDF receipts.
- **Transfers**: by email/phone/account number, daily $50k limit, beneficiary save/list/delete, email notifications to both parties.
- **Deposits / Withdrawals**: request workflow, admin approve/reject, reversal on withdrawal rejection.
- **Bills**: 4 categories, 12 sample billers, history.
- **Cards**: virtual + physical request, reveal, freeze/unfreeze, PIN set (password confirm), replace.
- **Loans**: apply, admin approve/reject (custom rate), disbursement on approval, repayments tracked, outstanding balance.
- **Investments**: 8 synthetic assets, portfolio tracking with P/L, buy/sell.
- **Notifications**: auto-generated on transactions/admin actions.
- **Chat**: Gemini 3 Flash via emergentintegrations with graceful fallback, session history.
- **Support Tickets**: create, list, admin reply with status updates.
- **Admin**: stats dashboard, user search/detail, KYC/loan/deposit/withdrawal queues, balance adjustment (password-confirmed + audit), transaction reversal (linked refs), account freeze, immutable audit log viewer.

### Frontend
- **Public**: Landing (hero, features, premium tier, testimonials, security, FAQ, CTA), About, Security, Privacy, Terms, Contact.
- **Auth**: Login, Register, VerifyEmail, Verify2FA, ForgotPassword, ResetPassword — split-screen premium shell.
- **User app**: Dashboard (balance card + quick actions + recent txns + notifications), Accounts, Transactions (filter/search, PDF receipts), Transfer (3-step flow with confirmation), Deposit, Withdraw, Bills, Cards (premium card UI with gold texture), Loans (apply + repay), Investments (Recharts perf + allocation), Chat (with Aurum AI assistant), Profile & Settings (2FA toggle, sessions, activity, password change), KYC (multi-step with file upload), Notifications.
- **Admin**: Dashboard stats, Users (search), User detail with freeze, KYC queue, Loan queue with rate input, Deposit/Withdrawal queues, **Balance Adjustment with password confirmation + audit warning**, Reversals, Audit logs (immutable), Support tickets.

### Integrations
- Resend (API key configured, sandbox mode — verify sender domain for production delivery)
- Gemini 3 Flash via emergentintegrations (user's own key)
- ReportLab (PDF generation)

## Testing
- 45/45 backend e2e tests pass (100%). Test suite at `/app/backend/tests/backend_test.py`.
- One critical bug found + fixed by testing agent: ObjectId serialization after `insert_one` in ledger and card endpoints.

## Prioritized Backlog

### P0 (recommended next)
- Real email delivery: verify a Resend sender domain and update `SENDER_EMAIL`.
- Split `server.py` (1568 lines) into routers by domain.

### P1
- Physical card delivery workflow (address confirmation, tracking number).
- Recurring/scheduled transfers (models already planned).
- Fraud signals: real-time velocity + geo anomaly checks on transfers.
- Loan amortization schedule (current model is simple interest flat-split).
- Export to CSV for transactions + audit logs.

### P2
- Real Stripe payment gateway integration (currently mocked via deposit/withdrawal flow).
- Multi-currency accounts + FX quotes.
- Investments: real market data feed.
- Admin: dispute management dedicated workflow.
- Native mobile apps.

## Credentials
- Admin: `admin@lumina.com` / `admin123`
- Users: self-registration with email OTP verification

## Risks & Notes
- Resend sandbox: OTPs are stored in DB; emails to unverified addresses fail silently.
- Virtual card reveal returns full PAN+CVV without re-auth — adequate for MVP, should require 2FA step in production.
- Gemini chat falls back to rule-based replies if API is unreachable.
