import React from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function Terms() {
  return (
    <PublicLayout>
      <section className="max-w-4xl mx-auto px-6 lg:px-12 py-20 lg:py-24">
        <p className="text-xs tracking-[0.3em] text-gold-600 font-semibold mb-3">TERMS OF SERVICE</p>
        <h1 className="font-display text-3xl lg:text-4xl text-navy-900 font-semibold">Terms of Service.</h1>
        <div className="mt-10 text-navy-900 leading-relaxed space-y-6">
          <p>These Terms govern your use of Lumina Bank. By opening an account you agree to them. Last updated: {new Date().toLocaleDateString()}.</p>
          <div><h2 className="font-display text-xl mt-6">Account eligibility</h2><p className="text-muted-foreground">You must be at least 18 years old and complete KYC verification before you can transfer funds, apply for loans, or pay bills.</p></div>
          <div><h2 className="font-display text-xl mt-6">Your responsibilities</h2><p className="text-muted-foreground">You are responsible for keeping your credentials confidential, enabling 2FA, and reporting unauthorized activity promptly.</p></div>
          <div><h2 className="font-display text-xl mt-6">Fees and limits</h2><p className="text-muted-foreground">All fees and transfer limits are disclosed in-app before you confirm. The default daily transfer limit is $50,000 for standard accounts.</p></div>
          <div><h2 className="font-display text-xl mt-6">Loans</h2><p className="text-muted-foreground">All loan applications are manually reviewed. Approved loans carry interest as disclosed at approval. Early repayment is always permitted without penalty.</p></div>
          <div><h2 className="font-display text-xl mt-6">Investments</h2><p className="text-muted-foreground">Investments carry risk. You may lose principal. Lumina does not provide personalized investment advice.</p></div>
          <div><h2 className="font-display text-xl mt-6">Account closure</h2><p className="text-muted-foreground">We may freeze or close accounts for regulatory reasons, suspected fraud, or violations of these Terms. We will notify you whenever legally permitted.</p></div>
        </div>
      </section>
    </PublicLayout>
  );
}
