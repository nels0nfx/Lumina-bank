import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { toast } from 'sonner';
import { Snowflake, ArrowLeft } from 'lucide-react';

export default function AdminUserDetail() {
  const { userId } = useParams();
  const [data, setData] = useState(null);

  const load = async () => {
    const { data } = await api.get(`/admin/users/${userId}`);
    setData(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const toggleFreeze = async (acc) => {
    const reason = prompt(acc.is_frozen ? 'Reason to unfreeze?' : 'Reason to freeze?');
    if (reason === null) return;
    try {
      await api.post('/admin/accounts/freeze', { account_id: acc.id, freeze: !acc.is_frozen, reason });
      toast.success('Account updated');
      load();
    } catch { toast.error('Failed'); }
  };

  if (!data) return <p className="text-muted-foreground">Loading…</p>;
  const { user, accounts, transactions, kyc, loans, cards } = data;

  return (
    <div className="space-y-6" data-testid="admin-user-detail">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy-900">
        <ArrowLeft size={14} /> Back to users
      </Link>
      <div className="bg-white border border-border rounded-sm p-6">
        <h1 className="font-display text-2xl text-navy-900">{user.full_name}</h1>
        <p className="text-muted-foreground text-sm">{user.email} · {user.phone}</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs uppercase text-muted-foreground">KYC</p><p className="font-medium">{user.kyc_status}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Joined</p><p className="font-medium">{fmtDate(user.created_at)}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Loans</p><p className="font-medium">{loans.length}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Cards</p><p className="font-medium">{cards.length}</p></div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-sm p-6">
        <h2 className="font-display text-lg text-navy-900">Accounts</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          {accounts.map(a => (
            <div key={a.id} className={`p-4 border rounded-sm ${a.is_frozen ? 'border-red-300 bg-red-50' : 'border-border'}`} data-testid={`detail-acc-${a.id}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{a.type}</p>
                  <p className="font-display text-xl text-navy-900">{fmtUSD(a.balance)}</p>
                  <p className="text-xs text-muted-foreground">{a.account_number}</p>
                </div>
                <button onClick={() => toggleFreeze(a)} data-testid={`freeze-acc-${a.id}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium ${a.is_frozen ? 'bg-emerald-700 text-white' : 'bg-red-600 text-white'}`}>
                  <Snowflake size={13} /> {a.is_frozen ? 'Unfreeze' : 'Freeze'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {kyc && (
        <div className="bg-white border border-border rounded-sm p-6">
          <h2 className="font-display text-lg text-navy-900">KYC Submission</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">DOB:</span> {kyc.dob}</div>
            <div><span className="text-muted-foreground">Address:</span> {kyc.address}</div>
            <div><span className="text-muted-foreground">Next of kin:</span> {kyc.next_of_kin_name} — {kyc.next_of_kin_phone}</div>
            <div><span className="text-muted-foreground">Status:</span> {kyc.status}</div>
          </div>
        </div>
      )}

      <div className="bg-white border border-border rounded-sm">
        <div className="p-5 border-b border-border"><h2 className="font-display text-navy-900">Transactions ({transactions.length})</h2></div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F9FA] text-xs uppercase text-muted-foreground sticky top-0">
              <tr><th className="text-left p-3">Date</th><th className="text-left p-3">Ref</th><th className="text-left p-3">Description</th><th className="text-right p-3">Amount</th><th className="text-center p-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map(t => (
                <tr key={t.id}>
                  <td className="p-3 text-xs text-muted-foreground">{fmtDate(t.created_at)}</td>
                  <td className="p-3 font-mono text-xs">{t.reference}</td>
                  <td className="p-3 text-navy-900">{t.description}</td>
                  <td className={`p-3 text-right font-semibold ${t.direction === 'credit' ? 'text-emerald-700' : 'text-navy-900'}`}>
                    {t.direction === 'credit' ? '+' : '-'}{fmtUSD(t.amount)}
                  </td>
                  <td className="p-3 text-center text-xs uppercase">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
