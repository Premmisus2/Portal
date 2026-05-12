'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { reportClientError } from '@/lib/error-reporting';
import { audit, auditFromLocalStorage } from '@/lib/audit';
import SettingsSection from './SettingsSection';

interface Props {
  userEmail: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: 'var(--bg-elev-1)', border: '1px solid var(--border)',
  borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-faint)',
  letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '6px',
};

export default function ChangePasswordCard({ userEmail }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const submit = async () => {
    setErrMsg(null);
    setSuccess(false);

    if (next.length < 8) { setErrMsg('New password must be at least 8 characters.'); return; }
    if (next !== confirm) { setErrMsg('New password and confirmation do not match.'); return; }
    if (next === current) { setErrMsg('New password must be different from current.'); return; }

    setBusy(true);

    // Verify current password by signing in with it
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: userEmail, password: current,
    });
    if (signInErr) {
      setBusy(false);
      reportClientError('ChangePasswordCard.verifyCurrent', signInErr, { email: userEmail }, 'settings-auth-basics');
      setErrMsg('Current password is incorrect.');
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (updateErr) {
      reportClientError('ChangePasswordCard.updateUser', updateErr, { email: userEmail }, 'settings-auth-basics');
      setErrMsg('Failed to update password: ' + updateErr.message);
      return;
    }

    setCurrent(''); setNext(''); setConfirm('');
    audit(auditFromLocalStorage({
      actionType: 'settings.password_changed',
      targetType: 'self',
      metadata: { email: userEmail },
    }));
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
  };

  return (
    <SettingsSection
      title="Change password"
      description="Use a strong password (8+ characters). You'll stay signed in on this device after changing."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Current password</label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
            style={inputStyle} autoComplete="current-password" />
        </div>
        <div>
          <label style={labelStyle}>New password</label>
          <input type="password" value={next} onChange={e => setNext(e.target.value)}
            style={inputStyle} autoComplete="new-password" />
        </div>
        <div>
          <label style={labelStyle}>Confirm new password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            style={inputStyle} autoComplete="new-password"
            onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        </div>

        {errMsg && (
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--red)', fontFamily: 'Roboto, sans-serif' }}>
            {errMsg}
          </p>
        )}
        {success && (
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--green)', fontFamily: 'Roboto, sans-serif' }}>
            Password updated.
          </p>
        )}

        <div>
          <button onClick={submit} disabled={busy || !current || !next || !confirm}
            style={{
              padding: '9px 18px', borderRadius: '6px',
              border: '1px solid var(--accent-glow-30)', background: 'var(--accent-glow-08)',
              color: 'var(--accent-ink)', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              opacity: (busy || !current || !next || !confirm) ? 0.5 : 1,
            }}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </div>
    </SettingsSection>
  );
}
