import React, { useEffect, useState } from 'react';
import { api, fmtUSD } from '@/lib/api';
import { Users, Landmark, ArrowDownToLine, ArrowUpFromLine, ShieldCheck, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

const Stat = ({ I, label, value, testId, to, accent }) => (
  <Link to={to || '#'} className="p-6 bg-white border border-border rounded-sm hover:border-gold-500 transition-colors block" data-testid={testId}>
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 flex items-center justify-center rounded-sm ${accent ? 'bg-gold-500 text-navy-900' : 'bg-navy-900 text-gold-500'}`}>
        <I size={17} strokeWidth={1.6} />
      </div>
    </div>
    <p className="mt-4 text-xs tracking-[0.15em] uppercase text-muted-foreground">{label}</p>
    <p className="mt-1 font-display text-2xl text-navy-900 font-semibold">{value}</p>
  </Link>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/admin/stats').then(r => setStats(r.data)); }, []);

  if (!stats) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8" data-testid="admin-dashboard">
      <div>
        <p className="text-xs tracking-[0.2em] text-gold-600 font-semibold">BANK STATISTICS</p>
        <h1 className="font-display text-2xl lg:text-3xl text-navy-900 mt-1">Operations overview</h1>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat I={Users} label="Total users" value={stats.users} testId="stat-users" to="/admin/users" />
        <Stat I={Wallet} label="Total balances" value={fmtUSD(stats.total_balance)} testId="stat-balance" accent />
        <Stat I={ArrowDownToLine} label="Total deposits" value={fmtUSD(stats.total_deposits)} testId="stat-deposits" />
        <Stat I={Landmark} label="Total loans" value={fmtUSD(stats.total_loans)} testId="stat-loans" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat I={ShieldCheck} label="Pending KYC" value={stats.pending_kyc} testId="stat-pending-kyc" to="/admin/kyc" />
        <Stat I={Landmark} label="Pending loans" value={stats.pending_loans} testId="stat-pending-loans" to="/admin/loans" />
        <Stat I={ArrowDownToLine} label="Pending deposits" value={stats.pending_deposits} testId="stat-pending-deposits" to="/admin/deposits" />
        <Stat I={ArrowUpFromLine} label="Pending withdrawals" value={stats.pending_withdrawals} testId="stat-pending-withdrawals" to="/admin/withdrawals" />
      </div>
    </div>
  );
}
