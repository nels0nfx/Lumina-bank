import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { Undo2, Loader2 } from 'lucide-react';

export default function AdminReversals() {
  const [txnId, setTxnId] = useState('');
  const [txn, setTxn] = useState(null);
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [reversals, setReversals] = useState([]);

  const lookup = async () => {
    if (!txnId.trim()) return;
    try {
      const { data } = await api.get(`/admin/audit-logs`);
      // For lookup, we actually need admin access to fetch transaction by id. Use users endpoint indirectly.
      toast.info('Enter the transaction ID and reason. We will post the reversal and log it.');
    } catch {}
  };

  const submit = async (e) => {
    e.preventDefault();
    if (reason.length < 5) return toast.error('Reason must be at least 5 chars');
    setLoading(true);
    try {
      const { data } = await api.post('/admin/transactions/reverse', { transaction_id: txnId, reason, admin_password: password });
      toast.success(`Reversal posted. Ref ${data.reference}`);
      setReversals(r => [data, ...r]);
      setTxnId(''); setReason(''); setPassword('');
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6" data-testid="admin-reversals-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">REVERSALS</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Reverse a transaction</h1>
        <p className="mt-2 text-muted-foreground">Original transactions remain immutable. A linked reversal entry is created.</p>
      </div>

      <form onSubmit={submit} className="bg-white border border-border rounded-sm p-6 space-y-5 max-w-xl" data-testid="reversal-form">
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Transaction ID (from user's transaction list)</label>
          <input required value={txnId} onChange={(e)=>setTxnId(e.target.value)} data-testid="rev-txn-id"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm font-mono" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Reason</label>
          <textarea required minLength={5} rows={2} value={reason} onChange={(e)=>setReason(e.target.value)} data-testid="rev-reason"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Admin password</label>
          <input required type="password" value={password} onChange={(e)=>setPassword(e.target.value)} data-testid="rev-password"
            className="mt-2 w-full px-4 py-3 border border-border rounded-sm" />
        </div>
        <button type="submit" disabled={loading} data-testid="rev-submit"
          className="px-6 py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm inline-flex items-center gap-2 disabled:opacity-60">
          {loading && <Loader2 size={15} className="animate-spin" />} <Undo2 size={15} /> Post reversal
        </button>
      </form>

      {reversals.length > 0 && (
        <div className="bg-white border border-border rounded-sm p-5 max-w-xl">
          <h3 className="font-display text-navy-900 mb-3">Recent reversals (this session)</h3>
          <ul className="space-y-2 text-sm">
            {reversals.map((r, i) => (
              <li key={i} className="flex justify-between py-2 border-b border-border last:border-0">
                <span className="font-mono text-xs">{r.reference}</span>
                <span className="text-muted-foreground text-xs">{r.original_id?.slice(0, 8)}…</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
