'use client';

import TopBar from '@/components/layout/TopBar';
import Icon from '@/components/ui/Icon';

export default function TrainingView(props: any) {
  const { userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, shadowMode, actuallyDirector, viewAsRep, onToggleView, shadowRepName, allReps, enterShadow, exitShadow } = props;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', paddingTop: shadowMode ? '40px' : 0 }}>
      <TopBar title="Training" subtitle="SOPs & Coaching Resources"
        userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout} onPrint={() => {}}
        totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose}
        actuallyDirector={actuallyDirector} viewAsRep={viewAsRep} onToggleView={onToggleView}
        shadowMode={shadowMode} shadowRepName={shadowRepName} allReps={allReps} enterShadow={enterShadow} exitShadow={exitShadow} />
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px', padding: '40px 20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,240,255,.06)', border: '1px solid rgba(0,240,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Icon name="zap" size={28} />
          </div>
          <span className="tag" style={{ marginBottom: '16px', display: 'inline-block' }}>Coming Soon</span>
          <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '12px 0 16px', letterSpacing: '-.01em' }}>Training Hub</h2>
          <p style={{ color: '#555', fontSize: '14px', lineHeight: 1.65, margin: '0 0 24px' }}>
            Training materials, call recordings, and coaching resources are being built. This section will include video walkthroughs, SOP documentation, and the operator track pathway.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '320px', margin: '0 auto' }}>
            {[
              { label: 'Masterclass Videos', status: 'Building' },
              { label: 'Standard Operating Procedures', status: 'Building' },
              { label: 'Operator Track Pathway', status: 'Planned' },
              { label: 'Call Recording Library', status: 'Planned' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px' }}>
                <span style={{ color: '#888', fontSize: '13px', fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: item.status === 'Building' ? '#F59E0B' : '#444', fontFamily: 'JetBrains Mono, monospace' }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
