import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Users, ShieldCheck, Landmark, ArrowDownToLine, ArrowUpFromLine,
  Scale, Undo2, ClipboardList, MessageCircleQuestion, LogOut
} from 'lucide-react';
import { Logo } from './PublicLayout';

const nav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true, t: 'adnav-overview' },
  { to: '/admin/users', icon: Users, label: 'Users', t: 'adnav-users' },
  { to: '/admin/kyc', icon: ShieldCheck, label: 'KYC Queue', t: 'adnav-kyc' },
  { to: '/admin/loans', icon: Landmark, label: 'Loans', t: 'adnav-loans' },
  { to: '/admin/deposits', icon: ArrowDownToLine, label: 'Deposits', t: 'adnav-deposits' },
  { to: '/admin/withdrawals', icon: ArrowUpFromLine, label: 'Withdrawals', t: 'adnav-withdrawals' },
  { to: '/admin/balance-adjustment', icon: Scale, label: 'Balance Adjustment', t: 'adnav-adjust' },
  { to: '/admin/reversals', icon: Undo2, label: 'Reversals', t: 'adnav-reversals' },
  { to: '/admin/audit', icon: ClipboardList, label: 'Audit Logs', t: 'adnav-audit' },
  { to: '/admin/tickets', icon: MessageCircleQuestion, label: 'Support Tickets', t: 'adnav-tickets' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-navy-900 text-white flex-col">
        <div className="h-16 px-6 flex items-center border-b border-white/10 justify-between">
          <Logo dark />
          <span className="text-[10px] tracking-widest bg-gold-500 text-navy-900 px-2 py-0.5 rounded-sm font-bold">ADMIN</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} data-testid={n.t}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm ${isActive ? 'bg-gold-500 text-navy-900 font-semibold' : 'text-white/75 hover:bg-white/10'}`}>
              <n.icon size={17} strokeWidth={1.6} /><span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 py-3">
          <button onClick={logout} data-testid="admin-logout" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm text-white/75 hover:bg-white/10">
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
          <div>
            <p className="text-xs text-muted-foreground">Administrator</p>
            <p className="font-display text-base text-navy-900" data-testid="admin-topbar-username">{user?.email}</p>
          </div>
        </header>
        <main className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto animate-fade-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
