import React from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function Privacy() {
  return (
    <PublicLayout>
      <section className="max-w-4xl mx-auto px-6 lg:px-12 py-20 lg:py-24">
        <p className="text-xs tracking-[0.3em] text-gold-600 font-semibold mb-3">PRIVACY POLICY</p>
        <h1 className="font-display text-3xl lg:text-4xl text-navy-900 font-semibold">Your privacy, our obligation.</h1>
        <div className="mt-10 prose prose-slate max-w-none text-navy-900 leading-relaxed space-y-6">
          <p>This policy explains what personal information Lumina Bank collects, how we use it, and the choices you have. Last updated: {new Date().toLocaleDateString()}.</p>
          <div><h2 className="font-display text-xl mt-6">1. Information we collect</h2><p className="text-muted-foreground">Name, email, phone, government-issued ID and selfie for KYC, transaction data, device and session data, and support conversations.</p></div>
          <div><h2 className="font-display text-xl mt-6">2. How we use it</h2><p className="text-muted-foreground">To verify your identity, operate your accounts, prevent fraud, meet legal obligations, and improve our services. We never sell your personal information.</p></div>
          <div><h2 className="font-display text-xl mt-6">3. Sharing</h2><p className="text-muted-foreground">With partner financial institutions, KYC/AML providers, card networks, regulators, and auditors. All under strict contractual and legal safeguards.</p></div>
          <div><h2 className="font-display text-xl mt-6">4. Your rights</h2><p className="text-muted-foreground">Access, correction, export, and deletion (subject to legal retention). Contact privacy@lumina.com to exercise any right.</p></div>
          <div><h2 className="font-display text-xl mt-6">5. Retention</h2><p className="text-muted-foreground">We retain records for the period required by applicable banking regulations — typically 7 years after account closure.</p></div>
          <div><h2 className="font-display text-xl mt-6">6. Changes</h2><p className="text-muted-foreground">We will notify you of material changes in-app and by email at least 30 days before they take effect.</p></div>
        </div>
      </section>
    </PublicLayout>
  );
}
