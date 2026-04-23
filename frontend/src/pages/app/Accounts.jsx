import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate } from '@/lib/api';
import { Download, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get('/accounts'); setAccounts(data.accounts); }
      finally { setLoading(false); }
    })();
  }, []);

  const downloadStatement = async (acc) => {
    try {
      const res = await api.get(`/accounts/${acc.id}/statement`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `statement-${acc.account_number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Could not download statement'); }
  };

  return (
    <div className="space-y-6" data-testid="accounts-page">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">ACCOUNTS</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Your accounts</h1>
      </div>
      {loading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="grid md:grid-cols-2 gap-5">
          {accounts.map(a => (
            <div key={a.id} data-testid={`account-card-${a.type}`}
              className={`p-7 rounded-sm relative overflow-hidden ${a.is_frozen ? 'border border-red-300 bg-red-50' : 'bg-navy-900 text-white'}`}>
              {!a.is_frozen && <div className="absolute top-0 right-0 w-40 h-40 bg-gold-500/10 rounded-full -mr-20 -mt-20"></div>}
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs tracking-[0.2em] font-semibold ${a.is_frozen ? 'text-red-700' : 'text-gold-500'}`}>{a.type.toUpperCase()} ACCOUNT</p>
                    <p className={`mt-1 text-xs ${a.is_frozen ? 'text-red-700' : 'text-white/60'}`}>{a.account_number}</p>
                  </div>
                  <Wallet size={24} className={a.is_frozen ? 'text-red-700' : 'text-gold-500'} />
                </div>
                <p className={`font-display text-4xl font-semibold mt-5 ${a.is_frozen ? 'text-red-700' : ''}`}>{fmtUSD(a.balance)}</p>
                {a.is_frozen && <p className="mt-2 text-xs text-red-700 font-medium">ACCOUNT FROZEN</p>}
                <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className={a.is_frozen ? 'text-red-700' : 'text-white/60'}>Opened {fmtDate(a.created_at)}</span>
                  <button onClick={() => downloadStatement(a)} data-testid={`statement-${a.type}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-medium ${a.is_frozen ? 'bg-red-700 text-white' : 'bg-gold-500 text-navy-900 hover:bg-gold-600'}`}>
                    <Download size={13} /> Statement
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
