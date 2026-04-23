import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { Zap, Smartphone, Wifi, Play, Loader2 } from 'lucide-react';

const CAT_ICON = { utilities: Zap, mobile: Smartphone, internet: Wifi, streaming: Play };
const CAT_LABEL = { utilities: 'Utilities', mobile: 'Mobile Top-up', internet: 'Internet', streaming: 'Streaming' };

export default function Bills() {
  const [accounts, setAccounts] = useState([]);
  const [billers, setBillers] = useState({});
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ account_id: '', biller_category: 'utilities', biller_name: '', customer_ref: '', amount: '' });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [a, b, h] = await Promise.all([api.get('/accounts'), api.get('/bills/billers'), api.get('/bills/history')]);
    setAccounts(a.data.accounts);
    setBillers(b.data.billers);
    setHistory(h.data.payments);
    if (a.data.accounts[0] && !form.account_id) setForm(f => ({ ...f, account_id: a.data.accounts[0].id }));
    if (b.data.billers.utilities[0]) setForm(f => ({ ...f, biller_name: b.data.billers.utilities[0] }));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/bills/pay', { ...form, amount: parseFloat(form.amount) });
      toast.success('Payment completed');
      setForm({ ...form, amount: '', customer_ref: '' });
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Payment failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6" data-testid="bills-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">BILL PAYMENTS</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Pay a bill</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={submit} className="lg:col-span-1 bg-white border border-border rounded-sm p-6 space-y-5" data-testid="bills-form">
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">From account</label>
            <select required value={form.account_id} onChange={(e)=>setForm({...form, account_id: e.target.value})} data-testid="bills-account"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm bg-white">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.type.toUpperCase()} · {fmtUSD(a.balance)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Category</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {Object.keys(billers).map(c => {
                const I = CAT_ICON[c];
                return (
                  <button key={c} type="button" onClick={()=>setForm(f=>({...f, biller_category: c, biller_name: (billers[c] && billers[c][0]) || ''}))}
                    data-testid={`cat-${c}`}
                    className={`p-3 rounded-sm border text-center ${form.biller_category === c ? 'border-navy-900 bg-navy-900 text-white' : 'border-border hover:border-navy-900'}`}>
                    <I size={18} className="mx-auto" />
                    <span className="text-[10px] block mt-1">{CAT_LABEL[c]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Biller</label>
            <select required value={form.biller_name} onChange={(e)=>setForm({...form, biller_name: e.target.value})} data-testid="bills-biller"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm bg-white">
              {(billers[form.biller_category] || []).map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Customer reference</label>
            <input required value={form.customer_ref} onChange={(e)=>setForm({...form, customer_ref: e.target.value})}
              data-testid="bills-ref" placeholder="Account/meter/subscriber ID"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Amount (USD)</label>
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})}
              data-testid="bills-amount"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
          </div>
          <button type="submit" disabled={loading} data-testid="bills-submit"
            className="w-full px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {loading && <Loader2 size={15} className="animate-spin" />} Pay bill
          </button>
        </form>

        <div className="lg:col-span-2 bg-white border border-border rounded-sm" data-testid="bills-history">
          <div className="p-5 border-b border-border"><h2 className="font-display text-navy-900">Payment history</h2></div>
          {history.length === 0 ? <p className="p-10 text-center text-muted-foreground">No bill payments yet</p> : (
            <ul className="divide-y divide-border">
              {history.map(p => (
                <li key={p.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{p.biller_name} · {CAT_LABEL[p.biller_category]}</p>
                    <p className="text-xs text-muted-foreground">Ref: {p.customer_ref} · {p.reference}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</p>
                  </div>
                  <p className="text-sm font-semibold text-navy-900">-{fmtUSD(p.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
