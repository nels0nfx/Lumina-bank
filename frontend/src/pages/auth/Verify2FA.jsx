import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AuthShell from './AuthShell';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Verify2FA() {
  const { state } = useLocation();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { loginSuccess } = useAuth();

  if (!state?.challenge_id) return <Navigate to="/login" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-2fa', { challenge_id: state.challenge_id, otp });
      loginSuccess(data.token, data.user);
      toast.success('Signed in');
      nav(data.user.is_admin ? '/admin' : '/app');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid code');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="TWO-FACTOR AUTH" subtitle="Enter your login code">
      <p className="text-sm text-muted-foreground mb-6">We sent a 6-digit code to <span className="text-navy-900 font-medium">{state.email}</span>. It expires in 10 minutes.</p>
      <form onSubmit={submit} className="space-y-5" data-testid="verify-2fa-form">
        <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(e)=>setOtp(e.target.value)}
          data-testid="verify-2fa-otp"
          className="w-full px-4 py-4 border border-border rounded-sm tracking-[0.6em] text-center text-2xl font-display focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
        <button type="submit" disabled={loading} data-testid="verify-2fa-submit"
          className="w-full px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />} Verify
        </button>
      </form>
    </AuthShell>
  );
}
