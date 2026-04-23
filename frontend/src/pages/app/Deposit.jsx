import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';

const StatusBadge = ({ s }) => {
  const c = s === 'approved' ? 'bg-emerald-50 text-emerald-700' : s === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  const I = s === 'approved' ? CheckCircle2 : s === 'pending' ? Clock : XCircle;
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-sm ${c}`}><I size={12} /> {s}</span>;
};

export default function Deposit() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ account_id: '', amount: '', method: 'bank_transfer', note: '' });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [a, d] = await Promise.all([api.get('/accounts'), api.get('/deposits')]);
    setAccounts(a.data.accounts);
    if (a.data.accounts[0] && !form.account_id) setForm(f => ({ ...f, account_id: a.data.accounts[0].id }));
    setItems(d.data.deposits);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/deposits', { ...form, amount: parseFloat(form.amount) });
      toast.success('Deposit requested. Pending approval.');
      setForm({ ...form, amount: '', note: '' });
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Deposit failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6" data-testid="deposit-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">DEPOSIT</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Request a deposit</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={submit} className="lg:col-span-1 bg-white border border-border rounded-sm p-6 space-y-5" data-testid="deposit-form">
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">To account</label>
            <select required value={form.account_id} onChange={(e)=>setForm({...form, account_id: e.target.value})} data-testid="deposit-account"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm bg-white">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.type.toUpperCase()} · {a.account_number}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Amount (USD)</label>
            <input type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})}
              data-testid="deposit-amount"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Method</label>
            <select value={form.method} onChange={(e)=>setForm({...form, method: e.target.value})} data-testid="deposit-method"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm bg-white">
              <option value="bank_transfer">Bank transfer</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Note (optional)</label>
            <input value={form.note} onChange={(e)=>setForm({...form, note: e.target.value})} data-testid="deposit-note"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
          </div>
          <button type="submit" disabled={loading} data-testid="deposit-submit"
            className="w-full px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {loading && <Loader2 size={15} className="animate-spin" />} Submit deposit
          </button>
        </form>

        <div className="lg:col-span-2 bg-white border border-border rounded-sm" data-testid="deposit-history">
          <div className="p-5 border-b border-border"><h2 className="font-display text-navy-900">Deposit history</h2></div>
          {items.length === 0 ? <p className="p-10 text-center text-muted-foreground">No deposits yet</p> : (
            <ul className="divide-y divide-border">
              {items.map(d => (
                <li key={d.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{fmtUSD(d.amount)} via {d.method.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(d.created_at)} · {d.reference}</p>
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
