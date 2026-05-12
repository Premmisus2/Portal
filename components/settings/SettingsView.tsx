'use client';

import type { CSSProperties } from 'react';
import ChangePasswordCard from './ChangePasswordCard';
import RecoverPasswordCard from './RecoverPasswordCard';
import UpdateNameCard from './UpdateNameCard';
import SignOutAllCard from './SignOutAllCard';
import PortalHealthCard from './PortalHealthCard';
import BuildJournalCard from './BuildJournalCard';
import NotificationRoutingCard from './NotificationRoutingCard';
import ActivityLogCard from './ActivityLogCard';

interface Props {
  userName: string;
  userEmail: string;
  repId: string;
  isDirector: boolean;
  /** When rendered inside a tab, header is rendered by the parent. When rendered as a modal, render our own. */
  embedded?: boolean;
}

const groupHeaderStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px',
  margin: '4px 0 12px', fontSize: '10px', fontWeight: 700,
  color: 'var(--text-faint)', letterSpacing: '.16em', textTransform: 'uppercase',
  fontFamily: 'JetBrains Mono, monospace',
};

const dividerStyle: CSSProperties = {
  flex: 1, height: '1px', background: '#141414',
};

export default function SettingsView({ userName, userEmail, repId, isDirector, embedded = true }: Props) {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {!embedded && (
        <div style={{ marginBottom: '6px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            Settings
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Roboto, sans-serif' }}>
            Manage your account, password, and notifications.
          </p>
        </div>
      )}

      <div style={groupHeaderStyle}>
        <span>Account</span>
        <span style={dividerStyle} />
      </div>

      <UpdateNameCard repId={repId} currentName={userName} />
      <ChangePasswordCard userEmail={userEmail} />
      <RecoverPasswordCard userEmail={userEmail} />
      <SignOutAllCard />

      {isDirector && (
        <>
          <div style={{ ...groupHeaderStyle, marginTop: '14px', color: 'var(--accent-ink)' }}>
            <span>Admin</span>
            <span style={{ ...dividerStyle, background: 'var(--accent-glow-12)' }} />
          </div>

          <PortalHealthCard />
          <BuildJournalCard />
          <NotificationRoutingCard />
          <ActivityLogCard />
        </>
      )}
    </div>
  );
}
