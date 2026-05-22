'use client';

// SettingsContent — calendar sync + notifications toggles. Lives at
// /floor/settings. Locked 2026-05-21 (Slice 4).

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { regenerateIcalToken, getIcalStatus, type IcalStatus } from '@/features/calendar';

export default function SettingsContent() {
  const router = useRouter();
  const [repId, setRepId] = useState<string | null>(null);
  const [icalStatus, setIcalStatus] = useState<IcalStatus | null>(null);
  const [newIcalUrl, setNewIcalUrl] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [ccEnabled, setCcEnabled] = useState(false);
  const [savingCc, setSavingCc] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);

  const flash = (text: string, tone: 'success' | 'error' = 'success') => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      const { data: rep } = await supabase
        .from('reps')
        .select('id, cc_director_on_callbacks')
        .eq('auth_id', session.user.id)
        .single();
      if (!rep) {
        router.replace('/');
        return;
      }
      if (cancelled) return;
      setRepId(rep.id);
      setCcEnabled(!!rep.cc_director_on_callbacks);
      try {
        const status = await getIcalStatus(rep.id);
        if (!cancelled) setIcalStatus(status);
      } catch {
        if (!cancelled) setIcalStatus({ hasToken: false, rotatedAt: null });
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleRotate = useCallback(async () => {
    if (!repId) return;
    setRotating(true);
    try {
      const { url } = await regenerateIcalToken(repId);
      setNewIcalUrl(url);
      setIcalStatus({ hasToken: true, rotatedAt: new Date().toISOString() });
      flash('New calendar URL generated — copy it before navigating away.');
    } catch (e) {
      flash(`Failed: ${(e as Error).message}`, 'error');
    } finally {
      setRotating(false);
    }
  }, [repId]);

  const handleCopyUrl = useCallback(async () => {
    if (!newIcalUrl) return;
    try {
      await navigator.clipboard.writeText(newIcalUrl);
      flash('Copied to clipboard');
    } catch {
      flash('Copy failed — long-press the URL to copy manually', 'error');
    }
  }, [newIcalUrl]);

  const handleToggleCc = useCallback(async (next: boolean) => {
    if (!repId) return;
    const prev = ccEnabled;
    setCcEnabled(next);
    setSavingCc(true);
    const { error } = await supabase
      .from('reps')
      .update({ cc_director_on_callbacks: next })
      .eq('id', repId);
    setSavingCc(false);
    if (error) {
      setCcEnabled(prev);
      flash(`Update failed: ${error.message}`, 'error');
    } else {
      flash(next ? 'Director will be CC\'d on your callback reminders' : 'Director CC turned off');
    }
  }, [repId, ccEnabled]);

  return (
    <main style={{ background: '#000', minHeight: '100vh', color: '#fff', padding: '20px 24px 60px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#00F0FF', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/floor" style={{ color: '#888', textDecoration: 'none' }}>← FLOOR</a>
            <span style={{ color: '#1e1e1e' }}>|</span>
            <span>Settings</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>
            Sales Floor · Settings
          </h1>
        </div>

        {/* Calendar Sync card */}
        <section style={{ background: '#080808', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20, marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            📅 Calendar Sync
          </h2>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.55, marginBottom: 14 }}>
            Subscribe your phone's calendar app (Apple Calendar, Google Calendar) to your scheduled callbacks. Each callback shows as a 15-minute event in your timezone. Cancelled callbacks stay in the feed for 7 days so your calendar clears them on next poll.
          </p>

          {icalStatus?.hasToken && !newIcalUrl && (
            <div style={{ padding: 10, background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 8, marginBottom: 12, fontSize: 11, color: '#888', fontFamily: "'JetBrains Mono', monospace" }}>
              Token last rotated:{' '}
              <span style={{ color: '#ccc' }}>
                {icalStatus.rotatedAt ? new Date(icalStatus.rotatedAt).toLocaleString() : '—'}
              </span>
              <br />
              <span style={{ color: '#555', fontSize: 10 }}>
                The URL is shown only at generation time. Rotate below to get a fresh URL (old one stops working immediately).
              </span>
            </div>
          )}

          {newIcalUrl && (
            <div style={{ padding: 12, background: 'rgba(0,240,255,.04)', border: '1px solid rgba(0,240,255,.3)', borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.15em', textTransform: 'uppercase', color: '#00F0FF', marginBottom: 8 }}>
                YOUR CALENDAR URL — COPY NOW
              </div>
              <code style={{ display: 'block', padding: 10, background: '#000', borderRadius: 6, fontSize: 11, color: '#fff', wordBreak: 'break-all', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
                {newIcalUrl}
              </code>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCopyUrl}
                  style={{ background: '#00F0FF', color: '#000', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 800, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >📋 Copy URL</button>
                <button
                  onClick={() => setNewIcalUrl(null)}
                  style={{ background: 'transparent', color: '#888', border: '1px solid #1e1e1e', borderRadius: 6, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >Hide</button>
              </div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 8, lineHeight: 1.5 }}>
                Paste this into Apple Calendar (File → New Calendar Subscription) or Google Calendar (Other calendars → From URL). Apple refreshes ~5 min; Google refreshes every few hours.
              </div>
            </div>
          )}

          <button
            onClick={handleRotate}
            disabled={rotating}
            style={{
              background: rotating ? '#1e1e1e' : 'transparent',
              border: '1px solid rgba(0,240,255,.3)',
              color: '#00F0FF', borderRadius: 8,
              padding: '8px 16px', fontSize: 12, fontWeight: 700,
              letterSpacing: '.08em', textTransform: 'uppercase',
              cursor: rotating ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {rotating ? 'Generating…' : icalStatus?.hasToken ? '🔄 Regenerate URL' : '+ Generate URL'}
          </button>
        </section>

        {/* CC Director toggle card */}
        <section style={{ background: '#080808', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            🔔 Director CC on Callback Reminders
          </h2>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.55, marginBottom: 14 }}>
            When enabled, Elliott gets a CC SMS at T-30 minutes for each of your scheduled callbacks. Useful for high-stakes leads where director oversight matters; turn off for routine pipeline.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={ccEnabled}
              onChange={(e) => handleToggleCc(e.target.checked)}
              disabled={savingCc}
              style={{ width: 18, height: 18, accentColor: '#00F0FF', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, color: ccEnabled ? '#00F0FF' : '#ccc', fontWeight: 600 }}>
              {ccEnabled ? 'Director CC is ON' : 'Director CC is OFF'}
            </span>
            {savingCc && <span style={{ fontSize: 10, color: '#555', marginLeft: 6 }}>saving…</span>}
          </label>
        </section>
      </div>

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: '#0d0d0d',
            border: `1px solid ${toast.tone === 'error' ? 'rgba(255,68,68,.4)' : 'rgba(0,240,255,.4)'}`,
            borderRadius: 8, padding: '10px 16px',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
            color: toast.tone === 'error' ? '#ff6060' : '#00F0FF',
            boxShadow: '0 8px 32px rgba(0,0,0,.5)',
            letterSpacing: '.06em', textTransform: 'uppercase',
            maxWidth: 460, textAlign: 'center',
            zIndex: 1000,
          }}
        >
          {toast.text}
        </div>
      )}
    </main>
  );
}
