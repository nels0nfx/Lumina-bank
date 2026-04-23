import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import AuthShell from './AuthShell';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const { state } = useLocation();
  const [form, setForm] = useState({ email: state?.email || '', otp: '', new_password: '' });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', form);
      toast.success('Password updated. Please sign in.');
      nav('/login');
    } catch (err) { toast.error(err?.response?.data?.detail || 'Reset failed'); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell title="RESET PASSWORD" subtitle="Choose a new password"
      footer={<Link to="/login" className="text-navy-900 font-medium hover:text-gold-600">Back to sign in</Link>}>
      <form onSubmit={submit} className="space-y-5" data-testid="reset-form">
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Email</label>
          <input type="email" required value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})}
            data-testid="reset-email"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">6-digit code</label>
          <input type="text" inputMode="numeric" maxLength={6} required value={form.otp} onChange={(e)=>setForm({...form, otp: e.target.value})}
            data-testid="reset-otp"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm tracking-[0.6em] text-center text-xl font-display focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">New password</label>
          <input type="password" required minLength={8} value={form.new_password} onChange={(e)=>setForm({...form, new_password: e.target.value})}
            data-testid="reset-new-password"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
        </div>
        <button type="submit" disabled={loading} data-testid="reset-submit"
          className="w-full px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />} Update password
        </button>
      </form>
    </AuthShell>
  );
}
