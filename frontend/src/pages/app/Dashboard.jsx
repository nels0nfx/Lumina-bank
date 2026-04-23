import React, { useEffect, useState } from 'react';
import { api, fmtUSD, fmtDate, maskAccount } from '@/lib/api';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Receipt,
  CreditCard, Landmark, TrendingUp, MessagesSquare, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Quick = ({ to, icon: Icon, label, testId }) => (
  <Link to={to} data-testid={testId}
    className="group flex flex-col items-center justify-center gap-2 p-4 border border-border bg-white hover:border-gold-500 hover:bg-gold-100/30 transition-all rounded-sm">
    <div className="w-10 h-10 bg-navy-900 text-gold-500 group-hover:bg-gold-500 group-hover:text-navy-900 flex items-center justify-center rounded-sm transition-colors">
      <Icon size={18} strokeWidth={1.6} />
    </div>
    <span className="text-xs font-medium text-navy-900">{label}</span>
  </Link>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [txns, setTxns] = useState([]);
  const [notif, setNotif] = useState([]);
  const [hide, setHide] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, t, n] = await Promise.all([
          api.get('/accounts'),
          api.get('/transactions', { params: { limit: 8 } }),
          api.get('/notifications', { params: { limit: 5 } }),
        ]);
        setAccounts(a.data.accounts);
        setTotalBalance(a.data.total_balance);
        setTxns(t.data.transactions);
        setNotif(n.data.notifications);
      } finally { setLoading(false); }
    })();
  }, []);

  const hideVal = (v) => hide ? '•••••' : fmtUSD(v);

  return (
    <div className="space-y-8" data-testid="user-dashboard">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">OVERVIEW</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Hello, {user?.full_name?.split(' ')[0] || 'there'}</h1>
      </div>

      {/* Balance summary */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 p-7 bg-navy-900 text-white rounded-sm relative overflow-hidden" data-testid="total-balance-card">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gold-500/10 rounded-full -mr-20 -mt-20"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-xs tracking-[0.2em] text-gold-500 font-semibold">TOTAL BALANCE</p>
              <button onClick={() => setHide(!hide)} className="text-white/60 hover:text-white" data-testid="toggle-balance-visibility">
                {hide ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="font-display text-4xl font-semibold mt-3" data-testid="total-balance-value">{hideVal(totalBalance)}</p>
            <p className="mt-2 text-xs text-white/60">Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
            <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
              {accounts.map(a => (
                <div key={a.id} className="flex justify-between items-center text-sm" data-testid={`balance-${a.type}`}>
                  <span className="text-white/70 capitalize">{a.type} · {maskAccount(a.account_number)}</span>
                  <span className="font-medium">{hideVal(a.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 p-7 bg-white border border-border rounded-sm">
          <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold mb-4">QUICK ACTIONS</p>
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
            <Quick to="/app/transfer" icon={ArrowLeftRight} label="Transfer" testId="qa-transfer" />
            <Quick to="/app/deposit" icon={ArrowDownToLine} label="Deposit" testId="qa-deposit" />
            <Quick to="/app/withdraw" icon={ArrowUpFromLine} label="Withdraw" testId="qa-withdraw" />
            <Quick to="/app/bills" icon={Receipt} label="Pay Bills" testId="qa-bills" />
            <Quick to="/app/cards" icon={CreditCard} label="Cards" testId="qa-cards" />
            <Quick to="/app/loans" icon={Landmark} label="Loans" testId="qa-loans" />
            <Quick to="/app/investments" icon={TrendingUp} label="Invest" testId="qa-invest" />
            <Quick to="/app/chat" icon={MessagesSquare} label="Support" testId="qa-chat" />
          </div>
        </div>
      </div>

      {/* Recent transactions + Notifications */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-border rounded-sm" data-testid="recent-transactions">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-display text-lg text-navy-900">Recent Transactions</h2>
            <Link to="/app/transactions" className="text-sm text-navy-700 hover:text-gold-600" data-testid="view-all-txns">View all</Link>
          </div>
          {loading ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Loading…</div>
          ) : txns.length === 0 ? (
            <div className="p-10 text-center">
              <Receipt size={32} className="mx-auto text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {txns.map(t => (
                <li key={t.id} className="p-4 flex items-center justify-between hover:bg-[#FBFAF5]" data-testid={`txn-row-${t.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-sm flex items-center justify-center ${t.direction === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {t.direction === 'credit' ? <ArrowDownToLine size={15} /> : <ArrowUpFromLine size={15} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy-900 line-clamp-1">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(t.created_at)} · {t.reference}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${t.direction === 'credit' ? 'text-emerald-700' : 'text-navy-900'}`}>
                      {t.direction === 'credit' ? '+' : '-'}{fmtUSD(t.amount)}
                    </p>
                    <p className={`text-[10px] uppercase tracking-wider ${t.status === 'completed' ? 'text-emerald-600' : t.status === 'pending' ? 'text-amber-600' : 'text-red-600'}`}>{t.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-border rounded-sm" data-testid="dashboard-notifications">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-display text-lg text-navy-900">Notifications</h2>
            <Link to="/app/notifications" className="text-sm text-navy-700 hover:text-gold-600">View all</Link>
          </div>
          {notif.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">You're all caught up.</div>
          ) : (
            <ul className="divide-y divide-border">
              {notif.map(n => (
                <li key={n.id} className="p-4">
                  <p className="text-sm font-medium text-navy-900">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-2 uppercase tracking-wider">{fmtDate(n.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
