import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';

export default function AdminDeposits() {
  const [items, setItems] = useState([]);
  const load = async () => { const { data } = await api.get('/admin/deposits/pending'); setItems(data.deposits); };
  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    try { await api.post(`/admin/deposits/${id}/${action}`); toast.success(`Deposit ${action}d`); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6" data-testid="admin-deposits-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">DEPOSITS</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Pending deposits</h1>
      </div>
      <div className="bg-white border border-border rounded-sm">
        {items.length === 0 ? <p className="p-10 text-center text-muted-foreground">No pending deposits</p> : (
          <ul className="divide-y divide-border">
            {items.map(d => (
              <li key={d.id} className="p-5 flex justify-between items-center" data-testid={`dep-${d.id}`}>
                <div>
                  <p className="font-display text-navy-900">{d.user?.full_name} — {fmtUSD(d.amount)}</p>
                  <p className="text-xs text-muted-foreground">{d.user?.email} · Ref {d.reference} · {d.method} · {fmtDate(d.created_at)}</p>
                  {d.note && <p className="text-xs text-muted-foreground mt-1">Note: {d.note}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(d.id, 'approve')} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-sm inline-flex items-center gap-1" data-testid={`dep-approve-${d.id}`}><Check size={14} /> Approve</button>
                  <button onClick={() => act(d.id, 'reject')} className="px-4 py-2 bg-red-600 text-white text-sm rounded-sm inline-flex items-center gap-1" data-testid={`dep-reject-${d.id}`}><X size={14} /> Reject</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
