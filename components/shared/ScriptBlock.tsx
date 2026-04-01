'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';

const ScriptBlock = ({ touch, timing, children, variant = 'default' }: any) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const borderColor = variant === 'preview' ? '#007AFF' : '#00F0FF';
  const bg = variant === 'preview' ? 'rgba(0,122,255,.06)' : 'rgba(0,240,255,.05)';
  return (
    <div style={{ marginBottom: '12px' }}>
      {(touch || timing) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          {touch && <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', letterSpacing: '.1em', textTransform: 'uppercase' }}>{touch}</span>}
          {timing && <span style={{ fontSize: '9px', fontWeight: 700, color: '#444', background: '#111', padding: '2px 7px', borderRadius: '4px', letterSpacing: '.1em', textTransform: 'uppercase' }}>{timing}</span>}
          {variant === 'preview' && <span style={{ fontSize: '9px', fontWeight: 800, color: '#007AFF', letterSpacing: '.12em', textTransform: 'uppercase' }}>Preview Opener</span>}
        </div>
      )}
      <div style={{ position: 'relative', borderLeft: `3px solid ${borderColor}`, background: bg, borderRadius: '0 8px 8px 0', padding: '14px 44px 14px 16px' }}>
        <p style={{ color: '#e0e0e0', fontSize: '14px', lineHeight: 1.7, margin: 0, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{children}</p>
        <button onClick={handleCopy} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: '1px solid #252525', borderRadius: '6px', padding: '5px', cursor: 'pointer', color: copied ? '#00F0FF' : '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s' }}>
          <Icon name={copied ? 'check' : 'copy'} size={12} />
        </button>
      </div>
    </div>
  );
};

export default ScriptBlock;
