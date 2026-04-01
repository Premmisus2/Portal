'use client';

import { useState, useRef } from 'react';
import Icon from '@/components/ui/Icon';

const SMSTemplate = ({ title, timing, children }: any) => {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const handleCopy = () => {
    navigator.clipboard.writeText(textRef.current?.textContent || '');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="sms-block">
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px'}}>
        <p style={{fontSize:'11px', fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'#00F0FF', margin:0}}>{title}</p>
        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
          {timing && <span style={{fontSize:'10px', color:'#555', fontWeight:600}}>{timing}</span>}
          <button onClick={handleCopy} style={{background:'transparent', border:'1px solid #1e1e1e', borderRadius:'5px', padding:'3px 8px', cursor:'pointer', color:copied?'#00F0FF':'#333', display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', fontWeight:700, fontFamily:'Inter,sans-serif', transition:'color .15s', flexShrink:0}}>
            <Icon name={copied?'check':'copy'} size={11}/>{copied?'Copied!':'Copy'}
          </button>
        </div>
      </div>
      <div ref={textRef} className="sms-bubble">{children}</div>
    </div>
  );
};

export default SMSTemplate;
