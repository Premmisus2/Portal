'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';

interface CopyBtnProps {
  text: string;
}

const CopyBtn = ({ text }: CopyBtnProps) => {
  const [copied, setCopied] = useState(false);
  return (
    <button aria-label="Copy to clipboard" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{background:'transparent', border:'1px solid var(--border)', borderRadius:'5px', padding:'3px 8px', cursor:'pointer', color:copied?'var(--accent-ink)':'var(--text-muted)', display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', fontWeight:700, letterSpacing:'.08em', fontFamily:'Inter,sans-serif', transition:'color .15s, border-color .15s', flexShrink:0}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--text-faint)'; e.currentTarget.style.color='var(--text-secondary)';}}
      onMouseLeave={e=>{if(!copied){e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)';}}}>
      <Icon name={copied?'check':'copy'} size={11}/>{copied?'Copied!':'Copy'}
    </button>
  );
};

export default CopyBtn;
