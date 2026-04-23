import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Landmark, CheckCircle2, Clock, XCircle } from 'lucide-react';

const StatusBadge = ({ s }) => {
  const c = s === 'active' ? 'bg-emerald-50 text-emerald-700' : s === 'pending' ? 'bg-amber-50 text-amber-700' :
    s === 'closed' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700';
  return <span className={`inline-block text-xs uppercase px-2 py-0.5 rounded-sm ${c}`}>{s}</span>;
};

export default function Loans() {
  const [accounts, setAccounts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [form, setForm] = useState({ account_id: '', amount: '', purpose: '', duration_months: 12 });
  const [loading, setLoading] = useState(false);
  const [repay, setRepay] = useState(null);
  const [repayAmt, setRepayAmt] = useState('');

  const load = async () => {
    const [a, l] = await Promise.all([api.get('/accounts'), api.get('/loans')]);
    setAccounts(a.data.accounts); setLoans(l.data.loans);
    if (a.data.accounts[0] && !form.account_id) setForm(f => ({ ...f, account_id: a.data.accounts[0].id }));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const apply = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/loans/apply', { ...form, amount: parseFloat(form.amount), duration_months: parseInt(form.duration_months) });
      toast.success('Application submitted. Our team will review within 24 hours.');
      setForm({ ...form, amount: '', purpose: '' });
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  };

  const doRepay = async (e) => {
    e.preventDefault();
    try {
      await api.post('/loans/repay', { loan_id: repay.id, amount: parseFloat(repayAmt), account_id: repay.account_id });
      toast.success('Repayment posted');
      setRepay(null); setRepayAmt('');
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="space-y-6" data-testid="loans-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">LOANS</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Borrow with transparency</h1>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={apply} className="lg:col-span-1 bg-white border border-border rounded-sm p-6 space-y-5" data-testid="loan-form">
          <div className="flex items-center gap-2"><Landmark size={16} className="text-gold-600" /><h3 className="font-display text-navy-900">Apply for a loan</h3></div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Disburse to</label>
            <select required value={form.account_id} onChange={(e)=>setForm({...form, account_id: e.target.value})} data-testid="loan-account"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm bg-white">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.type.toUpperCase()} · {a.account_number}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Amount (USD)</label>
            <input required type="number" step="100" min="100" value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})}
              data-testid="loan-amount"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Duration (months)</label>
            <select value={form.duration_months} onChange={(e)=>setForm({...form, duration_months: e.target.value})} data-testid="loan-duration"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm bg-white">
              {[6, 12, 18, 24, 36, 48, 60].map(m => <option key={m} value={m}>{m} months</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Purpose</label>
            <textarea required rows={3} value={form.purpose} onChange={(e)=>setForm({...form, purpose: e.target.value})}
              data-testid="loan-purpose"
              className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
          </div>
          <button type="submit" disabled={loading} data-testid="loan-submit"
            className="w-full px-6 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {loading && <Loader2 size={15} className="animate-spin" />} Submit application
          </button>
          <p className="text-xs text-muted-foreground">No auto-approvals. Our credit team reviews every application.</p>
        </form>

        <div className="lg:col-span-2 bg-white border border-border rounded-sm" data-testid="loan-list">
          <div className="p-5 border-b border-border"><h2 className="font-display text-navy-900">Your loans</h2></div>
          {loans.length === 0 ? <p className="p-10 text-center text-muted-foreground">No loans yet</p> : (
            <ul className="divide-y divide-border">
              {loans.map(l => (
                <li key={l.id} className="p-5" data-testid={`loan-row-${l.id}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-display text-navy-900 text-lg">{fmtUSD(l.amount)} · {l.duration_months} mo</p>
                      <p className="text-xs text-muted-foreground">{l.purpose}</p>
                      <p className="text-xs text-muted-foreground mt-1">Applied {fmtDate(l.applied_at)} · Ref {l.reference}</p>
                    </div>
                    <StatusBadge s={l.status} />
                  </div>
                  {l.status === 'active' && (
                    <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                      <div><p className="text-muted-foreground uppercase">Rate</p><p className="text-navy-900 font-semibold">{l.interest_rate}%</p></div>
                      <div><p className="text-muted-foreground uppercase">Monthly</p><p className="text-navy-900 font-semibold">{fmtUSD(l.monthly_payment)}</p></div>
                      <div><p className="text-muted-foreground uppercase">Outstanding</p><p className="text-navy-900 font-semibold">{fmtUSD(l.outstanding)}</p></div>
                    </div>
                  )}
                  {l.status === 'active' && (
                    <button onClick={() => { setRepay(l); setRepayAmt(l.monthly_payment); }} data-testid={`repay-${l.id}`}
                      className="mt-4 px-4 py-2 text-sm bg-navy-900 hover:bg-navy-800 text-white rounded-sm">Make repayment</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {repay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={doRepay} className="bg-white rounded-sm p-6 w-full max-w-md" data-testid="repay-modal">
            <h3 className="font-display text-xl text-navy-900">Loan repayment</h3>
            <p className="text-sm text-muted-foreground mt-1">Outstanding: {fmtUSD(repay.outstanding)}</p>
            <input required type="number" step="0.01" min="0.01" max={repay.outstanding} value={repayAmt} onChange={(e)=>setRepayAmt(e.target.value)}
              data-testid="repay-amount"
              className="mt-4 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40" />
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setRepay(null)} className="flex-1 px-4 py-2.5 border border-border rounded-sm">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2.5 bg-gold-500 text-navy-900 font-semibold rounded-sm" data-testid="repay-submit">Pay</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
