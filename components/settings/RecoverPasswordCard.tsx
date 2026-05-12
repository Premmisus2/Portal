'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { reportClientError } from '@/lib/error-reporting';
import SettingsSection from './SettingsSection';

interface Props {
  userEmail: string;
}

export default function RecoverPasswordCard({ userEmail }: Props) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const send = async () => {
    setErrMsg(null);
    setBusy(true);
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, redirectTo ? { redirectTo } : undefined);
    setBusy(false);
    if (error) {
      reportClientError('RecoverPasswordCard.send', error, { email: userEmail }, 'settings-auth-basics');
      setErrMsg('Failed to send reset email: ' + error.message);
      return;
    }
    setSent(true);
  };

  return (
    <SettingsSection
      title="Recover password"
      description="Send a password reset link to your email. The link lands on the portal home page — once you're back in, use Change Password above to set a new one."
    >
      {sent ? (
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--green)', fontFamily: 'Roboto, sans-serif' }}>
          Reset email sent to <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)' }}>{userEmail}</span>. Check your inbox (and spam folder).
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {errMsg && (
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--red)', fontFamily: 'Roboto, sans-serif' }}>
              {errMsg}
            </p>
          )}
          <div>
            <button onClick={send} disabled={busy}
              style={{
                padding: '9px 18px', borderRadius: '6px',
                border: '1px solid var(--text-faint)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', opacity: busy ? 0.5 : 1,
              }}>
              {busy ? 'Sending…' : `Send reset email to ${userEmail}`}
            </button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
