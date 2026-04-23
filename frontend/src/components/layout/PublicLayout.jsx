import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export const Logo = ({ dark = false, size = 'md' }) => {
  const s = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl';
  return (
    <Link to="/" data-testid="brand-logo" className="inline-flex items-center gap-2 font-display font-bold tracking-wider">
      <span className={`w-8 h-8 rounded-sm bg-gold-500 flex items-center justify-center text-navy-900 ${size === 'lg' ? 'w-10 h-10' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <path d="M4 20L12 4L20 20H4Z" fill="currentColor" />
          <circle cx="12" cy="14" r="2" fill="#0B132B" />
        </svg>
      </span>
      <span className={`${s} ${dark ? 'text-white' : 'text-navy-900'} tracking-[0.2em]`}>LUMINA</span>
    </Link>
  );
};

export const PublicNavbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-navy-700">
          <NavLink to="/about" className={({isActive}) => isActive ? 'text-navy-900' : 'hover:text-navy-900'} data-testid="nav-about">About</NavLink>
          <NavLink to="/security" className={({isActive}) => isActive ? 'text-navy-900' : 'hover:text-navy-900'} data-testid="nav-security">Security</NavLink>
          <NavLink to="/contact" className={({isActive}) => isActive ? 'text-navy-900' : 'hover:text-navy-900'} data-testid="nav-contact">Contact</NavLink>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" data-testid="nav-login-btn" className="px-5 py-2 text-sm text-navy-900 hover:text-navy-700">Log in</Link>
          <Link to="/register" data-testid="nav-signup-btn" className="px-5 py-2 text-sm bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm transition-colors">Open an Account</Link>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden text-navy-900" data-testid="mobile-menu-toggle">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-white px-6 py-4 space-y-3">
          <Link to="/about" onClick={() => setOpen(false)} className="block text-navy-900">About</Link>
          <Link to="/security" onClick={() => setOpen(false)} className="block text-navy-900">Security</Link>
          <Link to="/contact" onClick={() => setOpen(false)} className="block text-navy-900">Contact</Link>
          <div className="flex gap-3 pt-3 border-t border-border">
            <Link to="/login" onClick={() => setOpen(false)} className="flex-1 text-center px-4 py-2 border border-navy-900 text-navy-900 rounded-sm">Log in</Link>
            <Link to="/register" onClick={() => setOpen(false)} className="flex-1 text-center px-4 py-2 bg-gold-500 text-navy-900 rounded-sm font-semibold">Sign up</Link>
          </div>
        </div>
      )}
    </header>
  );
};

export const PublicFooter = () => (
  <footer className="bg-navy-900 text-white/80 pt-16 pb-8">
    <div className="max-w-7xl mx-auto px-6 lg:px-12 grid md:grid-cols-4 gap-10">
      <div className="md:col-span-1">
        <Logo dark />
        <p className="mt-4 text-sm text-white/60 leading-relaxed">
          Lumina Bank is a licensed international financial institution offering secure, modern banking for the global citizen.
        </p>
      </div>
      <div>
        <h4 className="text-gold-500 text-xs uppercase tracking-[0.2em] font-semibold mb-4">Product</h4>
        <ul className="space-y-2 text-sm">
          <li><Link to="/register" className="hover:text-gold-400">Open an Account</Link></li>
          <li><Link to="/security" className="hover:text-gold-400">Security</Link></li>
          <li><Link to="/about" className="hover:text-gold-400">About</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-gold-500 text-xs uppercase tracking-[0.2em] font-semibold mb-4">Legal</h4>
        <ul className="space-y-2 text-sm">
          <li><Link to="/privacy" className="hover:text-gold-400">Privacy Policy</Link></li>
          <li><Link to="/terms" className="hover:text-gold-400">Terms of Service</Link></li>
          <li><Link to="/security" className="hover:text-gold-400">Risk Disclosures</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-gold-500 text-xs uppercase tracking-[0.2em] font-semibold mb-4">Support</h4>
        <ul className="space-y-2 text-sm">
          <li><Link to="/contact" className="hover:text-gold-400">Contact Us</Link></li>
          <li>24/7 Chat in-app</li>
          <li>support@lumina.com</li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6 lg:px-12 mt-12 pt-6 border-t border-white/10 text-xs text-white/50 flex flex-col md:flex-row justify-between gap-2">
      <p>© {new Date().getFullYear()} Lumina Bank. Licensed financial institution. All rights reserved.</p>
      <p>USD deposits protected up to regulatory limits. Investment products carry risk.</p>
    </div>
  </footer>
);

export const PublicLayout = ({ children }) => (
  <div className="min-h-screen bg-white">
    <PublicNavbar />
    {children}
    <PublicFooter />
  </div>
);

export default PublicLayout;
