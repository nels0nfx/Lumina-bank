import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  LayoutDashboard, Wallet, ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine,
  Receipt, CreditCard, Landmark, TrendingUp, MessagesSquare, Bell, UserRound,
  LogOut, ShieldCheck, ChevronRight, Menu, X
} from 'lucide-react';
import { Logo } from './PublicLayout';

const nav = [
  { to: '/app', icon: LayoutDashboard, label: 'Overview', end: true, testId: 'nav-overview' },
  { to: '/app/accounts', icon: Wallet, label: 'Accounts', testId: 'nav-accounts' },
  { to: '/app/transactions', icon: Receipt, label: 'Transactions', testId: 'nav-transactions' },
  { to: '/app/transfer', icon: ArrowLeftRight, label: 'Transfer', testId: 'nav-transfer' },
  { to: '/app/deposit', icon: ArrowDownToLine, label: 'Deposit', testId: 'nav-deposit' },
  { to: '/app/withdraw', icon: ArrowUpFromLine, label: 'Withdraw', testId: 'nav-withdraw' },
  { to: '/app/bills', icon: Receipt, label: 'Pay Bills', testId: 'nav-bills' },
  { to: '/app/cards', icon: CreditCard, label: 'Cards', testId: 'nav-cards' },
  { to: '/app/loans', icon: Landmark, label: 'Loans', testId: 'nav-loans' },
  { to: '/app/investments', icon: TrendingUp, label: 'Investments', testId: 'nav-investments' },
  { to: '/app/chat', icon: MessagesSquare, label: 'Support Chat', testId: 'nav-chat' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await api.get('/notifications', { params: { limit: 1 } });
        if (mounted) setUnread(data.unread || 0);
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const kycBanner = user && user.kyc_status !== 'approved' && (
    <Link to="/app/kyc" data-testid="kyc-banner" className="block bg-gold-100 border-b border-gold-500/30 text-navy-900 px-6 py-3 text-sm hover:bg-gold-100/70">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <span>
          <strong>KYC {user.kyc_status === 'pending' ? 'is pending review' : user.kyc_status === 'rejected' ? 'was rejected' : 'is required'}.</strong>{' '}
          Complete verification to unlock transfers, loans, bills and investments.
        </span>
        <ChevronRight size={16} />
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-navy-900 text-white flex-col">
        <div className="h-16 px-6 flex items-center border-b border-white/10">
          <Logo dark />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={item.testId}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors ${
                  isActive ? 'bg-gold-500 text-navy-900 font-semibold' : 'text-white/75 hover:bg-white/10'
                }`
              }
            >
              <item.icon size={17} strokeWidth={1.6} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 py-3 space-y-1">
          <NavLink to="/app/notifications" data-testid="nav-notifications" className={({ isActive }) =>
            `flex items-center justify-between gap-3 px-3 py-2.5 rounded-sm text-sm ${
              isActive ? 'bg-gold-500 text-navy-900 font-semibold' : 'text-white/75 hover:bg-white/10'
            }`}>
            <div className="flex items-center gap-3"><Bell size={17} strokeWidth={1.6} />Notifications</div>
            {unread > 0 && <span className="text-[10px] bg-gold-500 text-navy-900 font-bold px-1.5 py-0.5 rounded-sm">{unread}</span>}
          </NavLink>
          <NavLink to="/app/profile" data-testid="nav-profile" className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm ${
              isActive ? 'bg-gold-500 text-navy-900 font-semibold' : 'text-white/75 hover:bg-white/10'
            }`}>
            <UserRound size={17} strokeWidth={1.6} /> Profile
          </NavLink>
          <button onClick={logout} data-testid="logout-btn" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm text-white/75 hover:bg-white/10">
            <LogOut size={17} strokeWidth={1.6} /> Log out
          </button>
        </div>
      </aside>

      {/* Topbar */}
      <div className="lg:pl-64">
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)} data-testid="open-sidebar">
              <Menu size={22} />
            </button>
            <div className="hidden sm:block">
              <p className="text-xs text-muted-foreground">Welcome back</p>
              <p className="font-display text-base text-navy-900 leading-tight" data-testid="topbar-username">{user?.full_name || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NavLink to="/app/notifications" data-testid="topbar-notifications" className="relative p-2 hover:bg-gray-100 rounded-sm">
              <Bell size={18} />
              {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-gold-500 rounded-full"></span>}
            </NavLink>
            {user?.kyc_status === 'approved' && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-sm">
                <ShieldCheck size={13} /> Verified
              </span>
            )}
          </div>
        </header>

        {kycBanner}

        <main className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto animate-fade-up">
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)}></div>
          <div className="absolute inset-y-0 left-0 w-72 bg-navy-900 text-white flex flex-col">
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
              <Logo dark />
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {[...nav, { to: '/app/notifications', icon: Bell, label: 'Notifications', testId: 'mnav-notif' }, { to: '/app/profile', icon: UserRound, label: 'Profile', testId: 'mnav-profile' }].map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)} data-testid={item.testId}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm ${isActive ? 'bg-gold-500 text-navy-900 font-semibold' : 'text-white/75'}`}>
                  <item.icon size={17} /><span>{item.label}</span>
                </NavLink>
              ))}
              <button onClick={() => { setOpen(false); logout(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm text-white/75 hover:bg-white/10" data-testid="mnav-logout">
                <LogOut size={17} /> Log out
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
