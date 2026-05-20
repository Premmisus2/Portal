'use client';

import TopBar from '@/components/layout/TopBar';
import SMSPanel from '@/components/outreach/SMSPanel';
import NotesPad from '@/components/ui/NotesPad';

const SMSView = ({ userName, userEmail, onHome, onLogout, onNav, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, actuallyDirector, viewAsRep, onToggleView, shadowMode, shadowRepName, allReps, enterShadow, exitShadow }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app)', paddingTop: shadowMode ? '40px' : 0 }}>
    <TopBar title="SMS Sequences" subtitle="Section 12 — Warm Leads Only"
      userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout} onPrint={() => {}}
      totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose} />
    <main className="print-area section-main" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
      {onNav && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'var(--accent-glow-06)', border: '1px solid var(--accent-glow-22)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Looking for live SMS conversations?</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Sequences here are the scripts. The Inbox is where the replies live.</p>
          </div>
          <button onClick={() => onNav('inbox')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'var(--accent-glow-15)',
              border: '1px solid var(--accent-glow-50)',
              color: 'var(--accent-ink)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'JetBrains Mono,monospace',
            }}>
            Open Inbox →
          </button>
        </div>
      )}
      <SMSPanel />
      <NotesPad storageKey="notes_sms" />
    </main>
  </div>
);

export default SMSView;
