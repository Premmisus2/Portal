'use client';

import { useState, useMemo } from 'react';

interface Props {
  existingNames: string[];
  onClose: () => void;
}

const sanitizeNameForCode = (name: string): string =>
  name.trim().toUpperCase().split(/\s+/)[0]?.replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'REP';

export default function InviteRepModal({ existingNames, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'rep' | 'director'>('rep');
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    if (!name.trim()) return '';
    const stem = sanitizeNameForCode(name);
    const same = existingNames.filter(n =>
      sanitizeNameForCode(n || '') === stem
    ).length;
    const num = String(same + 1).padStart(2, '0');
    return `PMSS-${stem}-${num}`;
  }, [name, existingNames]);

  const inviteText = useMemo(() => {
    if (!code || !email) return '';
    return `You're invited to the Premmisus Sales Portal.\n\nSign-in URL: https://portal.premmisus.ca\nEmail: ${email}\nInvite code: ${code}\n\nOpen the URL, click Register, paste the invite code above, and create your password.`;
  }, [code, email]);

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: select text for manual copy
      alert('Copy failed. Code: ' + code);
    }
  };

  const copyInvite = async () => {
    if (!inviteText) return;
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert('Copy failed.');
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1100,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
  };

  const cardStyle: React.CSSProperties = {
    background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '12px',
    padding: '24px 26px', maxWidth: '480px', width: '100%',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', background: '#111', border: '1px solid #333',
    borderRadius: '6px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#fff' }}>Invite Rep</h2>
        <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#666', lineHeight: 1.6 }}>
          Generate an invite code and send it to the rep. They register at portal.premmisus.ca with their email + this code.
          The rep row is created when they complete registration.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#444', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '6px' }}>Rep Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Isaiah Romanow" style={inputStyle} autoFocus />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#444', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '6px' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="rep@premmisus.com" style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#444', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '6px' }}>Role</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['rep', 'director'] as const).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer',
                    border: `1px solid ${role === r ? (r === 'director' ? 'rgba(0,240,255,.4)' : '#2a2a2a') : '#1e1e1e'}`,
                    background: role === r ? (r === 'director' ? 'rgba(0,240,255,.08)' : '#1a1a1a') : 'transparent',
                    color: role === r ? (r === 'director' ? '#00F0FF' : '#fff') : '#666',
                    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em',
                  }}>
                  {r}
                </button>
              ))}
            </div>
            {role === 'director' && (
              <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#F59E0B' }}>
                Heads up: directors get full dashboard access including pending close approvals.
              </p>
            )}
          </div>

          {/* Generated code */}
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#444', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '6px' }}>Generated Invite Code</label>
            <div style={{
              padding: '14px 16px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px',
              fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', color: code ? '#00F0FF' : '#333', fontWeight: 700,
              letterSpacing: '.06em', textAlign: 'center',
            }}>
              {code || 'Enter rep name to generate'}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#444', lineHeight: 1.6 }}>
              Suffix increments automatically if a rep with the same first name already exists.
              Note: this code is not stored until the rep completes registration — there's no allow-list.
            </p>
          </div>

          {/* Copy buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button onClick={copyCode} disabled={!code}
              style={{
                flex: 1, padding: '10px', borderRadius: '6px', cursor: code ? 'pointer' : 'not-allowed',
                border: '1px solid rgba(0,240,255,.3)', background: 'rgba(0,240,255,.08)', color: '#00F0FF',
                fontSize: '12px', fontWeight: 700, opacity: code ? 1 : 0.4,
              }}>
              {copied ? '✓ Copied' : 'Copy code only'}
            </button>
            <button onClick={copyInvite} disabled={!code || !email}
              style={{
                flex: 1, padding: '10px', borderRadius: '6px', cursor: (code && email) ? 'pointer' : 'not-allowed',
                border: '1px solid rgba(34,197,94,.3)', background: 'rgba(34,197,94,.08)', color: '#22c55e',
                fontSize: '12px', fontWeight: 700, opacity: (code && email) ? 1 : 0.4,
              }}>
              Copy full invite
            </button>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #2a2a2a', background: 'transparent', color: '#888', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
