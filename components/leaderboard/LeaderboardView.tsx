'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TopBar from '@/components/layout/TopBar';

type Outcome =
  | 'booked_call'
  | 'discovery_completed'
  | 'callback_requested'
  | 'not_interested'
  | 'no_answer'
  | 'wrong_number'
  | 'voicemail'
  | string;

interface RepRow {
  id: string;
  name: string;
  role: 'rep' | 'director';
}

interface CallRow {
  rep_id: string;
  outcome: Outcome;
  duration_seconds?: number | null;
  created_at: string;
}

interface RepStat {
  rep_id: string;
  name: string;
  role: 'rep' | 'director';
  calls: number;
  connects: number;
  booked: number;
  discovery: number;
  callbacks: number;
  notInterested: number;
  wrongNumbers: number;
  conversion: number;
  score: number;
}

const NON_CONNECT: Outcome[] = ['no_answer', 'wrong_number', 'voicemail'];

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDate(iso: string, deltaDays: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function rankBadge(rank: number) {
  if (rank === 1) return { label: '1ST', bg: 'rgba(255,200,0,.12)', border: 'rgba(255,200,0,.45)', color: '#FFC800' };
  if (rank === 2) return { label: '2ND', bg: 'rgba(192,192,192,.10)', border: 'rgba(192,192,192,.4)', color: '#C0C0C0' };
  if (rank === 3) return { label: '3RD', bg: 'rgba(205,127,50,.10)', border: 'rgba(205,127,50,.4)', color: '#CD7F32' };
  return { label: `${rank}`, bg: 'rgba(0,240,255,.05)', border: '#1e1e1e', color: '#666' };
}

interface BroadcastResult {
  ok: boolean;
  dryRun?: boolean;
  onlyMe?: boolean;
  smsBody?: string;
  sent?: number;
  failed?: number;
  results?: Array<{ name: string; phone: string; ok: boolean; error?: string; sid?: string }>;
  recipients?: Array<{ name: string; phone: string }>;
  error?: string;
}

export default function LeaderboardView(props: any) {
  const actuallyDirector: boolean = !!props.actuallyDirector;
  const [date, setDate] = useState<string>(todayISO());
  const [reps, setReps] = useState<RepRow[]>([]);
  const [logs, setLogs] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function callBroadcast(mode: 'preview' | 'me' | 'all') {
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data?.session?.access_token) {
        setBroadcastResult({ ok: false, error: 'Not signed in.' });
        return;
      }
      const res = await fetch('/api/send-team-summary', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun: mode === 'preview', onlyMe: mode === 'me' }),
      });
      const json = await res.json();
      if (!res.ok) {
        setBroadcastResult({ ok: false, error: json?.error || `HTTP ${res.status}` });
      } else {
        setBroadcastResult({ ok: true, ...json });
      }
    } catch (e: any) {
      setBroadcastResult({ ok: false, error: e?.message || 'Request failed' });
    } finally {
      setBroadcasting(false);
      setConfirmOpen(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const start = `${date}T00:00:00`;
        const end = `${date}T23:59:59.999`;
        const [repsRes, logsRes] = await Promise.all([
          supabase.from('reps').select('id,name,role').order('name', { ascending: true }),
          supabase
            .from('call_logs')
            .select('rep_id,outcome,duration_seconds,created_at')
            .gte('created_at', start)
            .lte('created_at', end),
        ]);
        if (cancelled) return;
        if (repsRes.error) throw repsRes.error;
        if (logsRes.error) throw logsRes.error;
        setReps((repsRes.data || []) as RepRow[]);
        setLogs((logsRes.data || []) as CallRow[]);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Failed to load leaderboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const stats: RepStat[] = useMemo(() => {
    const activeReps = reps;
    const byRep: Record<string, CallRow[]> = {};
    for (const l of logs) (byRep[l.rep_id] ||= []).push(l);

    const rows = activeReps.map<RepStat>(r => {
      const own = byRep[r.id] || [];
      const calls = own.length;
      const connects = own.filter(l => !NON_CONNECT.includes(l.outcome)).length;
      const booked = own.filter(l => l.outcome === 'booked_call').length;
      const discovery = own.filter(l => l.outcome === 'discovery_completed').length;
      const callbacks = own.filter(l => l.outcome === 'callback_requested').length;
      const notInterested = own.filter(l => l.outcome === 'not_interested').length;
      const wrongNumbers = own.filter(l => l.outcome === 'wrong_number').length;
      const conversion = calls > 0 ? Math.round(((booked + discovery) / calls) * 100) : 0;
      // Ranking score: bookings weighted heaviest, then discoveries, callbacks, calls.
      const score = booked * 100 + discovery * 60 + callbacks * 15 + calls;
      return {
        rep_id: r.id,
        name: r.name,
        role: r.role,
        calls,
        connects,
        booked,
        discovery,
        callbacks,
        notInterested,
        wrongNumbers,
        conversion,
        score,
      };
    });

    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.calls !== a.calls) return b.calls - a.calls;
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [reps, logs]);

  const totals = useMemo(() => {
    return stats.reduce(
      (acc, s) => {
        acc.calls += s.calls;
        acc.connects += s.connects;
        acc.booked += s.booked;
        acc.discovery += s.discovery;
        acc.callbacks += s.callbacks;
        return acc;
      },
      { calls: 0, connects: 0, booked: 0, discovery: 0, callbacks: 0 }
    );
  }, [stats]);

  const isToday = date === todayISO();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000' }}>
      <TopBar
        title="Leaderboard"
        subtitle={isToday ? 'Live — today' : `Snapshot — ${date}`}
        {...props}
      />

      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 100px', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <span className="tag">DAILY STANDUP</span>
            <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#fff', margin: '8px 0 4px', letterSpacing: '-.01em' }}>
              {isToday ? "Today's Leaderboard" : `Leaderboard — ${date}`}
            </h2>
            <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
              Calls, bookings, discoveries, and callbacks per rep. Updated live.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'JetBrains Mono, monospace' }}>
            <button
              onClick={() => setDate(d => shiftDate(d, -1))}
              style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#aaa', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
              aria-label="Previous day"
            >
              ←
            </button>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={e => setDate(e.target.value || todayISO())}
              style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', colorScheme: 'dark' }}
            />
            <button
              onClick={() => setDate(d => (d >= todayISO() ? d : shiftDate(d, 1)))}
              disabled={date >= todayISO()}
              style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', color: date >= todayISO() ? '#333' : '#aaa', padding: '6px 10px', borderRadius: '6px', cursor: date >= todayISO() ? 'not-allowed' : 'pointer', fontSize: '12px' }}
              aria-label="Next day"
            >
              →
            </button>
            {!isToday && (
              <button
                onClick={() => setDate(todayISO())}
                style={{ background: 'rgba(0,240,255,.08)', border: '1px solid rgba(0,240,255,.3)', color: '#00F0FF', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '.1em' }}
              >
                TODAY
              </button>
            )}
          </div>
        </div>

        {/* Team totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' }}>
          {[
            { label: 'Calls', value: totals.calls, color: '#fff' },
            { label: 'Connects', value: totals.connects, color: '#aaa' },
            { label: 'Booked', value: totals.booked, color: '#22c55e' },
            { label: 'Discovery', value: totals.discovery, color: '#00F0FF' },
            { label: 'Callbacks', value: totals.callbacks, color: '#F59E0B' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#070707', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '14px 16px' }}>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', color: '#444', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>{stat.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 900, color: stat.color, fontFamily: 'JetBrains Mono, monospace' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Director: test broadcast controls */}
        {actuallyDirector && isToday && (
          <div style={{ background: '#070707', border: '1px solid rgba(0,240,255,.18)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: broadcastResult ? '12px' : 0 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '.15em', color: '#00F0FF', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>Director Console</p>
                <p style={{ margin: '4px 0 0', color: '#888', fontSize: '12px' }}>
                  Dry-run the daily standup SMS. The cron auto-sends it at 7PM ET (Mon–Fri).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => callBroadcast('preview')}
                  disabled={broadcasting}
                  style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#aaa', padding: '8px 14px', borderRadius: '6px', cursor: broadcasting ? 'wait' : 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  Preview
                </button>
                <button
                  onClick={() => callBroadcast('me')}
                  disabled={broadcasting}
                  style={{ background: 'rgba(0,240,255,.06)', border: '1px solid rgba(0,240,255,.3)', color: '#00F0FF', padding: '8px 14px', borderRadius: '6px', cursor: broadcasting ? 'wait' : 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  Send to Me
                </button>
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={broadcasting}
                  style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.4)', color: '#F59E0B', padding: '8px 14px', borderRadius: '6px', cursor: broadcasting ? 'wait' : 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  Send to Team
                </button>
              </div>
            </div>

            {broadcasting && (
              <p style={{ margin: '8px 0 0', color: '#666', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>Sending…</p>
            )}

            {broadcastResult && (
              <div style={{ marginTop: '4px', borderTop: '1px solid #111', paddingTop: '12px' }}>
                {!broadcastResult.ok ? (
                  <p style={{ margin: 0, color: '#ff8888', fontSize: '13px' }}>Error: {broadcastResult.error}</p>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '.15em', color: '#666', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                      {broadcastResult.dryRun
                        ? `Preview (${broadcastResult.recipients?.length ?? 0} recipient${broadcastResult.recipients?.length === 1 ? '' : 's'} — nothing sent)`
                        : `Sent: ${broadcastResult.sent} · Failed: ${broadcastResult.failed}`}
                    </p>
                    {broadcastResult.smsBody && (
                      <pre style={{ margin: '8px 0 0', padding: '10px 12px', background: '#000', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ddd', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{broadcastResult.smsBody}</pre>
                    )}
                    {!broadcastResult.dryRun && broadcastResult.results && broadcastResult.results.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {broadcastResult.results.map(r => (
                          <div key={`${r.name}-${r.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                            <span style={{ color: r.ok ? '#22c55e' : '#ff5555', fontWeight: 800, minWidth: '14px' }}>{r.ok ? '✓' : '✗'}</span>
                            <span style={{ color: '#fff' }}>{r.name}</span>
                            <span style={{ color: '#555' }}>{r.phone}</span>
                            {!r.ok && <span style={{ color: '#ff8888' }}>— {r.error}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {broadcastResult.dryRun && broadcastResult.recipients && (
                      <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {broadcastResult.recipients.map(r => (
                          <span key={`${r.name}-${r.phone}`} style={{ fontSize: '11px', color: '#aaa', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: '4px', padding: '3px 8px', fontFamily: 'JetBrains Mono, monospace' }}>{r.name} {r.phone}</span>
                        ))}
                        {broadcastResult.recipients.length === 0 && (
                          <span style={{ fontSize: '12px', color: '#F59E0B' }}>⚠ No reps have phone numbers set yet — set them in Director Dashboard → Reps.</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Confirm modal — Send to Team */}
        {confirmOpen && (
          <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600, padding: '20px' }}>
            <div style={{ background: '#0a0a0a', border: '1px solid rgba(245,158,11,.4)', borderRadius: '10px', padding: '24px', maxWidth: '440px', width: '100%' }}>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '.15em', color: '#F59E0B', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>Confirm Broadcast</p>
              <h3 style={{ margin: '8px 0 12px', fontSize: '20px', color: '#fff', fontWeight: 800 }}>Send the standup SMS to every rep right now?</h3>
              <p style={{ margin: 0, color: '#888', fontSize: '13px', lineHeight: 1.5 }}>
                Every active rep with a phone number on file will receive the SMS immediately, including yourself.
                The body is prefixed with [Premmisus TEST] so reps know it's a dry run.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={broadcasting}
                  style={{ background: 'transparent', border: '1px solid #1e1e1e', color: '#aaa', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => callBroadcast('all')}
                  disabled={broadcasting}
                  style={{ background: '#F59E0B', border: '1px solid #F59E0B', color: '#000', padding: '8px 16px', borderRadius: '6px', cursor: broadcasting ? 'wait' : 'pointer', fontSize: '12px', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {broadcasting ? 'Sending…' : 'Send Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {err && (
          <div style={{ background: 'rgba(255,68,68,.08)', border: '1px solid rgba(255,68,68,.3)', borderRadius: '8px', padding: '12px 14px', color: '#ff8888', fontSize: '13px', marginBottom: '16px' }}>
            {err}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#444', fontSize: '12px', letterSpacing: '.15em', textTransform: 'uppercase' }}>Loading…</div>
        ) : stats.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#444', fontSize: '13px' }}>No active reps found.</div>
        ) : (
          <div style={{ background: '#070707', border: '1px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
            <div className="leaderboard-grid" style={{ display: 'grid', gridTemplateColumns: '60px 1.4fr repeat(5, 1fr) 0.9fr', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1a1a1a', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: '#444', letterSpacing: '.15em', textTransform: 'uppercase' }}>
              <div>#</div>
              <div>Rep</div>
              <div style={{ textAlign: 'right' }}>Calls</div>
              <div style={{ textAlign: 'right' }}>Connects</div>
              <div style={{ textAlign: 'right' }}>Booked</div>
              <div style={{ textAlign: 'right' }}>Discovery</div>
              <div style={{ textAlign: 'right' }}>Callbacks</div>
              <div style={{ textAlign: 'right' }}>Conv %</div>
            </div>

            {stats.map((s, i) => {
              const rank = i + 1;
              const badge = rankBadge(rank);
              const inactive = s.calls === 0;
              return (
                <div
                  key={s.rep_id}
                  className="leaderboard-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1.4fr repeat(5, 1fr) 0.9fr',
                    alignItems: 'center',
                    padding: '14px 16px',
                    borderBottom: '1px solid #111',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '14px',
                    color: inactive ? '#444' : '#fff',
                    background: rank === 1 && !inactive ? 'linear-gradient(90deg, rgba(255,200,0,.04), transparent 60%)' : 'transparent',
                  }}
                >
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '32px', padding: '3px 8px', borderRadius: '4px', background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, fontSize: '10px', fontWeight: 800, letterSpacing: '.1em' }}>{badge.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ color: inactive ? '#555' : '#fff', fontWeight: 700, fontFamily: 'Inter, sans-serif', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                    {s.role === 'director' && (
                      <span style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '.15em', color: '#00F0FF', background: 'rgba(0,240,255,.08)', border: '1px solid rgba(0,240,255,.25)', borderRadius: '3px', padding: '1px 5px' }}>DIR</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>{s.calls}</div>
                  <div style={{ textAlign: 'right', color: inactive ? '#444' : '#aaa' }}>{s.connects}</div>
                  <div style={{ textAlign: 'right', color: s.booked > 0 ? '#22c55e' : inactive ? '#444' : '#666', fontWeight: s.booked > 0 ? 800 : 400 }}>{s.booked}</div>
                  <div style={{ textAlign: 'right', color: s.discovery > 0 ? '#00F0FF' : inactive ? '#444' : '#666', fontWeight: s.discovery > 0 ? 800 : 400 }}>{s.discovery}</div>
                  <div style={{ textAlign: 'right', color: s.callbacks > 0 ? '#F59E0B' : inactive ? '#444' : '#666', fontWeight: s.callbacks > 0 ? 800 : 400 }}>{s.callbacks}</div>
                  <div style={{ textAlign: 'right', color: inactive ? '#444' : '#aaa' }}>{s.calls > 0 ? `${s.conversion}%` : '—'}</div>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ marginTop: '20px', fontSize: '11px', color: '#333', textAlign: 'center', letterSpacing: '.1em', fontFamily: 'JetBrains Mono, monospace' }}>
          A team SMS goes out at 6PM ET (Mon–Fri) with these numbers. Auto-summary via Premmisus Nerve Center.
        </p>
      </main>

      <style jsx>{`
        @media (max-width: 720px) {
          :global(.leaderboard-grid) {
            grid-template-columns: 40px 1.2fr repeat(5, 1fr) 0.7fr !important;
            font-size: 12px !important;
            padding: 10px 8px !important;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
}
