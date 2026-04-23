import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';

export default function AdminLoans() {
  const [loans, setLoans] = useState([]);
  const [rateMap, setRateMap] = useState({});
  const load = async () => { const { data } = await api.get('/admin/loans/pending'); setLoans(data.loans); };
  useEffect(() => { load(); }, []);

  const act = async (loan_id, action) => {
    const rate = parseFloat(rateMap[loan_id] || 12);
    const note = action === 'reject' ? prompt('Reason?') || '' : '';
    try { await api.post('/admin/loans/action', { loan_id, action, note, interest_rate: rate }); toast.success(`Loan ${action}d`); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6" data-testid="admin-loans-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">LOAN QUEUE</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Loan applications</h1>
      </div>
      <div className="bg-white border border-border rounded-sm">
        {loans.length === 0 ? <p className="p-10 text-center text-muted-foreground">No pending loans</p> : (
          <ul className="divide-y divide-border">
            {loans.map(l => (
              <li key={l.id} className="p-5" data-testid={`loan-row-${l.id}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-display text-navy-900 text-lg">{l.user?.full_name} — {fmtUSD(l.amount)} · {l.duration_months} mo</p>
                    <p className="text-xs text-muted-foreground">{l.user?.email} · Ref {l.reference}</p>
                    <p className="mt-2 text-sm text-navy-900">{l.purpose}</p>
                    <p className="text-xs text-muted-foreground mt-1">Applied {fmtDate(l.applied_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" min="0" max="99" placeholder="Rate %" value={rateMap[l.id] || 12}
                      onChange={(e) => setRateMap({ ...rateMap, [l.id]: e.target.value })} data-testid={`rate-${l.id}`}
                      className="w-20 px-2 py-1.5 border border-border rounded-sm text-sm text-center" />
                    <button onClick={() => act(l.id, 'approve')} data-testid={`loan-approve-${l.id}`}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white text-sm rounded-sm"><Check size={14} /> Approve</button>
                    <button onClick={() => act(l.id, 'reject')} data-testid={`loan-reject-${l.id}`}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-red-600 text-white text-sm rounded-sm"><X size={14} /> Reject</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
