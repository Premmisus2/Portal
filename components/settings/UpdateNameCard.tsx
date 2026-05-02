'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { reportClientError } from '@/lib/error-reporting';
import { audit, auditFromLocalStorage } from '@/lib/audit';
import SettingsSection from './SettingsSection';

interface Props {
  repId: string;
  currentName: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: '#0e0e0e', border: '1px solid #1f1f1f',
  borderRadius: '6px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif',
  outline: 'none',
};

export default function UpdateNameCard({ repId, currentName }: Props) {
  const [name, setName] = useState(currentName || '');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const dirty = name.trim() !== (currentName || '').trim() && name.trim().length > 0;

  const submit = async () => {
    if (!dirty) return;
    setErrMsg(null);
    setSuccess(false);
    setBusy(true);

    const trimmed = name.trim();
    const { error } = await supabase.from('reps').update({ name: trimmed }).eq('id', repId);
    setBusy(false);
    if (error) {
      reportClientError('UpdateNameCard.submit', error, { repId }, 'settings-auth-basics');
      setErrMsg('Failed to update name: ' + error.message);
      return;
    }

    try { localStorage.setItem('pmss_user', trimmed); } catch {}
    audit(auditFromLocalStorage({
      actionType: 'settings.name_updated',
      targetType: 'rep',
      targetId: repId,
      metadata: { from: currentName || null, to: trimmed },
    }));
    setSuccess(true);
  };

  return (
    <SettingsSection
      title="Display name"
      description="Shown in the dashboard, on call logs, and to other reps. Refresh the page to update the avatar in the top bar after saving."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input value={name} onChange={e => { setName(e.target.value); setSuccess(false); }}
          style={inputStyle} placeholder="Your name"
          onKeyDown={e => { if (e.key === 'Enter') submit(); }} />

        {errMsg && (
          <p style={{ margin: 0, fontSize: '11px', color: '#ff6060', fontFamily: 'Roboto, sans-serif' }}>
            {errMsg}
          </p>
        )}
        {success && (
          <p style={{ margin: 0, fontSize: '11px', color: '#22c55e', fontFamily: 'Roboto, sans-serif' }}>
            Saved. Refresh recommended to update the avatar.
          </p>
        )}

        <div>
          <button onClick={submit} disabled={busy || !dirty}
            style={{
              padding: '9px 18px', borderRadius: '6px',
              border: '1px solid rgba(0,240,255,.3)', background: 'rgba(0,240,255,.08)',
              color: '#00F0FF', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', opacity: (busy || !dirty) ? 0.5 : 1,
            }}>
            {busy ? 'Saving…' : 'Save name'}
          </button>
        </div>
      </div>
    </SettingsSection>
  );
}
