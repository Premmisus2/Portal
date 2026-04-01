'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import Logo from '@/components/shared/Logo';
import ProfileDropdown from '@/components/layout/ProfileDropdown';
import OpenersPanel from '@/components/scripts/OpenersPanel';
import HooksPanel from '@/components/scripts/HooksPanel';
import ObjectionsPanel from '@/components/scripts/ObjectionsPanel';
import MisstepsPanel from '@/components/scripts/MisstepsPanel';
import ClosePanel from '@/components/scripts/ClosePanel';
import NotesPad from '@/components/ui/NotesPad';

const SCRIPT_TABS = [
  { id: 'openers',    label: 'The Openers (Entry Matrices)', num: '1' },
  { id: 'hooks',      label: 'Verbatim Hooks',               num: '2' },
  { id: 'objections', label: 'Objection Handling',           num: '3' },
  { id: 'missteps',   label: 'Misstep Corrections',          num: '4' },
  { id: 'close',      label: 'The Pivot & Financial Close',  num: '5' },
];

interface ScriptsViewProps {
  scriptTab: string;
  setScriptTab: (tab: string) => void;
  userName: any;
  userEmail: any;
  onHome: any;
  onLogout: any;
  totalCloses: any;
  setTotalCloses: any;
  totalPoints: any;
  addClose: any;
  undoClose: any;
  repId: string | null;
  isDirector: boolean;
  onToggleSidebar: any;
  actuallyDirector: any;
  viewAsRep?: any;
  onToggleView?: any;
  shadowMode?: any;
  shadowRepName?: any;
  allReps?: any;
  enterShadow?: any;
  exitShadow?: any;
}

export default function ScriptsView({ scriptTab, setScriptTab, userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, actuallyDirector, viewAsRep, onToggleView, shadowMode, shadowRepName, allReps, enterShadow, exitShadow }: ScriptsViewProps) {
  const activeTab = scriptTab || 'openers';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleTabSelect = (id: string) => { setScriptTab(id); setSidebarOpen(false); };

  const renderPanel = () => {
    switch (activeTab) {
      case 'openers':    return <OpenersPanel />;
      case 'hooks':      return <HooksPanel />;
      case 'objections': return <ObjectionsPanel />;
      case 'missteps':   return <MisstepsPanel />;
      case 'close':      return <ClosePanel />;
      default:           return <OpenersPanel />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#000', paddingTop: shadowMode ? '40px' : 0 }}>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar no-print${sidebarOpen ? ' sidebar-open' : ''}`} style={{ display: 'flex', flexDirection: 'column', width: '228px', flexShrink: 0, borderRight: '1px solid #111', overflowY: 'auto', background: '#050505' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #111' }}>
          <Logo height={26} />
          <p style={{ color: '#333', fontSize: '9px', letterSpacing: '.2em', textTransform: 'uppercase', margin: '6px 0 0', fontWeight: 600 }}>Scripts</p>
        </div>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #0d0d0d' }}>
          <button className="btn-back" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={onHome}>
            <Icon name="chevron" size={12} /> Back to Home
          </button>
        </div>
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {SCRIPT_TABS.map(tab => (
            <button key={tab.id} onClick={() => handleTabSelect(tab.id)}
              className={activeTab === tab.id ? 'nav-active' : ''}
              style={{ width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: '7px', cursor: 'pointer', background: 'transparent', border: activeTab === tab.id ? '' : '2px solid transparent', display: 'flex', alignItems: 'flex-start', gap: '10px', transition: 'all .15s', outline: 'none', font: 'inherit' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.18em', flexShrink: 0, marginTop: '2px', color: activeTab === tab.id ? '#00F0FF' : '#333' }}>{tab.num}</span>
              <span style={{ fontSize: '11.5px', fontWeight: 600, lineHeight: 1.35, color: activeTab === tab.id ? '#00F0FF' : '#555' }}>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px 8px', borderTop: '1px solid #111' }}>
          <ProfileDropdown userName={userName} userEmail={userEmail} totalCloses={totalCloses} totalPoints={totalPoints} onLogout={onLogout} actuallyDirector={actuallyDirector} viewAsRep={viewAsRep} onToggleView={onToggleView} shadowMode={shadowMode} shadowRepName={shadowRepName} allReps={allReps} enterShadow={enterShadow} exitShadow={exitShadow} />
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile tab bar */}
        <div className="no-print mobile-tab-bar" style={{ display: 'none', padding: '8px 12px', borderBottom: '1px solid #111', background: '#050505', overflowX: 'auto', gap: '4px', flexShrink: 0 }}>
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} style={{ marginRight: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" /></svg>
          </button>
        </div>

        <main className="print-area section-main" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
          {renderPanel()}
          <NotesPad storageKey={`notes_scripts_${activeTab}`} />
        </main>
      </div>
    </div>
  );
}
