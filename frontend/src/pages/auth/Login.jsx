import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AuthShell from './AuthShell';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { loginSuccess } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.requires_2fa) {
        nav('/verify-2fa', { state: { challenge_id: data.challenge_id, email: data.email } });
      } else {
        loginSuccess(data.token, data.user);
        toast.success('Welcome back');
        nav(data.user.is_admin ? '/admin' : '/app');
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="WELCOME BACK" subtitle="Sign in to your account"
      footer={<>Don't have an account? <Link to="/register" className="text-navy-900 font-medium hover:text-gold-600" data-testid="go-register">Open one here</Link></>}
    >
      <form onSubmit={submit} className="space-y-5" data-testid="login-form">
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Email</label>
          <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} data-testid="login-email"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Password</label>
            <Link to="/forgot-password" className="text-xs text-navy-900 hover:text-gold-600" data-testid="go-forgot">Forgot?</Link>
          </div>
          <div className="relative">
            <input type={show ? 'text' : 'password'} required value={password} onChange={(e)=>setPassword(e.target.value)} data-testid="login-password"
              className="mt-2 w-full px-4 py-3 pr-11 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-5 text-muted-foreground" data-testid="toggle-password">
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} data-testid="login-submit"
          className="w-full px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          Sign in
        </button>
      </form>
    </AuthShell>
  );
}
