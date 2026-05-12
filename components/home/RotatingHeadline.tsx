'use client';

import { useState, useEffect } from 'react';

const HEADLINES = [
  ['We Built the', 'Sales Command'],
  ['We\'re Building', 'Something Big'],
  ['Outwork Everyone.', 'Out-Close Everyone.'],
  ['The System', 'Sells Itself'],
  ['Your Pipeline.', 'Your Paycheck.'],
];

export default function RotatingHeadline() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx(prev => (prev + 1) % HEADLINES.length);
        setFade(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <h1 style={{fontSize:'clamp(28px, 5vw, 52px)', fontWeight:900, color:'var(--text-primary)', margin:'0 0 16px', lineHeight:1.05, letterSpacing:'-.04em', textTransform:'uppercase', fontFamily:'Inter, sans-serif', minHeight:'2.2em', transition:'opacity .4s ease', opacity: fade ? 1 : 0}}>
      {HEADLINES[idx][0]}<br/>
      <span style={{background:'linear-gradient(135deg, var(--text-primary) 40%, var(--accent-ink) 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{HEADLINES[idx][1]}</span>
    </h1>
  );
}
