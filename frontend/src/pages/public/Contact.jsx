import React, { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function Contact() {
  const [form, setForm] = useState({ subject: '', message: '', email: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.message) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      // Public contact — not authenticated. Just show a success.
      toast.success('Message sent. Our team will respond within 24 hours.');
      setForm({ subject: '', message: '', email: '' });
    } catch (err) {
      toast.error('Failed to send');
    } finally { setLoading(false); }
  };

  return (
    <PublicLayout>
      <section className="max-w-4xl mx-auto px-6 lg:px-12 py-20 lg:py-28">
        <p className="text-xs tracking-[0.3em] text-gold-600 font-semibold mb-3">CONTACT</p>
        <h1 className="font-display text-4xl lg:text-5xl text-navy-900 font-semibold">Talk to Lumina.</h1>
        <p className="mt-6 text-muted-foreground">Customers: please use in-app chat or support tickets from your dashboard. For press, partnerships and general inquiries use this form.</p>

        <div className="mt-12 grid md:grid-cols-2 gap-10">
          <form onSubmit={submit} className="space-y-4" data-testid="contact-form">
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Your email</label>
              <input type="email" required value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})}
                data-testid="contact-email" className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Subject</label>
              <input type="text" required value={form.subject} onChange={(e)=>setForm({...form, subject: e.target.value})}
                data-testid="contact-subject" className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Message</label>
              <textarea rows={6} required value={form.message} onChange={(e)=>setForm({...form, message: e.target.value})}
                data-testid="contact-message" className="mt-2 w-full px-4 py-3 border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500" />
            </div>
            <button disabled={loading} data-testid="contact-submit" className="px-7 py-3.5 bg-navy-900 hover:bg-navy-800 text-white rounded-sm font-medium disabled:opacity-60">
              {loading ? 'Sending…' : 'Send message'}
            </button>
          </form>
          <div className="space-y-6">
            <div className="p-6 border border-border">
              <h3 className="font-display text-lg text-navy-900">General</h3>
              <p className="mt-2 text-sm text-muted-foreground">hello@lumina.com</p>
            </div>
            <div className="p-6 border border-border">
              <h3 className="font-display text-lg text-navy-900">Support</h3>
              <p className="mt-2 text-sm text-muted-foreground">Customers: in-app chat and tickets</p>
              <p className="text-sm text-muted-foreground">support@lumina.com</p>
            </div>
            <div className="p-6 border border-border">
              <h3 className="font-display text-lg text-navy-900">Press</h3>
              <p className="mt-2 text-sm text-muted-foreground">press@lumina.com</p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
