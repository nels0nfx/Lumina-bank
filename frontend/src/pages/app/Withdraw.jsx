import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';

const StatusBadge = ({ s }) => {
  const c = s === 'approved' ? 'bg-emerald-50 text-emerald-700' : s === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  const I = s === 'approved' ? CheckCircle2 : s === 'pending' ? Clock : XCircle;
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-sm ${c}`}><I size={12} /> {s}</span>;
};

export default function Withdraw() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ account_id: '', amount: '', method: 'bank_transfer', destination: '' });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [a, d] = await Promise.all([api.get('/accounts'), api.get('/withdrawals')]);
    setAccounts(a.data.accounts);
    if (a.data.accounts[0] && !form.account_id) setForm(f => ({ ...f, account_id: a.data.accounts[0].id }));
    setItems(d.data.withdrawals);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/withdrawals', { ...form, amount: parseFloat(form.amount) });
      toast.success('Withdrawal requested. Funds held pending approval.');
      setForm({ ...form, amount: '', destination: '' });
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Withdrawal failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6" data-testid="withdraw-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">WITHDRAWAL</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Request a withdrawal</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={submit} className="lg:col-span-1 bg-white border border-border rounded-sm p-6 space-y-5" data-testid="withdraw-form">
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">From account</label>
            <select required value={form.account_id} onChange={(e)=>setForm({...form, account_id: e.target.value})} data-testid="withdraw-account"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm bg-white">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.type.toUpperCase()} · {fmtUSD(a.balance)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Amount (USD)</label>
            <input type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})}
              data-testid="withdraw-amount"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Method</label>
            <select value={form.method} onChange={(e)=>setForm({...form, method: e.target.value})} data-testid="withdraw-method"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm bg-white">
              <option value="bank_transfer">Bank transfer</option>
              <option value="atm">ATM</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Destination details</label>
            <input value={form.destination} onChange={(e)=>setForm({...form, destination: e.target.value})}
              data-testid="withdraw-destination"
              placeholder="e.g. external bank account, branch…"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
          </div>
          <button type="submit" disabled={loading} data-testid="withdraw-submit"
            className="w-full px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {loading && <Loader2 size={15} className="animate-spin" />} Submit withdrawal
          </button>
          <p className="text-xs text-muted-foreground">Funds are held on request and released on approval. Rejections return the funds instantly with a reversal entry.</p>
        </form>

        <div className="lg:col-span-2 bg-white border border-border rounded-sm">
          <div className="p-5 border-b border-border"><h2 className="font-display text-navy-900">Withdrawal history</h2></div>
          {items.length === 0 ? <p className="p-10 text-center text-muted-foreground">No withdrawals yet</p> : (
            <ul className="divide-y divide-border">
              {items.map(d => (
                <li key={d.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{fmtUSD(d.amount)} via {d.method.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(d.created_at)} · {d.reference}</p>
                    {d.destination && <p className="text-xs text-muted-foreground mt-0.5">→ {d.destination}</p>}
                  </div>
                  <StatusBadge s={d.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
