import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import AuthShell from './AuthShell';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      toast.success('Account created. Check your email for a verification code.');
      nav('/verify-email', { state: { email: form.email } });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="JOIN LUMINA" subtitle="Create your account"
      footer={<>Already a customer? <Link to="/login" className="text-navy-900 font-medium hover:text-gold-600" data-testid="go-login">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-5" data-testid="register-form">
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Full name</label>
          <input type="text" required value={form.full_name} onChange={(e)=>setForm({...form, full_name: e.target.value})}
            data-testid="register-name"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Email</label>
          <input type="email" required value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})}
            data-testid="register-email"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Phone</label>
          <input type="tel" required value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})}
            data-testid="register-phone"
            placeholder="+1 555 0000"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Password</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} required value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})}
              data-testid="register-password" minLength={8}
              className="mt-2 w-full px-4 py-3 pr-11 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-5 text-muted-foreground">
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters.</p>
        </div>
        <p className="text-xs text-muted-foreground">By creating an account you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
        <button type="submit" disabled={loading} data-testid="register-submit"
          className="w-full px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          Create account
        </button>
      </form>
    </AuthShell>
  );
}
