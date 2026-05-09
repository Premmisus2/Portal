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
      <div className="fadein" style={{ width: '100%', maxWidth: '480px', margin: '0 16px', background: '#0a0a0a', border: '1px solid rgba(0,240,255,.25)', borderRadius: '16px', boxShadow: '0 0 60px rgba(0,240,255,.08), 0 20px 60px rgba(0,0,0,.6)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F0FF', boxShadow: '0 0 10px rgba(0,240,255,.8)' }} />
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff', letterSpacing: '.02em' }}>What You Missed</span>
            </div>
            <button onClick={onDismiss} style={{ background: 'transparent', border: '1px solid #222', borderRadius: '6px', padding: '4px 10px', color: '#555', cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'Inter,sans-serif', transition: 'all .15s' }}>
              Dismiss
            </button>
          </div>
          {lastVisit && (
            <p style={{ margin: 0, fontSize: '11px', color: '#444', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.06em' }}>Since {new Date(lastVisit).toLocaleString()}</p>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>

          {/* Summary badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { label: 'Bookings', count: events.bookings.length, color: '#22c55e', bg: 'rgba(34,197,94,.08)', border: 'rgba(34,197,94,.25)' },
              { label: 'Callbacks', count: events.callbacks.length, color: '#F59E0B', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.25)' },
              { label: 'Handoffs', count: events.handoffs.length, color: '#00F0FF', bg: 'rgba(0,240,255,.08)', border: 'rgba(0,240,255,.25)' },
              { label: 'Calls', count: events.totalCalls, color: '#888', bg: 'rgba(255,255,255,.03)', border: '#1e1e1e' },
            ].map((b, i) => (
              <div key={i} style={{ background: b.bg, border: `1px solid ${b.border}`, borderRadius: '8px', padding: '10px 8px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 2px', fontSize: '22px', fontWeight: 900, color: b.color, fontFamily: 'JetBrains Mono, monospace' }}>{b.count}</p>
                <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#555' }}>{b.label}</p>
              </div>
            ))}
          </div>

          {/* Bookings */}
          {events.bookings.length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>New Bookings</p>
              {events.bookings.map((b: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(34,197,94,.04)', border: '1px solid rgba(34,197,94,.12)', borderRadius: '6px', marginBottom: '4px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#e0e0e0' }}>{b.business_name || b.leads?.business_name || b.company || 'Unknown'}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#555' }}>{b.reps?.name || b.rep_name || 'Unknown rep'}</p>
                  </div>
                  {b.created_at && <span style={{ fontSize: '10px', color: '#444', fontFamily: 'JetBrains Mono, monospace' }}>{fmtTime(b.created_at)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Callbacks */}
          {events.callbacks.length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#F59E0B', fontFamily: 'JetBrains Mono, monospace' }}>Callback Requests</p>
              {events.callbacks.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(245,158,11,.04)', border: '1px solid rgba(245,158,11,.12)', borderRadius: '6px', marginBottom: '4px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#e0e0e0' }}>{c.business_name || c.leads?.business_name || c.company || 'Unknown'}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#555' }}>{c.reps?.name || c.rep_name || 'Unknown rep'}</p>
                  </div>
                  {c.created_at && <span style={{ fontSize: '10px', color: '#444', fontFamily: 'JetBrains Mono, monospace' }}>{fmtTime(c.created_at)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Handoffs */}
          {events.handoffs.length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#00F0FF', fontFamily: 'JetBrains Mono, monospace' }}>Handoffs</p>
              {events.handoffs.map((h: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(0,240,255,.04)', border: '1px solid rgba(0,240,255,.12)', borderRadius: '6px', marginBottom: '4px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#e0e0e0' }}>{h.business_name || h.company || 'Unknown'}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#555' }}>{h.reps?.name || h.rep_name || 'Unknown rep'}</p>
                  </div>
                  {h.created_at && <span style={{ fontSize: '10px', color: '#444', fontFamily: 'JetBrains Mono, monospace' }}>{fmtTime(h.created_at)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'center' }}>
          <button onClick={onDismiss} style={{ padding: '8px 32px', background: 'rgba(0,240,255,.1)', border: '1px solid rgba(0,240,255,.3)', borderRadius: '8px', color: '#00F0FF', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all .15s', letterSpacing: '.04em' }}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
