'use client';

const KbdKey = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '28px', height: '24px', padding: '0 6px',
    background: '#0e0e0e', border: '1px solid #2a2a2a',
    borderBottom: '2px solid #333', borderRadius: '5px',
    fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)',
    fontFamily: 'Inter, monospace', letterSpacing: '.05em',
    boxShadow: '0 1px 3px rgba(0,0,0,.5)',
  }}>{children}</span>
);

const ShortcutRow = ({ keys, label, color }: { keys: string[]; label: string; color?: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid #0e0e0e' }}>
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0, minWidth: '80px' }}>
      {keys.map((k, i) => <KbdKey key={i}>{k}</KbdKey>)}
    </div>
    <span style={{ fontSize: '12px', color: color || 'var(--text-muted)', fontWeight: 500, letterSpacing: '.04em' }}>{label}</span>
  </div>
);

export default function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#060606', border: '1px solid var(--border)', borderRadius: '18px',
        padding: '28px 32px', maxWidth: '560px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 0 60px var(--accent-glow-06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div>
            <span className="tag" style={{ marginBottom: '8px', display: 'inline-block' }}>Reference Card</span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-.02em' }}>Keyboard Shortcuts</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-faint)', fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase' }}>Premmisus Sales Command</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '12px', fontFamily: 'Inter,sans-serif', fontWeight: 600 }}>✕ Close</button>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '3px', height: '14px', background: 'var(--text-muted)', borderRadius: '2px' }} />
            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Global — Works Anywhere</span>
          </div>
          <ShortcutRow keys={['Esc']} label="Return to Home" color="#888" />
          <ShortcutRow keys={['H']} label="Return to Home" color="#888" />
          <ShortcutRow keys={['?']} label="Open / close this cheat sheet" color="#888" />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '3px', height: '14px', background: 'var(--accent-ink)', borderRadius: '2px' }} />
            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--accent-ink)' }}>From Home — Jump to Section</span>
          </div>
          <ShortcutRow keys={['⇧', '1']} label="Call Center" color="#ccc" />
          <ShortcutRow keys={['⇧', '2']} label="Scripts & Sequences" color="#ccc" />
          <ShortcutRow keys={['⇧', '3']} label="Foundation & Blueprint" color="#ccc" />
          <ShortcutRow keys={['⇧', '4']} label="Written Outreach (DMs)" color="#ccc" />
          <ShortcutRow keys={['⇧', '5']} label="Post-Call Protocols" color="#ccc" />
          <ShortcutRow keys={['⇧', '6']} label="The Ladder" color="#ccc" />
          <ShortcutRow keys={['⇧', '7']} label="Director Handoff" color="#ccc" />
          <ShortcutRow keys={['⇧', '8']} label="AI Tools" color="#ccc" />
          <ShortcutRow keys={['⇧', '9']} label="Director Dashboard" color="#ccc" />
        </div>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '3px', height: '14px', background: '#F59E0B', borderRadius: '2px' }} />
            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: '#F59E0B' }}>Inside Scripts — Switch Tab</span>
          </div>
          <ShortcutRow keys={['⇧', '1']} label="Openers" color="#FCD34D" />
          <ShortcutRow keys={['⇧', '2']} label="Hooks" color="#FCD34D" />
          <ShortcutRow keys={['⇧', '3']} label="Objection Handling" color="#FCD34D" />
          <ShortcutRow keys={['⇧', '4']} label="Misstep Corrections" color="#FCD34D" />
          <ShortcutRow keys={['⇧', '5']} label="The Financial Close" color="#FCD34D" />
        </div>
        <p style={{ margin: '18px 0 0', fontSize: '10px', color: '#222', textAlign: 'center', letterSpacing: '.12em', textTransform: 'uppercase' }}>Press ? anytime to open this card</p>
      </div>
    </div>
  );
}
