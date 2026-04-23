import React from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';

const sections = [
  { title: 'Our mission', body: 'To make premium, secure banking available to anyone with an internet connection — transparent, global, beautifully crafted.' },
  { title: 'Who we serve', body: 'Founders, professionals, creators, and global citizens who expect banking to work as fluidly as the rest of their digital life.' },
  { title: 'Our values', body: 'Security first. Clarity over cleverness. No dark patterns, no hidden fees. Design is how banking should feel.' },
];

export default function About() {
  return (
    <PublicLayout>
      <section className="max-w-5xl mx-auto px-6 lg:px-12 py-20 lg:py-28">
        <p className="text-xs tracking-[0.3em] text-gold-600 font-semibold mb-3">ABOUT LUMINA</p>
        <h1 className="font-display text-4xl lg:text-5xl text-navy-900 font-semibold">A bank for people who move across borders, industries and ideas.</h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Lumina Bank is a licensed international financial institution. We combine the discipline of traditional private banking with
          the velocity of modern software. Our platform was built from the ground up to be secure by default, honest by design, and
          premium in every detail.
        </p>
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {sections.map((s) => (
            <div key={s.title} className="p-7 border border-border">
              <h3 className="font-display text-xl text-navy-900">{s.title}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
