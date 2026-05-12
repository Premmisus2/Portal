'use client';

const SubjectLine = ({ children }: any) => (
  <div style={{ background: 'var(--bg-elev-1)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 14px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', flexShrink: 0 }}>Subject</span>
    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{children}</span>
  </div>
);

export default SubjectLine;
