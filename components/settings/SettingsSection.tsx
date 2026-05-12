'use client';

import type { CSSProperties, ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  badge?: { label: string; color: string };
  children: ReactNode;
  bare?: boolean;
}

const wrapStyle: CSSProperties = {
  background: 'var(--bg-elev-pill)',
  border: '1px solid var(--border-soft)',
  borderRadius: '10px',
  padding: '18px 20px',
};

const headerStyle: CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  gap: '12px', marginBottom: '14px',
};

const titleStyle: CSSProperties = {
  margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)',
  fontFamily: 'Inter, sans-serif', letterSpacing: '-.005em',
};

const descStyle: CSSProperties = {
  margin: '3px 0 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.55,
  fontFamily: 'Roboto, sans-serif',
};

const badgeStyle = (color: string): CSSProperties => ({
  fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
  background: `${color}1a`, border: `1px solid ${color}40`, color,
  fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.1em',
  textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
});

export default function SettingsSection({ title, description, badge, children, bare = false }: Props) {
  return (
    <div style={bare ? {} : wrapStyle}>
      <div style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <h3 style={titleStyle}>{title}</h3>
          {description && <p style={descStyle}>{description}</p>}
        </div>
        {badge && <span style={badgeStyle(badge.color)}>{badge.label}</span>}
      </div>
      {children}
    </div>
  );
}
