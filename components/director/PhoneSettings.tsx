'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Rep {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
}

export default function PhoneSettings() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase
      .from('reps')
      .select('id, name, email, role, phone')
      .order('created_at', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else if (data) setReps(data);
        setLoading(false);
      });
  }, []);

  const startEdit = (rep: Rep) => {
    setEditing(prev => ({ ...prev, [rep.id]: rep.phone || '' }));
  };

  const cancelEdit = (repId: string) => {
    setEditing(prev => { const n = { ...prev }; delete n[repId]; return n; });
  };

  const save = async (rep: Rep) => {
    const phone = editing[rep.id]?.trim() || null;
    setSaving(prev => ({ ...prev, [rep.id]: true }));
    const { error: err } = await supabase.from('reps').update({ phone }).eq('id', rep.id);
    setSaving(prev => ({ ...prev, [rep.id]: false }));
    if (err) { alert('Failed to save: ' + err.message); return; }
    setReps(prev => prev.map(r => r.id === rep.id ? { ...r, phone } : r));
    cancelEdit(rep.id);
    setSaved(prev => ({ ...prev, [rep.id]: true }));
    setTimeout(() => setSaved(prev => { const n = { ...prev }; delete n[rep.id]; return n; }), 2500);
  };

  if (loading) return (
    <p style={{ fontSize: '12px', color: '#444', padding: '20px 0' }}>Loading reps...</p>
  );

  if (error) return (
    <div style={{ padding: '14px 16px', background: 'rgba(255,96,96,.06)', border: '1px solid rgba(255,96,96,.2)', borderRadius: '10px' }}>
      <p style={{ margin: 0, fontSize: '12px', color: '#ff6060' }}>Failed to load reps: {error}</p>
    </div>
  );

  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: '#444', letterSpacing: '.12em', textTransform: 'uppercase' }}>Rep Phone Numbers</p>
      <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#555', lineHeight: 1.6 }}>
        Set each rep's number in E.164 format (+1XXXXXXXXXX). The Twilio dialer button only appears when a phone is set.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {reps.map(rep => (
          <div key={rep.id} style={{ padding: '14px 16px', background: '#080808', border: '1px solid #1a1a1a', borderRadius: '10px' }}>

            {/* Rep header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: rep.role === 'director' ? '#00F0FF' : '#fff' }}>
                  {rep.name || rep.email}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#444', fontFamily: 'JetBrains Mono, monospace' }}>
                  {rep.email}
                </p>
              </div>
              <span style={{
                fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px',
                background: rep.role === 'director' ? 'rgba(0,240,255,.08)' : 'rgba(255,255,255,.04)',
                border: `1px solid ${rep.role === 'director' ? 'rgba(0,240,255,.2)' : '#1e1e1e'}`,
                color: rep.role === 'director' ? '#00F0FF' : '#555',
                letterSpacing: '.1em', textTransform: 'uppercase',
              }}>
                {rep.role}
              </span>
            </div>

            {/* Phone row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#444', letterSpacing: '.1em', textTransform: 'uppercase', minWidth: '46px' }}>
                Phone
              </span>

              {editing[rep.id] !== undefined ? (
                <>
                  <input
                    type="tel"
                    value={editing[rep.id]}
                    onChange={e => setEditing(prev => ({ ...prev, [rep.id]: e.target.value }))}
                    placeholder="+1XXXXXXXXXX"
                    autoFocus
                    style={{ flex: 1, maxWidth: '200px', padding: '5px 10px', background: '#111', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,240,255,.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#333')}
                    onKeyDown={e => { if (e.key === 'Enter') save(rep); if (e.key === 'Escape') cancelEdit(rep.id); }}
                  />
                  <button
                    onClick={() => save(rep)}
                    disabled={saving[rep.id]}
                    style={{ padding: '5px 14px', borderRadius: '5px', cursor: 'pointer', border: '1px solid rgba(0,240,255,.3)', background: 'rgba(0,240,255,.08)', color: '#00F0FF', fontSize: '10px', fontWeight: 700, fontFamily: 'Inter, sans-serif', opacity: saving[rep.id] ? 0.6 : 1 }}>
                    {saving[rep.id] ? '...' : 'Save'}
                  </button>
                  <button
                    onClick={() => cancelEdit(rep.id)}
                    style={{ padding: '5px 8px', borderRadius: '5px', cursor: 'pointer', border: '1px solid #222', background: 'transparent', color: '#555', fontSize: '10px', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                    ×
                  </button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '13px', color: rep.phone ? '#bbb' : '#333', fontFamily: 'JetBrains Mono, monospace', flex: 1 }}>
                    {rep.phone || 'No phone set'}
                  </span>
                  {saved[rep.id] && (
                    <span style={{ fontSize: '9px', color: '#22c55e', fontWeight: 700 }}>Saved</span>
                  )}
                  {!rep.phone && (
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.25)', color: '#F59E0B', marginRight: '4px' }}>
                      Missing
                    </span>
                  )}
                  <button
                    onClick={() => startEdit(rep)}
                    style={{ padding: '3px 10px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #1e1e1e', background: 'transparent', color: '#555', fontSize: '9px', fontWeight: 700, fontFamily: 'Inter, sans-serif', transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,240,255,.3)'; e.currentTarget.style.color = '#00F0FF'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#555'; }}>
                    {rep.phone ? 'Edit' : 'Set'}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
