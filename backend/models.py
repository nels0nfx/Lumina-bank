"""Pydantic request/response models."""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    phone: str
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Verify2FARequest(BaseModel):
    challenge_id: str
    otp: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class KYCSubmitRequest(BaseModel):
    dob: str
    address: str
    next_of_kin_name: str
    next_of_kin_phone: str
    account_type: Literal["savings", "checking", "both"] = "both"


class TransferRequest(BaseModel):
    from_account_id: str
    recipient_type: Literal["email", "phone", "account"]
    recipient: str
    amount: float = Field(gt=0)
    description: Optional[str] = ""
    save_beneficiary: bool = False
    beneficiary_name: Optional[str] = None


class BeneficiaryCreate(BaseModel):
    name: str
    identifier: str
    identifier_type: Literal["email", "phone", "account"]


class DepositRequestModel(BaseModel):
    account_id: str
    amount: float = Field(gt=0)
    method: Literal["bank_transfer", "card", "cash"] = "bank_transfer"
    note: Optional[str] = ""


class WithdrawalRequestModel(BaseModel):
    account_id: str
    amount: float = Field(gt=0)
    method: Literal["bank_transfer", "atm", "cash"] = "bank_transfer"
    destination: Optional[str] = ""


class BillPayRequest(BaseModel):
    account_id: str
    biller_category: Literal["utilities", "mobile", "internet", "streaming"]
    biller_name: str
    customer_ref: str
    amount: float = Field(gt=0)


class CardRequestModel(BaseModel):
    account_id: str
    card_type: Literal["virtual", "physical"] = "virtual"


class CardPinRequest(BaseModel):
    card_id: str
    pin: str = Field(min_length=4, max_length=6)
    current_password: str


class LoanApplicationModel(BaseModel):
    amount: float = Field(gt=0)
    purpose: str
    duration_months: int = Field(ge=1, le=60)
    account_id: str


class LoanRepaymentModel(BaseModel):
    loan_id: str
    amount: float = Field(gt=0)
    account_id: str


class InvestmentBuyModel(BaseModel):
    symbol: str
    quantity: float = Field(gt=0)
    account_id: str


class InvestmentSellModel(BaseModel):
    symbol: str
    quantity: float = Field(gt=0)
    account_id: str


class ChatMessageRequest(BaseModel):
    session_id: str
    message: str


class SupportTicketCreate(BaseModel):
    subject: str
    message: str
    category: str = "general"


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class Toggle2FARequest(BaseModel):
    enabled: bool
    current_password: str


# Admin
class AdminBalanceAdjustmentRequest(BaseModel):
    account_id: str
    adjustment_type: Literal["credit", "debit"]
    amount: float = Field(gt=0)
    reason: str = Field(min_length=5)
    admin_password: str


class AdminReverseTxnRequest(BaseModel):
    transaction_id: str
    reason: str = Field(min_length=5)
    admin_password: str


class AdminKYCActionRequest(BaseModel):
    user_id: str
    action: Literal["approve", "reject"]
    note: Optional[str] = ""


class AdminLoanActionRequest(BaseModel):
    loan_id: str
    action: Literal["approve", "reject"]
    note: Optional[str] = ""
    interest_rate: Optional[float] = 12.0  # annual %


class AdminFreezeAccountRequest(BaseModel):
    account_id: str
    freeze: bool
    reason: Optional[str] = ""
