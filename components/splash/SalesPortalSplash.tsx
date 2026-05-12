'use client';

// Sales Portal — Splash
// Visually identical to the LOGIN page (same logo, subtitle, divider, card,
// button, footer), with rotating sales-canon quotes inside the card instead
// of the sign-in form. Renders after auth on every fresh tab session.

import { useEffect, useState } from 'react';
import { SALES_PORTAL_SPLASH_CONFIG } from '@/lib/splash/sales-portal-config';
import type { SplashQuote } from '@/lib/splash/types';

const ROTATION_MS = 12_000;

function pickRandom(quotes: SplashQuote[]): SplashQuote {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

const Logo = ({ height = 52 }: { height?: number }) => (
  <div style={{ height, display: 'flex', alignItems: 'center' }}>
    <img src="/logo.png" alt="Premmisus" style={{ height: '100%', objectFit: 'contain' }} />
  </div>
);

export default function SalesPortalSplash({ onEnter }: { onEnter: () => void }) {
  const config = SALES_PORTAL_SPLASH_CONFIG;
  // Deterministic initial — avoid SSR/client hydration mismatch — then
  // randomize on mount.
  const [quote, setQuote] = useState<SplashQuote>(config.quotes[0]);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setQuote(pickRandom(config.quotes));
  }, [config.quotes]);

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setQuote((prev) => {
          let next = pickRandom(config.quotes);
          let tries = 0;
          while (next.id === prev.id && tries < 5 && config.quotes.length > 1) {
            next = pickRandom(config.quotes);
            tries += 1;
          }
          return next;
        });
        setFading(false);
      }, 400);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, [config.quotes]);

  const handleEnter = () => {
    try {
      sessionStorage.setItem(`${config.storageKeyPrefix}:splash-passed`, '1');
    } catch {}
    onEnter();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', position: 'relative', overflow: 'hidden' }}>
      <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: .6, pointerEvents: 'none' }} />
      <div className="login-glare" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', padding: '0 24px' }}>

        {/* Logo block — identical to login */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '36px' }}>
          <div style={{ marginBottom: '16px' }}><Logo height={52} /></div>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>
            Sales Operations Portal
          </p>
          <div className="divider" style={{ width: '80px', marginTop: '12px' }} />
        </div>

        {/* Card — identical .card-glow shell as login, rotating quote inside */}
        <div className="card-glow" style={{ padding: '32px' }}>

          {/* Section label — mimics the form's "EMAIL ADDRESS" / "PASSWORD" labels */}
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--accent-ink)', marginBottom: '20px', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
            {config.sectionLabel}
          </label>

          {/* Quote — replaces the input fields */}
          <figure
            style={{ margin: 0, opacity: fading ? 0 : 1, transition: 'opacity 300ms ease', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '8px 4px 24px' }}
            aria-live="polite"
          >
            <blockquote style={{ margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: 300, fontSize: '20px', lineHeight: 1.45, color: 'var(--text-primary)', letterSpacing: '-0.005em' }}>
              {quote.text}
            </blockquote>
            <figcaption style={{ marginTop: '20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '.3em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              — {quote.attribution}
            </figcaption>
          </figure>

          {/* Solid cyan button — identical .btn-primary as login's SIGN IN */}
          <button type="button" onClick={handleEnter} className="btn-primary">
            {config.enterLabel} →
          </button>

        </div>

        {/* Footer — identical to login */}
        <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: '11px', marginTop: '20px', letterSpacing: '.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
          Premmisus · Internal Access Only
        </p>
      </div>
    </div>
  );
}
