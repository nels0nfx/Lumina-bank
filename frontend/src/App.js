import React from 'react';
import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';

// Public pages
import Landing from '@/pages/public/Landing';
import About from '@/pages/public/About';
import Security from '@/pages/public/Security';
import Privacy from '@/pages/public/Privacy';
import Terms from '@/pages/public/Terms';
import Contact from '@/pages/public/Contact';

// Auth pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import VerifyEmail from '@/pages/auth/VerifyEmail';
import Verify2FA from '@/pages/auth/Verify2FA';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';

// User pages
import Dashboard from '@/pages/app/Dashboard';
import Accounts from '@/pages/app/Accounts';
import Transactions from '@/pages/app/Transactions';
import Transfer from '@/pages/app/Transfer';
import Deposit from '@/pages/app/Deposit';
import Withdraw from '@/pages/app/Withdraw';
import Bills from '@/pages/app/Bills';
import Cards from '@/pages/app/Cards';
import Loans from '@/pages/app/Loans';
import Investments from '@/pages/app/Investments';
import ChatSupport from '@/pages/app/ChatSupport';
import Profile from '@/pages/app/Profile';
import KYC from '@/pages/app/KYC';
import Notifications from '@/pages/app/Notifications';
import AppLayout from '@/components/layout/AppLayout';

// Admin pages
import AdminLayout from '@/components/layout/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminUserDetail from '@/pages/admin/AdminUserDetail';
import AdminKYC from '@/pages/admin/AdminKYC';
import AdminLoans from '@/pages/admin/AdminLoans';
import AdminDeposits from '@/pages/admin/AdminDeposits';
import AdminWithdrawals from '@/pages/admin/AdminWithdrawals';
import AdminBalanceAdjustment from '@/pages/admin/AdminBalanceAdjustment';
import AdminReversals from '@/pages/admin/AdminReversals';
import AdminAuditLogs from '@/pages/admin/AdminAuditLogs';
import AdminTickets from '@/pages/admin/AdminTickets';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-navy-900">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.is_admin) return <Navigate to="/app" replace />;
  return children;
};

const RedirectIfAuthed = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (user) return <Navigate to={user.is_admin ? '/admin' : '/app'} replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/security" element={<Security />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />

          {/* Auth */}
          <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
          <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-2fa" element={<Verify2FA />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* User App */}
          <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="transfer" element={<Transfer />} />
            <Route path="deposit" element={<Deposit />} />
            <Route path="withdraw" element={<Withdraw />} />
            <Route path="bills" element={<Bills />} />
            <Route path="cards" element={<Cards />} />
            <Route path="loans" element={<Loans />} />
            <Route path="investments" element={<Investments />} />
            <Route path="chat" element={<ChatSupport />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="kyc" element={<KYC />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:userId" element={<AdminUserDetail />} />
            <Route path="kyc" element={<AdminKYC />} />
            <Route path="loans" element={<AdminLoans />} />
            <Route path="deposits" element={<AdminDeposits />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="balance-adjustment" element={<AdminBalanceAdjustment />} />
            <Route path="reversals" element={<AdminReversals />} />
            <Route path="audit" element={<AdminAuditLogs />} />
            <Route path="tickets" element={<AdminTickets />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
