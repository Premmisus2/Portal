'use client';

const OutreachRule = ({ title, children }: any) => (
  <div style={{ background: 'rgba(255,150,50,.05)', border: '1px solid rgba(255,150,50,.2)', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
    <p style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: '#fb923c', marginBottom: '6px' }}>{title}</p>
    <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.6, margin: 0 }}>{children}</p>
  </div>
);

export default OutreachRule;
