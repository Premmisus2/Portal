'use client';

import type { CSSProperties } from 'react';
import ChangePasswordCard from './ChangePasswordCard';
import RecoverPasswordCard from './RecoverPasswordCard';
import UpdateNameCard from './UpdateNameCard';
import SignOutAllCard from './SignOutAllCard';

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
  color: '#444', letterSpacing: '.16em', textTransform: 'uppercase',
  fontFamily: 'JetBrains Mono, monospace',
};

const dividerStyle: CSSProperties = {
  flex: 1, height: '1px', background: '#141414',
};

function StubCard({ title, description, chunkLabel }: { title: string; description: string; chunkLabel: string }) {
  return (
    <div style={{
      background: '#080808', border: '1px dashed #1c1c1c', borderRadius: '10px',
      padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px',
    }}>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#888', fontFamily: 'Inter, sans-serif' }}>
          {title}
        </h3>
        <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#444', lineHeight: 1.5, fontFamily: 'Roboto, sans-serif' }}>
          {description}
        </p>
      </div>
      <span style={{
        fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
        background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.25)', color: '#F59E0B',
        fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.1em', textTransform: 'uppercase',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {chunkLabel}
      </span>
    </div>
  );
}

export default function SettingsView({ userName, userEmail, repId, isDirector, embedded = true }: Props) {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {!embedded && (
        <div style={{ marginBottom: '6px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
            Settings
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#555', fontFamily: 'Roboto, sans-serif' }}>
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
          <div style={{ ...groupHeaderStyle, marginTop: '14px', color: '#00F0FF' }}>
            <span>Admin</span>
            <span style={{ ...dividerStyle, background: 'rgba(0,240,255,.12)' }} />
          </div>

          <StubCard
            title="Portal health"
            description="Cron status, Sentry, Telegram bot, Supabase connectivity, build version."
            chunkLabel="Chunk C"
          />
          <StubCard
            title="Build journal viewer"
            description="Searchable log of every change shipped to the portal — filter by tag, expand entries inline."
            chunkLabel="Chunk C"
          />
          <StubCard
            title="Notification routing"
            description="Route Telegram alerts by type — errors to Elliott, summaries to a team channel, callbacks to rep DMs."
            chunkLabel="Chunk D"
          />
          <StubCard
            title="Activity log"
            description="Audit trail of every consequential rep + director action — filterable by actor, type, and date."
            chunkLabel="Chunk E"
          />
        </>
      )}
    </div>
  );
}
