'use client';

import Icon from '@/components/ui/Icon';
import ClosesTracker from '@/components/shared/ClosesTracker';
import ProfileDropdown from '@/components/layout/ProfileDropdown';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function TopBar({ title, subtitle, userName, userEmail, onHome, onLogout, onPrint, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, onShortcuts, onSettings, onToggleSidebar, actuallyDirector, viewAsRep, onToggleView, shadowMode, shadowRepName, allReps, enterShadow, exitShadow }: any) {
  return (
    <header className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 24px', borderBottom: '1px solid var(--bg-sidebar-line)', background: 'var(--bg-nav)', flexShrink: 0, gap: '8px', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
        <button className="btn-back" onClick={onHome} style={{ flexShrink: 0 }}>
          <Icon name="chevron" size={13} /> Home
        </button>
        <div style={{ width: '1px', height: '22px', background: 'var(--border-soft)', flexShrink: 0 }} className="mobile-hide" />
        <div className="top-bar-title" style={{ minWidth: '120px' }}>
          <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
          <p style={{ margin: 0, color: 'var(--text-faint)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="closes-tracker-full"><ClosesTracker totalCloses={totalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose} /></div>
        <div className="closes-tracker-mini" style={{ display: 'none', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', minWidth: '22px', textAlign: 'center' }}>{totalCloses} <span style={{ color: 'var(--text-faint)', fontSize: '10px' }}>cls</span></span>
        </div>
        <div style={{ width: '1px', height: '22px', background: 'var(--border-soft)' }} className="mobile-hide" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }} className="mobile-hide">
          <div className="pulse" />
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{userName}</span>
        </div>
        <ThemeToggle />
        {onPrint && <button onClick={onPrint} className="btn-pdf mobile-hide"><Icon name="download" size={13} />Download PDF</button>}
        {actuallyDirector && (
          <a
            href="https://command.premmisus.ca/cron-health"
            target="_blank"
            rel="noreferrer"
            className="mobile-hide"
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: 'var(--accent-ink)',
              border: '1px solid var(--accent)',
              padding: '4px 9px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            title="Open Cron Health in Command Center"
          >
            Cron Health ↗
          </a>
        )}
        <ProfileDropdown userName={userName} userEmail={userEmail} totalCloses={totalCloses} totalPoints={totalPoints} onLogout={onLogout} onShortcuts={onShortcuts} onSettings={onSettings} actuallyDirector={actuallyDirector} viewAsRep={viewAsRep} onToggleView={onToggleView} shadowMode={shadowMode} shadowRepName={shadowRepName} allReps={allReps} enterShadow={enterShadow} exitShadow={exitShadow} />
      </div>
    </header>
  );
}
