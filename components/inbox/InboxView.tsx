'use client';

// Inbox — top-level SMS conversation surface.
//
// Two-column layout: thread list on the left (grouped by lead_id, ordered by
// last activity), selected conversation on the right with composer at the bottom.
// Reps see all threads (matches existing portal RLS convention).
// Directors see all threads regardless.
//
// Realtime: polls every 20s for new messages. Cheap, matches other portal views.
// Switch to Supabase Realtime later if it becomes a bottleneck.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import SmsThread from './SmsThread';
import SmsComposer from './SmsComposer';

type Msg = {
  id: string;
  lead_id: string | null;
  rep_id: string | null;
  direction: 'inbound' | 'outbound';
  body: string;
  status: string | null;
  keyword: string | null;
  is_read: boolean;
  from_phone: string;
  to_phone: string;
  created_at: string;
};

type LeadInfo = { id: string; business_name: string | null; phone: string | null; sms_opted_out_at: string | null };

type ThreadKey = string; // lead_id or `phone:${digits}` for unknown senders

type ThreadRow = {
  key: ThreadKey;
  leadId: string | null;
  label: string;
  phone: string;
  lastMessage: Msg;
  unread: number;
  messages: Msg[];
  optedOut: boolean;
};

const fmtRelTime = (iso: string) => {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
};

// Mobile-stack layout below 768px so the desktop split-pane doesn't squish
// the conversation thread into a 30px vertical sliver on iPhone.
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
};

const InboxView = ({ userName, userEmail, onHome, onLogout, totalCloses, setTotalCloses, totalPoints, addClose, undoClose, repId, shadowMode }: any) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [leadInfo, setLeadInfo] = useState<Record<string, LeadInfo>>({});
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<ThreadKey | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'unrouted'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((t: { message: string; type: 'success' | 'error' }) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    const { data: msgs } = await supabase
      .from('sms_messages')
      .select('id, lead_id, rep_id, direction, body, status, keyword, is_read, from_phone, to_phone, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    const msgsArr: Msg[] = (msgs as any) || [];
    setMessages(msgsArr);

    const leadIds = Array.from(new Set(msgsArr.map(m => m.lead_id).filter(Boolean) as string[]));
    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, business_name, phone, sms_opted_out_at')
        .in('id', leadIds);
      const map: Record<string, LeadInfo> = {};
      ((leads as any) || []).forEach((l: LeadInfo) => { map[l.id] = l; });
      setLeadInfo(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 20_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const threads: ThreadRow[] = useMemo(() => {
    const groups: Map<ThreadKey, Msg[]> = new Map();
    for (const m of messages) {
      const key: ThreadKey = m.lead_id || `phone:${(m.direction === 'inbound' ? m.from_phone : m.to_phone).replace(/\D/g, '').slice(-10)}`;
      const arr = groups.get(key) || [];
      arr.push(m);
      groups.set(key, arr);
    }
    const rows: ThreadRow[] = [];
    groups.forEach((arr, key) => {
      const sorted = [...arr].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      const last = sorted[0];
      const unread = arr.filter(m => m.direction === 'inbound' && !m.is_read).length;
      const lead = last.lead_id ? leadInfo[last.lead_id] : null;
      const label = lead?.business_name || `Unknown (${last.from_phone || last.to_phone})`;
      const phone = lead?.phone || last.from_phone || last.to_phone;
      rows.push({
        key,
        leadId: last.lead_id,
        label,
        phone,
        lastMessage: last,
        unread,
        messages: sorted.reverse(),
        optedOut: !!lead?.sms_opted_out_at,
      });
    });
    rows.sort((a, b) => (a.lastMessage.created_at < b.lastMessage.created_at ? 1 : -1));
    return rows;
  }, [messages, leadInfo]);

  const filtered = useMemo(() => {
    if (filter === 'unread') return threads.filter(t => t.unread > 0);
    if (filter === 'unrouted') return threads.filter(t => !t.leadId);
    return threads;
  }, [threads, filter]);

  const selected = useMemo(() => threads.find(t => t.key === selectedKey) || null, [threads, selectedKey]);

  // Auto-mark as read when opening a thread
  useEffect(() => {
    if (!selected) return;
    const unreadIds = selected.messages.filter(m => m.direction === 'inbound' && !m.is_read).map(m => m.id);
    if (unreadIds.length === 0) return;
    supabase.from('sms_messages').update({ is_read: true }).in('id', unreadIds).then(() => {
      setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, is_read: true } : m));
    });
  }, [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalUnread = threads.reduce((sum, t) => sum + t.unread, 0);
  const isMobile = useIsMobile();
  const showList = !isMobile || !selected;
  const showThread = !isMobile || !!selected;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app)', paddingTop: shadowMode ? '40px' : 0 }}>
      <TopBar title={`Inbox${totalUnread > 0 ? ` (${totalUnread})` : ''}`} subtitle="Section 13 — SMS Conversations"
        userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout}
        totalCloses={totalCloses} setTotalCloses={setTotalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose} />
      {toast && (
        <div style={{
          position: 'fixed', top: shadowMode ? '76px' : '36px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? 'var(--red-strong)' : 'var(--green)', color: 'var(--bg-app)',
          padding: '10px 24px', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px',
          zIndex: 450, boxShadow: '0 4px 12px rgba(0,0,0,.3)', animation: 'fadein .3s',
        }}>{toast.message}</div>
      )}
      <main className="section-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
        {/* Left rail — thread list. On mobile, takes full width when no thread selected. */}
        {showList && (
        <aside style={{
          width: isMobile ? '100%' : '320px',
          minWidth: isMobile ? '0' : '280px',
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', background: 'var(--bg-app)',
        }}>
          {/* Filter chips */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '6px' }}>
            {(['all', 'unread', 'unrouted'] as const).map(k => (
              <button key={k} onClick={() => setFilter(k)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '5px',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  background: filter === k ? 'var(--accent-glow-15)' : 'transparent',
                  border: `1px solid ${filter === k ? 'var(--accent-glow-50)' : 'var(--border)'}`,
                  color: filter === k ? 'var(--accent-ink)' : 'var(--text-tertiary)',
                }}>
                {k}{k === 'unread' && totalUnread > 0 ? ` · ${totalUnread}` : ''}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <div style={{ padding: '16px', color: 'var(--text-faint)', fontSize: '12px' }}>Loading…</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: '20px 16px', color: 'var(--text-faint)', fontSize: '12px', fontStyle: 'italic' }}>No conversations.</div>}
            {filtered.map(t => {
              const active = selectedKey === t.key;
              return (
                <div key={t.key} onClick={() => setSelectedKey(t.key)}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: active ? 'var(--accent-glow-08)' : 'transparent',
                    borderLeft: `3px solid ${active ? 'var(--accent-ink)' : 'transparent'}`,
                    transition: 'background .12s',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t.unread > 0 && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-ink)', flexShrink: 0 }} />}
                        <span style={{ fontSize: '13px', fontWeight: t.unread > 0 ? 800 : 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.lastMessage.direction === 'outbound' ? '↗ ' : '↙ '}{t.lastMessage.body.slice(0, 60)}
                      </p>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono,monospace', flexShrink: 0 }}>{fmtRelTime(t.lastMessage.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
        )}

        {/* Right — conversation. On mobile, takes full width when a thread is selected. */}
        {showThread && (
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!selected && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: '13px' }}>
              Select a conversation
            </div>
          )}
          {selected && (
            <>
              <header style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {isMobile && (
                    <button
                      onClick={() => setSelectedKey(null)}
                      aria-label="Back to inbox"
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        minHeight: '40px',
                        minWidth: '40px',
                        cursor: 'pointer',
                        color: 'var(--accent-ink)',
                        fontSize: '16px',
                        lineHeight: 1,
                        flexShrink: 0,
                      }}>
                      ←
                    </button>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.label}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.phone}{selected.optedOut ? ' · 🚫 OPTED OUT' : ''}</p>
                  </div>
                </div>
                {selected.leadId && (
                  <a href={`/?lead=${selected.leadId}`} style={{ fontSize: '10px', color: 'var(--accent-ink)', textDecoration: 'none', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', flexShrink: 0 }}>View Lead →</a>
                )}
              </header>
              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
                <SmsThread messages={selected.messages} />
              </div>
              {selected.leadId && repId && !shadowMode && (
                <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-elev-1)' }}>
                  <SmsComposer
                    leadId={selected.leadId}
                    leadPhone={selected.phone}
                    repId={repId}
                    optedOut={selected.optedOut}
                    onSent={load}
                    setToast={showToast}
                  />
                </div>
              )}
              {!selected.leadId && (
                <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'rgba(245,158,11,.06)', color: 'var(--amber)', fontSize: '11px', fontWeight: 600 }}>
                  ⚠ Unrouted — no matching lead. Reply by finding the contact in your leads list.
                </div>
              )}
            </>
          )}
        </section>
        )}
      </main>
    </div>
  );
};

export default InboxView;
