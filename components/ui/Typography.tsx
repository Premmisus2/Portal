'use client';

import { useState, useRef, ReactNode } from 'react';
import Icon from '@/components/ui/Icon';

/* ─── Rep Block ─── */
export const Rep = ({ children }: { children: ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const handleCopy = () => {
    navigator.clipboard.writeText(textRef.current?.textContent || '');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rep-block">
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px'}}>
        <div className="rep-label" style={{marginBottom:0}}>REP</div>
        <button onClick={handleCopy} style={{background:'transparent', border:'1px solid var(--border)', borderRadius:'5px', padding:'3px 8px', cursor:'pointer', color:copied?'var(--accent-ink)':'var(--text-faint)', display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', fontWeight:700, letterSpacing:'.08em', fontFamily:'Inter,sans-serif', transition:'color .15s, border-color .15s', flexShrink:0}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--text-faint)'; e.currentTarget.style.color='var(--text-secondary)';}}
          onMouseLeave={e=>{if(!copied){e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-faint)';}}}>
          <Icon name={copied?'check':'copy'} size={11}/>{copied?'Copied!':'Copy'}
        </button>
      </div>
      <p ref={textRef} className="rep-text">{children}</p>
    </div>
  );
};

/* ─── If Block ─── */
export const IfBlock = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="if-branch"><span className="if-label">↳ {label}</span>{children}</div>
);

/* ─── PLabel ─── */
export const PLabel = ({ children }: { children: ReactNode }) => <span className="plabel">{children}</span>;

/* ─── Section Heading ─── */
export const SecH = ({ children }: { children: ReactNode }) => (
  <div className="sech"><h3>{children}</h3><div className="sech-line" /></div>
);

/* ─── Sub Heading ─── */
export const SubH = ({ children }: { children: ReactNode }) => (
  <h4 style={{margin:'10px 0 5px',fontSize:'15px',fontWeight:700,color:'var(--text-primary)',lineHeight:1.3}}>{children}</h4>
);

/* ─── Body Text ─── */
export const Body = ({ children }: { children: ReactNode }) => (
  <p style={{color:'var(--text-tertiary)',fontSize:'14px',lineHeight:1.6,margin:'4px 0'}}>{children}</p>
);

/* ─── List Item ─── */
export const Li = ({ children }: { children: ReactNode }) => (
  <li style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'3px 0',listStyle:'none'}}>
    <span style={{width:'5px',height:'5px',borderRadius:'50%',background:'var(--accent-ink)',flexShrink:0,marginTop:'8px'}}/>
    <span style={{color:'var(--text-secondary)',fontSize:'14px',lineHeight:1.55}}>{children}</span>
  </li>
);
