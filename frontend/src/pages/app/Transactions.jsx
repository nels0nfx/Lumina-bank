import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { ArrowDownToLine, ArrowUpFromLine, Download, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get('/transactions', { params: { limit: 200 } }); setTxns(data.transactions); }
      finally { setLoading(false); }
    })();
  }, []);

  const downloadReceipt = async (t) => {
    try {
      const res = await api.get(`/transactions/${t.id}/receipt`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `receipt-${t.reference}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Could not download receipt'); }
  };

  const filtered = txns.filter(t => {
    if (filter !== 'all' && t.direction !== filter) return false;
    if (q && !(t.description?.toLowerCase().includes(q.toLowerCase()) || t.reference?.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">TRANSACTIONS</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Transaction history</h1>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-3.5 text-muted-foreground" />
          <input placeholder="Search reference or description…" value={q} onChange={(e)=>setQ(e.target.value)} data-testid="txn-search"
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
        </div>
        <select value={filter} onChange={(e)=>setFilter(e.target.value)} data-testid="txn-filter"
          className="px-4 py-2.5 border border-border rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40">
          <option value="all">All</option>
          <option value="credit">Credits</option>
          <option value="debit">Debits</option>
        </select>
      </div>

      <div className="bg-white border border-border rounded-sm overflow-hidden">
        {loading ? <p className="p-10 text-center text-muted-foreground">Loading…</p> : filtered.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">No transactions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FA] text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Reference</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-right p-3">Balance</th>
                  <th className="text-center p-3">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-[#FBFAF5]" data-testid={`txn-${t.id}`}>
                    <td className="p-3 text-navy-900">{fmtDate(t.created_at)}</td>
                    <td className="p-3 font-mono text-xs">{t.reference}</td>
                    <td className="p-3 text-navy-900 max-w-xs truncate">{t.description}</td>
                    <td className="p-3 capitalize text-muted-foreground">{(t.type || '').replace('_', ' ')}</td>
                    <td className={`p-3 text-right font-semibold ${t.direction === 'credit' ? 'text-emerald-700' : 'text-navy-900'}`}>
                      {t.direction === 'credit' ? '+' : '-'}{fmtUSD(t.amount)}
                    </td>
                    <td className="p-3 text-right text-navy-900">{fmtUSD(t.new_balance)}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block text-[10px] px-2 py-0.5 uppercase tracking-wider rounded-sm ${
                        t.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        t.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        t.status === 'reversed' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                      }`}>{t.status}</span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => downloadReceipt(t)} data-testid={`receipt-${t.id}`} className="text-navy-700 hover:text-gold-600">
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
