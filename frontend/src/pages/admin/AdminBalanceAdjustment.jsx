import React, { useEffect, useState } from 'react';
import { api, fmtUSD } from '@/lib/api';
import { toast } from 'sonner';
import { Scale, Plus, Minus, AlertTriangle, Loader2 } from 'lucide-react';

export default function AdminBalanceAdjustment() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [form, setForm] = useState({ account_id: '', adjustment_type: 'credit', amount: '', reason: '', admin_password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/admin/users').then(r => setUsers(r.data.users)); }, []);

  const selectUser = async (id) => {
    setSelectedUser(id);
    const { data } = await api.get(`/admin/users/${id}`);
    setUserDetail(data);
    if (data.accounts[0]) setForm(f => ({ ...f, account_id: data.accounts[0].id }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.reason.length < 5) return toast.error('Reason must be at least 5 characters');
    setLoading(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      await api.post('/admin/balance-adjustment', payload);
      toast.success('Adjustment posted. Audit log updated.');
      setForm({ ...form, amount: '', reason: '', admin_password: '' });
      selectUser(selectedUser);
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  };

  const account = userDetail?.accounts?.find(a => a.id === form.account_id);

  return (
    <div className="space-y-6" data-testid="admin-adjustment-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">BALANCE ADJUSTMENT</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Controlled balance adjustment</h1>
      </div>

      <div className="bg-amber-50 border border-amber-300 p-4 rounded-sm flex gap-3" data-testid="adjustment-warning">
        <AlertTriangle size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-semibold">Adjustments are immutable and fully audited.</p>
          <p className="mt-1">Every adjustment creates an official transaction with a unique reference, updates the ledger, and writes to the audit log. You cannot delete or edit an adjustment — only reverse it.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-border rounded-sm p-5 max-h-[500px] overflow-y-auto">
          <h3 className="font-display text-navy-900 mb-3">Select user</h3>
          <ul className="space-y-1">
            {users.map(u => (
              <li key={u.id}>
                <button onClick={() => selectUser(u.id)} data-testid={`select-user-${u.id}`}
                  className={`w-full text-left p-3 rounded-sm text-sm border ${selectedUser === u.id ? 'border-navy-900 bg-navy-900 text-white' : 'border-border hover:border-navy-900'}`}>
                  <p className="font-medium">{u.full_name}</p>
                  <p className={`text-xs ${selectedUser === u.id ? 'text-white/70' : 'text-muted-foreground'}`}>{u.email}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} className="lg:col-span-2 bg-white border border-border rounded-sm p-6 space-y-5" data-testid="adjustment-form">
          {!userDetail ? (
            <p className="text-muted-foreground text-center py-12">Select a user to begin.</p>
          ) : (
            <>
              <div className="p-4 bg-[#F8F9FA] border border-border">
                <p className="text-xs uppercase text-muted-foreground">User</p>
                <p className="font-display text-navy-900">{userDetail.user.full_name} · {userDetail.user.email}</p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Account</label>
                <select required value={form.account_id} onChange={(e)=>setForm({...form, account_id: e.target.value})}
                  data-testid="adj-account"
                  className="mt-2 w-full px-4 py-3 border border-border rounded-sm bg-white">
                  {userDetail.accounts.map(a => <option key={a.id} value={a.id}>{a.type.toUpperCase()} · {a.account_number} · {fmtUSD(a.balance)}</option>)}
                </select>
                {account && <p className="text-xs text-muted-foreground mt-2">Current balance: <span className="font-semibold text-navy-900">{fmtUSD(account.balance)}</span></p>}
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Adjustment type</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setForm({ ...form, adjustment_type: 'credit' })} data-testid="adj-credit"
                    className={`p-4 rounded-sm border inline-flex items-center justify-center gap-2 ${form.adjustment_type === 'credit' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-border'}`}>
                    <Plus size={15} /> Credit (add funds)
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, adjustment_type: 'debit' })} data-testid="adj-debit"
                    className={`p-4 rounded-sm border inline-flex items-center justify-center gap-2 ${form.adjustment_type === 'debit' ? 'border-red-600 bg-red-50 text-red-700' : 'border-border'}`}>
                    <Minus size={15} /> Debit (remove funds)
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Amount (USD)</label>
                <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})}
                  data-testid="adj-amount"
                  className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Reason (required)</label>
                <textarea required minLength={5} rows={2} value={form.reason} onChange={(e)=>setForm({...form, reason: e.target.value})}
                  data-testid="adj-reason"
                  placeholder="e.g. Dispute resolution, fee reversal, correction…"
                  className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Confirm with your admin password</label>
                <input required type="password" value={form.admin_password} onChange={(e)=>setForm({...form, admin_password: e.target.value})}
                  data-testid="adj-password"
                  className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40" />
              </div>
              <button type="submit" disabled={loading} data-testid="adj-submit"
                className="w-full px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <Loader2 size={15} className="animate-spin" />} <Scale size={15} /> Post adjustment
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
