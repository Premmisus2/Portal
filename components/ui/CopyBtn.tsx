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
      style={{background:'transparent', border:'1px solid #1e1e1e', borderRadius:'5px', padding:'3px 8px', cursor:'pointer', color:copied?'#00F0FF':'#555', display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', fontWeight:700, letterSpacing:'.08em', fontFamily:'Inter,sans-serif', transition:'color .15s, border-color .15s', flexShrink:0}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='#444'; e.currentTarget.style.color='#aaa';}}
      onMouseLeave={e=>{if(!copied){e.currentTarget.style.borderColor='#1e1e1e'; e.currentTarget.style.color='#555';}}}>
      <Icon name={copied?'check':'copy'} size={11}/>{copied?'Copied!':'Copy'}
    </button>
  );
};

export default CopyBtn;
