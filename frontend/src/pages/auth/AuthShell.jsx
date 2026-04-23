import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/PublicLayout';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-navy-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          background: 'radial-gradient(circle at 30% 20%, #D4AF37 0%, transparent 50%), radial-gradient(circle at 70% 80%, #D4AF37 0%, transparent 40%)'
        }}></div>
        <Logo dark size="lg" />
        <div className="relative max-w-md">
          <p className="text-xs tracking-[0.3em] text-gold-500 font-semibold mb-3">LUMINA BANK</p>
          <h1 className="font-display text-3xl xl:text-4xl leading-tight">Banking should feel calm, honest and effortless.</h1>
          <p className="mt-5 text-white/70 leading-relaxed">Join thousands of global professionals who use Lumina as their primary account. USD-first. International by design.</p>
        </div>
        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} Lumina Bank. Licensed financial institution.</p>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10"><Logo /></div>
          <p className="text-xs tracking-[0.3em] text-gold-600 font-semibold mb-2">{title}</p>
          <h2 className="font-display text-3xl text-navy-900">{subtitle}</h2>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
          <p className="mt-10 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-navy-900">← Back to homepage</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
