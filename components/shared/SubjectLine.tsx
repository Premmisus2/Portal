'use client';

const SubjectLine = ({ children }: any) => (
  <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '6px', padding: '8px 14px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', color: '#555', flexShrink: 0 }}>Subject</span>
    <span style={{ fontSize: '13px', color: '#ccc', fontFamily: 'monospace' }}>{children}</span>
  </div>
);

export default SubjectLine;
