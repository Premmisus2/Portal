'use client';

import { useEffect } from 'react';
import SettingsView from './SettingsView';

interface Props {
  userName: string;
  userEmail: string;
  repId: string;
  isDirector: boolean;
  onClose: () => void;
}

export default function SettingsModal({ userName, userEmail, repId, isDirector, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 600,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px',
      overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#060606', border: '1px solid var(--border)', borderRadius: '14px',
        padding: '28px 32px', maxWidth: '760px', width: '100%',
        boxShadow: '0 0 60px var(--accent-glow-06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
          <div>
            <span className="tag" style={{ marginBottom: '8px', display: 'inline-block' }}>Settings</span>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-.02em', fontFamily: 'Inter, sans-serif' }}>
              Account & Security
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-faint)', letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
              {userEmail}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close settings"
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
              padding: '6px 12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px',
            }}>
            ✕
          </button>
        </div>

        <SettingsView
          userName={userName} userEmail={userEmail} repId={repId}
          isDirector={isDirector} embedded
        />
      </div>
    </div>
  );
}
