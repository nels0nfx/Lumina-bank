import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import AuthShell from './AuthShell';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const { state } = useLocation();
  const [email, setEmail] = useState(state?.email || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { email, otp });
      toast.success('Email verified. You can sign in now.');
      nav('/login');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid code');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('A new code has been sent');
    } catch { toast.error('Could not resend'); }
  };

  return (
    <AuthShell title="EMAIL VERIFICATION" subtitle="Enter the code we sent you"
      footer={<>Didn't receive it? <button onClick={resend} className="text-navy-900 font-medium hover:text-gold-600" data-testid="resend-otp">Resend code</button></>}
    >
      <form onSubmit={submit} className="space-y-5" data-testid="verify-email-form">
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Email</label>
          <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}
            data-testid="verify-email-email"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">6-digit code</label>
          <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(e)=>setOtp(e.target.value)}
            data-testid="verify-email-otp"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm tracking-[0.6em] text-center text-xl font-display focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
        </div>
        <button type="submit" disabled={loading} data-testid="verify-email-submit"
          className="w-full px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />} Verify
        </button>
      </form>
    </AuthShell>
  );
}
