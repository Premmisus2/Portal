'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { reportClientError } from '@/lib/error-reporting';
import { audit, auditFromLocalStorage } from '@/lib/audit';
import SettingsSection from './SettingsSection';

export default function SignOutAllCard() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const signOutAll = async () => {
    setBusy(true);
    // Fire audit BEFORE the signOut — once the session is invalidated,
    // the authenticated_insert RLS path won't accept the row.
    await audit(auditFromLocalStorage({
      actionType: 'auth.signed_out_all',
      targetType: 'self',
    }));
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      setBusy(false);
      reportClientError('SignOutAllCard.signOutAll', error, undefined, 'settings-auth-basics');
      alert('Failed to sign out everywhere: ' + error.message);
      return;
    }
    try { localStorage.removeItem('pmss_user'); localStorage.removeItem('pmss_email'); localStorage.removeItem('pmss_view'); } catch {}
    window.location.href = '/';
  };

  return (
    <SettingsSection
      title="Sign out everywhere"
      description="Ends every active session for your account — every browser, every phone, every tab. You'll need to sign in again here too."
    >
      <div>
        <button onClick={() => setConfirming(true)} disabled={busy}
          style={{
            padding: '9px 18px', borderRadius: '6px',
            border: '1px solid rgba(255,96,96,.35)', background: 'rgba(255,96,96,.08)',
            color: '#ff6060', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', opacity: busy ? 0.5 : 1,
          }}>
          Sign out everywhere
        </button>
      </div>

      {confirming && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: '12px',
            padding: '22px 24px', maxWidth: '420px', width: '100%',
          }}>
            <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
              Sign out of every device?
            </p>
            <p style={{ margin: '0 0 18px', fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.6, fontFamily: 'Roboto, sans-serif' }}>
              Every active session for your account ends immediately — every browser, every phone, every tab including this one. You will need to sign in again to keep working.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirming(false)} disabled={busy}
                style={{
                  padding: '8px 16px', borderRadius: '6px',
                  border: '1px solid #2a2a2a', background: 'transparent',
                  color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}>
                Cancel
              </button>
              <button onClick={signOutAll} disabled={busy}
                style={{
                  padding: '8px 16px', borderRadius: '6px',
                  border: '1px solid rgba(255,96,96,.55)', background: 'rgba(255,96,96,.18)',
                  color: '#ff8080', fontSize: '11px', fontWeight: 800, cursor: busy ? 'wait' : 'pointer',
                  fontFamily: 'Inter, sans-serif', opacity: busy ? 0.6 : 1,
                }}>
                {busy ? 'Signing out…' : 'Sign out everywhere'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
