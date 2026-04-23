import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import AuthShell from './AuthShell';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('If the email exists, a reset code has been sent');
      nav('/reset-password', { state: { email } });
    } catch { toast.error('Something went wrong'); } finally { setLoading(false); }
  };

  return (
    <AuthShell title="PASSWORD RECOVERY" subtitle="Reset your password"
      footer={<Link to="/login" className="text-navy-900 font-medium hover:text-gold-600">Back to sign in</Link>}>
      <form onSubmit={submit} className="space-y-5" data-testid="forgot-form">
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Email</label>
          <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} data-testid="forgot-email"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
        </div>
        <button type="submit" disabled={loading} data-testid="forgot-submit"
          className="w-full px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />} Send reset code
        </button>
      </form>
    </AuthShell>
  );
}
