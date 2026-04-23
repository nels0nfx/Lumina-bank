import React, { useEffect, useState } from 'react';
import { api, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Loader2, LogOut, ShieldCheck } from 'lucide-react';

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const [form, setForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '', address: user?.address || '' });
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [twofa, setTwofa] = useState({ enabled: !!user?.two_factor_enabled, current_password: '' });
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [s, a] = await Promise.all([api.get('/profile/sessions'), api.get('/profile/activity')]);
    setSessions(s.data.sessions); setActivity(a.data.activity);
  };
  useEffect(() => { load(); setForm({ full_name: user?.full_name || '', phone: user?.phone || '', address: user?.address || '' });
    setTwofa(t => ({ ...t, enabled: !!user?.two_factor_enabled })); }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await api.patch('/profile', form); toast.success('Profile updated'); refreshUser(); }
    catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try { await api.post('/profile/change-password', pw); toast.success('Password changed'); setPw({ current_password: '', new_password: '' }); }
    catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
  };

  const save2fa = async (e) => {
    e.preventDefault();
    try { await api.post('/profile/2fa', twofa); toast.success('2FA setting updated'); refreshUser(); setTwofa(t => ({ ...t, current_password: '' })); }
    catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
  };

  const logoutAll = async () => {
    if (!window.confirm('Sign out from all devices?')) return;
    try { await api.post('/auth/logout-all'); toast.success('All sessions revoked'); logout(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6" data-testid="profile-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">PROFILE</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Profile & Settings</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={saveProfile} className="bg-white border border-border rounded-sm p-6 space-y-4" data-testid="profile-form">
          <h3 className="font-display text-navy-900">Personal details</h3>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Full name</label>
            <input value={form.full_name} onChange={(e)=>setForm({...form, full_name: e.target.value})} data-testid="profile-name"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Phone</label>
            <input value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} data-testid="profile-phone"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Address</label>
            <textarea rows={2} value={form.address} onChange={(e)=>setForm({...form, address: e.target.value})} data-testid="profile-address"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm" />
          </div>
          <button disabled={saving} type="submit" data-testid="profile-save"
            className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-sm inline-flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </form>

        <form onSubmit={changePassword} className="bg-white border border-border rounded-sm p-6 space-y-4" data-testid="password-form">
          <h3 className="font-display text-navy-900">Change password</h3>
          <input type="password" required placeholder="Current password" value={pw.current_password}
            onChange={(e) => setPw({ ...pw, current_password: e.target.value })} data-testid="pw-current"
            className="w-full px-4 py-3 border border-border rounded-sm" />
          <input type="password" required minLength={8} placeholder="New password (min 8 chars)" value={pw.new_password}
            onChange={(e) => setPw({ ...pw, new_password: e.target.value })} data-testid="pw-new"
            className="w-full px-4 py-3 border border-border rounded-sm" />
          <button type="submit" className="px-5 py-2.5 bg-navy-900 text-white rounded-sm" data-testid="pw-submit">Update password</button>
        </form>

        <form onSubmit={save2fa} className="bg-white border border-border rounded-sm p-6 space-y-4" data-testid="2fa-form">
          <h3 className="font-display text-navy-900 flex items-center gap-2"><ShieldCheck size={16} className="text-gold-600" /> Two-factor authentication</h3>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={twofa.enabled} onChange={(e) => setTwofa({ ...twofa, enabled: e.target.checked })} data-testid="2fa-toggle" className="accent-gold-500" />
            <span className="text-sm text-navy-900">Require a one-time code on every sign-in</span>
          </label>
          <input type="password" required placeholder="Confirm with your password" value={twofa.current_password}
            onChange={(e) => setTwofa({ ...twofa, current_password: e.target.value })} data-testid="2fa-password"
            className="w-full px-4 py-3 border border-border rounded-sm" />
          <button type="submit" className="px-5 py-2.5 bg-navy-900 text-white rounded-sm" data-testid="2fa-save">Save 2FA</button>
        </form>

        <div className="bg-white border border-border rounded-sm p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-navy-900">Active sessions</h3>
            <button onClick={logoutAll} data-testid="logout-all" className="text-sm text-red-600 hover:text-red-700 inline-flex items-center gap-1">
              <LogOut size={13} /> Sign out of all
            </button>
          </div>
          <ul className="mt-4 space-y-3 max-h-56 overflow-y-auto">
            {sessions.map(s => (
              <li key={s.id} className="p-3 border border-border rounded-sm text-sm">
                <p className="text-navy-900 line-clamp-1">{s.device || 'Unknown device'}</p>
                <p className="text-xs text-muted-foreground">{s.ip} · Last seen {fmtDate(s.last_seen)}</p>
                {s.revoked && <p className="text-xs text-red-600">Revoked</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white border border-border rounded-sm p-6" data-testid="activity-log">
        <h3 className="font-display text-navy-900">Activity log</h3>
        <ul className="mt-4 divide-y divide-border max-h-72 overflow-y-auto">
          {activity.map(a => (
            <li key={a.id} className="py-3 flex justify-between items-center text-sm">
              <span className="text-navy-900 capitalize">{a.action.replace(/_/g, ' ')}</span>
              <span className="text-xs text-muted-foreground">{fmtDate(a.created_at)} · {a.ip}</span>
            </li>
          ))}
          {activity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
        </ul>
      </div>
    </div>
  );
}
