'use client';

import Icon from '@/components/ui/Icon';

interface NotificationPopupProps {
  events: {
    bookings: any[];
    callbacks: any[];
    handoffs: any[];
    totalCalls: number;
  };
  lastVisit: string | null;
  onDismiss: () => void;
}

export default function NotificationPopup({ events, lastVisit, onDismiss }: NotificationPopupProps) {
  if (!events) return null;
  const total = events.bookings.length + events.callbacks.length + events.handoffs.length;
  if (total === 0 && events.totalCalls === 0) return null;

  const fmtTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 3600000) return Math.floor(diffMs / 60000) + 'm ago';
    if (diffMs < 86400000) return Math.floor(diffMs / 3600000) + 'h ago';
    return date.toLocaleDateString(undefined, { timeZone: 'America/Toronto' });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="fadein" style={{ width: '100%', maxWidth: '480px', margin: '0 16px', background: 'var(--bg-elev-pill)', border: '1px solid var(--accent-glow-25)', borderRadius: '16px', boxShadow: '0 0 60px var(--accent-glow-08), 0 20px 60px rgba(0,0,0,.6)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-ink)', boxShadow: '0 0 10px var(--accent-glow-80)' }} />
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '.02em' }}>What You Missed</span>
            </div>
            <button onClick={onDismiss} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'Inter,sans-serif', transition: 'all .15s' }}>
              Dismiss
            </button>
          </div>
          {lastVisit && (
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.06em' }}>Since {new Date(lastVisit).toLocaleString()}</p>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>

          {/* Summary badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { label: 'Bookings', count: events.bookings.length, color: 'var(--green)', bg: 'rgba(34,197,94,.08)', border: 'rgba(34,197,94,.25)' },
              { label: 'Callbacks', count: events.callbacks.length, color: 'var(--amber)', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.25)' },
              { label: 'Handoffs', count: events.handoffs.length, color: 'var(--accent-ink)', bg: 'var(--accent-glow-08)', border: 'var(--accent-glow-25)' },
              { label: 'Calls', count: events.totalCalls, color: 'var(--text-tertiary)', bg: 'rgba(255,255,255,.03)', border: 'var(--border)' },
            ].map((b, i) => (
              <div key={i} style={{ background: b.bg, border: `1px solid ${b.border}`, borderRadius: '8px', padding: '10px 8px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 2px', fontSize: '22px', fontWeight: 900, color: b.color, fontFamily: 'JetBrains Mono, monospace' }}>{b.count}</p>
                <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{b.label}</p>
              </div>
            ))}
          </div>

          {/* Bookings */}
          {events.bookings.length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>New Bookings</p>
              {events.bookings.map((b: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(34,197,94,.04)', border: '1px solid rgba(34,197,94,.12)', borderRadius: '6px', marginBottom: '4px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{b.business_name || b.leads?.business_name || b.company || 'Unknown'}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>{b.reps?.name || b.rep_name || 'Unknown rep'}</p>
                  </div>
                  {b.created_at && <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtTime(b.created_at)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Callbacks */}
          {events.callbacks.length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>Callback Requests</p>
              {events.callbacks.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(245,158,11,.04)', border: '1px solid rgba(245,158,11,.12)', borderRadius: '6px', marginBottom: '4px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.business_name || c.leads?.business_name || c.company || 'Unknown'}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>{c.reps?.name || c.rep_name || 'Unknown rep'}</p>
                  </div>
                  {c.created_at && <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtTime(c.created_at)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Handoffs */}
          {events.handoffs.length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent-ink)', fontFamily: 'JetBrains Mono, monospace' }}>Handoffs</p>
              {events.handoffs.map((h: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--accent-glow-04)', border: '1px solid var(--accent-glow-12)', borderRadius: '6px', marginBottom: '4px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{h.business_name || h.company || 'Unknown'}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>{h.reps?.name || h.rep_name || 'Unknown rep'}</p>
                  </div>
                  {h.created_at && <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtTime(h.created_at)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'center' }}>
          <button onClick={onDismiss} style={{ padding: '8px 32px', background: 'var(--accent-glow-10)', border: '1px solid var(--accent-glow-30)', borderRadius: '8px', color: 'var(--accent-ink)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all .15s', letterSpacing: '.04em' }}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
