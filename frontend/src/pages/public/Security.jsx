import React from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ShieldCheck, Lock, Fingerprint, Server, Eye, AlertTriangle } from 'lucide-react';

const pillars = [
  { icon: ShieldCheck, title: '2FA by default', desc: 'Every login requires a one-time code delivered to your verified email.' },
  { icon: Server, title: 'Server-side ledger', desc: 'All balances and transactions live in our secure database — the client is never trusted.' },
  { icon: Lock, title: 'Encryption everywhere', desc: 'TLS 1.2+ in transit. Strong hashing for credentials, PINs, and tokens at rest.' },
  { icon: Fingerprint, title: 'Device management', desc: 'See every active session. Revoke individual devices or log out of all at once.' },
  { icon: Eye, title: 'Immutable audit trail', desc: 'Admin actions leave permanent, tamper-evident records — visible to auditors.' },
  { icon: AlertTriangle, title: 'Fraud monitoring', desc: 'Risk signals are evaluated on every transaction with real-time alerts.' },
];

export default function Security() {
  return (
    <PublicLayout>
      <section className="max-w-5xl mx-auto px-6 lg:px-12 py-20 lg:py-28">
        <p className="text-xs tracking-[0.3em] text-gold-600 font-semibold mb-3">SECURITY</p>
        <h1 className="font-display text-4xl lg:text-5xl text-navy-900 font-semibold">Security is not a feature. It is the entire product.</h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Lumina Bank is built by engineers who ran security programs at some of the world's most regulated institutions. Below is a tour
          of the controls protecting your money, your identity, and your data.
        </p>
        <div className="mt-14 grid md:grid-cols-2 gap-4">
          {pillars.map((p) => (
            <div key={p.title} className="p-7 border border-border flex gap-5">
              <div className="w-11 h-11 bg-navy-900 text-gold-500 flex items-center justify-center rounded-sm flex-shrink-0"><p.icon size={18} strokeWidth={1.6} /></div>
              <div>
                <h3 className="font-display text-lg text-navy-900">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 bg-navy-900 text-white">
          <h2 className="font-display text-2xl">Risk Disclosures</h2>
          <p className="mt-3 text-white/70 leading-relaxed">
            USD deposits are held at tier-1 partner institutions and protected up to regulatory limits. Investment products carry market
            risk and you may lose principal. Past performance is not indicative of future returns. Nothing on this site is financial
            advice.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
