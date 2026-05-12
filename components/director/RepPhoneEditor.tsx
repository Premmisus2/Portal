'use client';

import { useState } from 'react';
import { supabase as sb } from '@/lib/supabase';

interface RepPhoneEditorProps {
  repId: string;
  currentPhone: string;
}

export default function RepPhoneEditor({ repId, currentPhone }: RepPhoneEditorProps) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(currentPhone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await sb.from('reps').update({ phone: phone || null }).eq('id', repId);
    setSaving(false);
    if (error) { alert('Failed to save phone: ' + error.message); return; }
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 0' }} onClick={e => e.stopPropagation()}>
      <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.1em', textTransform: 'uppercase', minWidth: '60px' }}>Phone</span>
      {editing ? (
        <>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+1234567890"
            style={{ flex: 1, maxWidth: '180px', padding: '5px 10px', background: 'var(--bg-sidebar-line)', border: '1px solid #333', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'JetBrains Mono,monospace', outline: 'none' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-glow-40)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--text-faint)')}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '4px 12px', borderRadius: '5px', cursor: 'pointer', border: '1px solid var(--accent-glow-30)', background: 'var(--accent-glow-08)', color: 'var(--accent-ink)', fontSize: '10px', fontWeight: 700, fontFamily: 'Inter,sans-serif' }}
          >
            {saving ? '...' : 'Save'}
          </button>
          <button
            onClick={() => { setEditing(false); setPhone(currentPhone); }}
            style={{ padding: '4px 8px', borderRadius: '5px', cursor: 'pointer', border: '1px solid #333', background: 'transparent', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 700, fontFamily: 'Inter,sans-serif' }}
          >
            &times;
          </button>
        </>
      ) : (
        <>
          <span style={{ fontSize: '12px', color: phone ? 'var(--text-secondary)' : 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>
            {phone || 'No phone set'}
          </span>
          <button
            onClick={() => setEditing(true)}
            style={{ padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '9px', fontWeight: 700, fontFamily: 'Inter,sans-serif', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-glow-30)'; e.currentTarget.style.color = 'var(--accent-ink)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            Edit
          </button>
          {saved && <span style={{ fontSize: '9px', color: '#22c55e', fontWeight: 700 }}>Saved</span>}
        </>
      )}
    </div>
  );
}
