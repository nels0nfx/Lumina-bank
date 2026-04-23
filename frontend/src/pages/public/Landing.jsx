import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ShieldCheck, Lock, Globe, Smartphone, TrendingUp, Landmark, CreditCard, ArrowRight, Star, ChevronDown } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

const HERO_IMG = "https://images.unsplash.com/photo-1760561149141-0e88e5e27026?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBnbGFzcyUyMG9mZmljZSUyMGJ1aWxkaW5nJTIwc2t5bGluZXxlbnwwfHx8fDE3NzY5NzUwMzB8MA&ixlib=rb-4.1.0&q=85";
const PREMIUM_IMG = "https://images.unsplash.com/photo-1761377197584-2eed555e2b0c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwbGlmZXN0eWxlJTIwd2VhbHRoeSUyMHJlbGF4aW5nfGVufDB8fHx8MTc3Njk3NTAzMHww&ixlib=rb-4.1.0&q=85";
const GOLD_IMG = "https://images.unsplash.com/photo-1690192715829-db4e65d65dd7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTV8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGJsdWUlMjBhbmQlMjBnb2xkJTIwcHJlbWl1bSUyMHRleHR1cmV8ZW58MHx8fHwxNzc2OTc1MDMwfDA&ixlib=rb-4.1.0&q=85";

const features = [
  { icon: ArrowRight, title: 'Instant Transfers', desc: 'Send money by email, phone, or account number — with confirmation at every step.' },
  { icon: CreditCard, title: 'Virtual Cards', desc: 'Issue a virtual debit card instantly. Freeze, unfreeze, and set a PIN from your phone.' },
  { icon: Landmark, title: 'Loans On Your Terms', desc: 'Apply in minutes. Our credit team reviews every request — no auto-approvals, no surprises.' },
  { icon: TrendingUp, title: 'Investments', desc: 'Build a diversified portfolio with curated funds, ETFs and global exposure.' },
  { icon: ShieldCheck, title: 'Bank-grade Security', desc: '2FA, device management, and server-side ledgers mean your money is always protected.' },
  { icon: Globe, title: 'International By Design', desc: 'USD-first, neutral brand, world-class compliance. Bank anywhere life takes you.' },
];

const testimonials = [
  { name: 'Amara Osei', role: 'Founder, Atlas Studio', quote: 'Lumina feels like a private bank built for people who move fast. The gold card alone is worth the upgrade.' },
  { name: 'Mateus Silva', role: 'Portfolio Manager', quote: 'The investments dashboard finally gets it right. Clean, honest, and the statements are gorgeous.' },
  { name: 'Chen Li', role: 'Software Engineer', quote: 'I switched my primary account in a weekend. Transfers settle instantly, support is human, 2FA just works.' },
];

const faqs = [
  { q: 'Is my money safe with Lumina?', a: 'Yes. All balances are held in segregated accounts at tier-1 partner institutions, and deposits are protected up to regulatory limits. We enforce 2FA, device management, and maintain a server-side ledger — no client-side tampering is possible.' },
  { q: 'How long does KYC take?', a: 'Most submissions are reviewed within 24 hours. You can track the status from your dashboard.' },
  { q: 'Are there any hidden fees?', a: 'No. You will see every fee before you confirm a transaction. International transfers and FX carry transparent mid-market pricing.' },
  { q: 'Can I get a physical card?', a: 'Yes. Request one from the Cards screen after KYC approval. Virtual cards are available instantly.' },
  { q: 'What if I see a transaction I do not recognize?', a: 'Freeze your card immediately from the Cards screen and open a support ticket. We can reverse eligible transactions and issue a new card.' },
];

export default function Landing() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-navy-900/95 via-navy-900/90 to-navy-900/80"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-36 text-white">
          <div className="max-w-2xl">
            <p className="text-xs tracking-[0.3em] text-gold-500 font-semibold mb-4">LUMINA BANK — PREMIUM DIGITAL BANKING</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              Banking, <span className="text-gold-500">refined</span><br />for a borderless life.
            </h1>
            <p className="mt-6 text-base lg:text-lg text-white/80 leading-relaxed">
              Open a USD account in minutes. Send money internationally, invest globally, borrow transparently — all from one beautifully crafted app.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link to="/register" data-testid="hero-cta-signup" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm transition-colors">
                Open an Account <ArrowRight size={17} />
              </Link>
              <Link to="/login" data-testid="hero-cta-login" className="inline-flex items-center justify-center px-7 py-3.5 border border-white/30 hover:bg-white/10 text-white rounded-sm transition-colors">
                I'm a customer
              </Link>
            </div>
            <div className="mt-12 flex items-center gap-8 text-sm text-white/60">
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-gold-500" /> 2FA secured</div>
              <div className="flex items-center gap-2"><Lock size={16} className="text-gold-500" /> Server-side ledger</div>
              <div className="flex items-center gap-2"><Globe size={16} className="text-gold-500" /> International</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            ['$4.2B+', 'Assets under management'],
            ['180+', 'Countries supported'],
            ['99.99%', 'Uptime this year'],
            ['24/7', 'Customer support'],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="font-display text-2xl lg:text-3xl text-navy-900 font-semibold">{v}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mt-2">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28 bg-white" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="max-w-xl">
            <p className="text-xs tracking-[0.3em] text-gold-600 font-semibold mb-3">WHY LUMINA</p>
            <h2 className="font-display text-3xl lg:text-4xl text-navy-900 font-semibold">Everything you need. Nothing you don't.</h2>
            <p className="mt-4 text-muted-foreground">A complete banking suite, engineered with obsessive attention to detail and zero dark patterns.</p>
          </div>
          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-0 border border-border bg-white">
            {features.map((f, i) => (
              <div key={f.title} data-testid={`feature-card-${i}`}
                className={`p-7 border-border ${i % 3 !== 2 ? 'lg:border-r' : ''} ${i < features.length - (features.length % 3 || 3) ? 'lg:border-b' : ''} ${i % 2 !== 1 ? 'md:border-r lg:border-r' : ''} ${i < features.length - 2 ? 'border-b' : ''} hover:bg-[#FBFAF5] transition-colors`}>
                <div className="w-10 h-10 bg-navy-900 text-gold-500 flex items-center justify-center rounded-sm">
                  <f.icon size={18} strokeWidth={1.6} />
                </div>
                <h3 className="font-display text-xl text-navy-900 mt-5 font-medium">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Tier */}
      <section className="py-20 lg:py-28 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="aspect-[4/3] rounded-sm overflow-hidden border border-border">
              <img src={PREMIUM_IMG} alt="Premium banking" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-6 -right-4 w-56 h-36 rounded-sm overflow-hidden shadow-[0_20px_40px_rgba(11,19,43,0.25)] bg-navy-900 p-5 text-white hidden sm:block">
              <div className="absolute inset-0 opacity-50 gold-shimmer" style={{background: `url(${GOLD_IMG}) center/cover`}}></div>
              <div className="relative">
                <div className="flex items-center justify-between text-gold-500 text-xs tracking-[0.2em] font-bold">LUMINA <span>PRIVATE</span></div>
                <div className="mt-6 card-number-font text-sm">•••• 4120</div>
                <div className="mt-1 text-[10px] text-white/60">EXP 08/29</div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs tracking-[0.3em] text-gold-600 font-semibold mb-3">PRIVATE BANKING</p>
            <h2 className="font-display text-3xl lg:text-4xl text-navy-900 font-semibold">A private bank, in your pocket.</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Lumina Private blends premium service with the speed of modern software. Dedicated relationship managers, preferred FX,
              higher transfer limits, and a concierge-grade support line.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                'Dedicated private banker',
                'Preferred FX and transfer limits up to $2M/day',
                'Complimentary international cards',
                'Wealth management and curated investments',
              ].map((v) => (
                <li key={v} className="flex gap-3"><span className="mt-1 w-2 h-2 bg-gold-500 rounded-sm flex-shrink-0"></span><span className="text-navy-900">{v}</span></li>
              ))}
            </ul>
            <Link to="/register" className="mt-10 inline-flex items-center gap-2 px-7 py-3.5 bg-navy-900 hover:bg-navy-800 text-white rounded-sm font-medium" data-testid="private-cta">
              Request an invitation <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28 bg-white" data-testid="testimonials-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="max-w-xl">
            <p className="text-xs tracking-[0.3em] text-gold-600 font-semibold mb-3">CUSTOMERS</p>
            <h2 className="font-display text-3xl lg:text-4xl text-navy-900 font-semibold">Trusted by professionals worldwide.</h2>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="p-8 border border-border bg-white">
                <div className="flex gap-0.5 text-gold-500">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                <p className="mt-5 text-navy-900 leading-relaxed">"{t.quote}"</p>
                <div className="mt-6 pt-5 border-t border-border">
                  <p className="font-medium text-navy-900">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 lg:py-28 bg-navy-900 text-white" data-testid="security-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-14">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold-500 font-semibold mb-3">SECURITY</p>
            <h2 className="font-display text-3xl lg:text-4xl font-semibold">Security is the entire product.</h2>
            <p className="mt-5 text-white/70 leading-relaxed">
              Every balance, transaction, and authorization is handled server-side. We never trust the client. Two-factor authentication is
              on by default. Devices are fingerprinted, audit logs are immutable, and suspicious activity is flagged in real-time.
            </p>
            <Link to="/security" className="mt-8 inline-flex items-center gap-2 text-gold-500 hover:text-gold-400" data-testid="security-learn-more">
              Read the security page <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Lock, title: 'End-to-end TLS', desc: 'All traffic is encrypted in transit and at rest.' },
              { icon: Smartphone, title: 'Device Management', desc: 'Revoke any device from your profile.' },
              { icon: ShieldCheck, title: '2FA by Default', desc: 'Every login requires a one-time code.' },
              { icon: ClipboardIcon, title: 'Immutable Logs', desc: 'Adjustments leave a permanent trail.' },
            ].map((c) => (
              <div key={c.title} className="p-6 border border-white/10 bg-white/5">
                <c.icon size={18} className="text-gold-500" />
                <h3 className="font-display text-lg mt-4">{c.title}</h3>
                <p className="text-sm text-white/70 mt-1">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-28 bg-white" data-testid="faq-section">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-14">
            <p className="text-xs tracking-[0.3em] text-gold-600 font-semibold mb-3">FREQUENTLY ASKED</p>
            <h2 className="font-display text-3xl lg:text-4xl text-navy-900 font-semibold">Everything else you might want to know.</h2>
          </div>
          <Accordion type="single" collapsible className="border-t border-border">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`} className="border-b border-border">
                <AccordionTrigger data-testid={`faq-q-${i}`} className="font-display text-left text-navy-900 text-lg hover:no-underline py-5">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-24 bg-[#F8F9FA] border-t border-border">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center">
          <h2 className="font-display text-3xl lg:text-4xl text-navy-900 font-semibold">Ready to start banking differently?</h2>
          <p className="mt-4 text-muted-foreground">Open your Lumina account today — KYC takes less than five minutes.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" data-testid="footer-cta-signup" className="inline-flex items-center justify-center px-8 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-sm">Open an Account</Link>
            <Link to="/contact" data-testid="footer-cta-contact" className="inline-flex items-center justify-center px-8 py-3.5 border border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white rounded-sm transition-colors">Talk to our team</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function ClipboardIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
      <rect x="6" y="4" width="12" height="17" rx="1" /><path d="M9 4h6" /><path d="M9 10h6M9 14h6M9 18h4" />
    </svg>
  );
}
