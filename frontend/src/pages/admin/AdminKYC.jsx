import React, { useEffect, useState } from 'react';
import { api, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';

export default function AdminKYC() {
  const [users, setUsers] = useState([]);
  const load = async () => { const { data } = await api.get('/admin/kyc/pending'); setUsers(data.users); };
  useEffect(() => { load(); }, []);

  const act = async (user_id, action) => {
    const note = action === 'reject' ? prompt('Reason for rejection?') || '' : '';
    try { await api.post('/admin/kyc/action', { user_id, action, note }); toast.success(`KYC ${action}d`); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6" data-testid="admin-kyc-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">KYC QUEUE</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Pending verifications</h1>
      </div>
      <div className="bg-white border border-border rounded-sm">
        {users.length === 0 ? <p className="p-10 text-center text-muted-foreground">No pending submissions</p> : (
          <ul className="divide-y divide-border">
            {users.map(u => (
              <li key={u.id} className="p-5 flex justify-between items-center" data-testid={`kyc-user-${u.id}`}>
                <div>
                  <p className="font-display text-navy-900">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{u.email} · {u.phone}</p>
                  <p className="text-xs text-muted-foreground">Address: {u.address}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(u.id, 'approve')} data-testid={`kyc-approve-${u.id}`}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white text-sm rounded-sm">
                    <Check size={14} /> Approve
                  </button>
                  <button onClick={() => act(u.id, 'reject')} data-testid={`kyc-reject-${u.id}`}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-red-600 text-white text-sm rounded-sm">
                    <X size={14} /> Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
