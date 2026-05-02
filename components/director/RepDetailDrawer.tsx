'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Rep, RepStats, Lead } from '@/lib/types';
import { reportClientError } from '@/lib/error-reporting';

interface Props {
  rep: Rep;
  stats: RepStats;
  onClose: () => void;
  onMutated: () => void;
}

const drawerStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', maxWidth: '90vw',
  background: '#0a0a0a', borderLeft: '1px solid #1e1e1e', boxShadow: '-12px 0 30px rgba(0,0,0,.6)',
  zIndex: 1000, display: 'flex', flexDirection: 'column',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 999,
};

const sectionStyle: React.CSSProperties = {
  padding: '18px 24px', borderBottom: '1px solid #141414',
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: '#444',
  letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: '#111', border: '1px solid #333',
  borderRadius: '6px', color: '#fff', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', outline: 'none',
};

export default function RepDetailDrawer({ rep, stats, onClose, onMutated }: Props) {
  const [phone, setPhone] = useState(rep.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unassigned, setUnassigned] = useState<Lead[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => { setPhone(rep.phone || ''); }, [rep.id, rep.phone]);

  const loadUnassigned = useCallback(async () => {
    setAssignLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('id, business_name, niche, city, priority')
      .is('assigned_rep_id', null)
      .order('priority', { ascending: true })
      .limit(200);
    if (error) reportClientError('RepDetailDrawer.loadUnassigned', error, undefined, 'reps-tab-v1');
    setUnassigned((data as Lead[]) || []);
    setAssignLoading(false);
  }, []);

  useEffect(() => { loadUnassigned(); }, [loadUnassigned]);

  const savePhone = async () => {
    setSavingPhone(true);
    const next = phone.trim() || null;
    const { error } = await supabase.from('reps').update({ phone: next }).eq('id', rep.id);
    setSavingPhone(false);
    if (error) {
      reportClientError('RepDetailDrawer.savePhone', error, { repId: rep.id }, 'reps-tab-v1');
      alert('Failed to save phone: ' + error.message);
      return;
    }
    setPhoneSaved(true);
    setTimeout(() => setPhoneSaved(false), 2000);
    onMutated();
  };

  const toggleRole = async () => {
    setBusy(true);
    const nextRole = rep.role === 'director' ? 'rep' : 'director';
    const { error } = await supabase.from('reps').update({ role: nextRole }).eq('id', rep.id);
    setBusy(false);
    setShowRoleConfirm(false);
    if (error) {
      reportClientError('RepDetailDrawer.toggleRole', error, { repId: rep.id, nextRole }, 'reps-tab-v1');
      alert('Failed to change role: ' + error.message);
      return;
    }
    onMutated();
  };

  const toggleActive = async () => {
    setBusy(true);
    const nextActive = !(rep.active !== false);
    const { error } = await supabase.from('reps').update({ active: nextActive }).eq('id', rep.id);
    setBusy(false);
    setShowDeactivateConfirm(false);
    if (error) {
      reportClientError('RepDetailDrawer.toggleActive', error, { repId: rep.id, nextActive }, 'reps-tab-v1');
      alert('Failed to update active state: ' + error.message);
      return;
    }
    onMutated();
  };

  const assignLead = async (leadId: string) => {
    setAssigning(leadId);
    const { error } = await supabase.from('leads').update({ assigned_rep_id: rep.id }).eq('id', leadId);
    setAssigning(null);
    if (error) {
      reportClientError('RepDetailDrawer.assignLead', error, { repId: rep.id, leadId }, 'reps-tab-v1');
      alert('Failed to assign: ' + error.message);
      return;
    }
    setUnassigned(prev => prev.filter(l => l.id !== leadId));
    onMutated();
  };

  const filteredUnassigned = unassigned.filter(l =>
    !assignSearch
    || l.business_name?.toLowerCase().includes(assignSearch.toLowerCase())
    || l.city?.toLowerCase().includes(assignSearch.toLowerCase())
    || l.niche?.toLowerCase().includes(assignSearch.toLowerCase())
  );

  const isInactive = rep.active === false;

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={drawerStyle}>
        {/* Header */}
        <div style={{ ...sectionStyle, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: rep.role === 'director' ? '#00F0FF' : '#fff' }}>
                {rep.name || rep.email}
              </h2>
              {isInactive && (
                <span style={{ fontSize: '8px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(255,96,96,.1)', border: '1px solid rgba(255,96,96,.25)', color: '#ff6060', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  Inactive
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#444', fontFamily: 'JetBrains Mono, monospace' }}>{rep.email}</p>
            {rep.invite_code && (
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>
                Code: <span style={{ color: '#888' }}>{rep.invite_code}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close drawer"
            style={{ background: 'none', border: '1px solid #1e1e1e', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', color: '#555', fontSize: '14px' }}>
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Performance — 3x3 grid grouped: calls / closes / leads */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Performance</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                // Row 1: call activity
                { v: stats.total_calls, l: 'Calls', c: stats.total_calls > 0 ? '#00F0FF' : '#444' },
                { v: stats.total_calls_auto, l: 'Auto-dialed', c: stats.total_calls_auto > 0 ? '#00F0FF' : '#444', sub: 'Twilio' },
                { v: stats.total_calls_manual, l: 'Manual log', c: stats.total_calls_manual > 0 ? '#888' : '#444', sub: 'Hand-logged' },
                // Row 2: close stack
                { v: stats.total_closes, l: 'Closes', c: '#fff' },
                { v: stats.pending_closes, l: 'Pending', c: stats.pending_closes > 0 ? '#F59E0B' : '#444' },
                { v: stats.approved_points, l: 'Approved Pts', c: stats.approved_points > 0 ? '#22c55e' : '#444' },
                // Row 3: warm-lead funnel
                { v: stats.assigned_leads, l: 'Leads', c: '#fff' },
                { v: stats.warm_leads_contacted, l: 'Warm Cont.', c: stats.warm_leads_contacted > 0 ? '#F59E0B' : '#444', sub: 'HOT/HIGH touched' },
                { v: stats.warm_leads_closed, l: 'Warm Closed', c: stats.warm_leads_closed > 0 ? '#22c55e' : '#444', sub: 'HOT/HIGH booked' },
              ].map(s => (
                <div key={s.l} style={{ padding: '10px', background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: '6px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: s.c, fontFamily: 'monospace' }}>{s.v}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '8px', color: '#444', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>{s.l}</p>
                  {s.sub && <p style={{ margin: '1px 0 0', fontSize: '7px', color: '#333', fontFamily: 'JetBrains Mono, monospace' }}>{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* AI classification breakdown — only renders when classifier has actually run */}
            {stats.total_results_auto > 0 && stats.total_calls > 0 && (
              <div style={{ marginTop: '12px', padding: '10px 12px', background: '#0a0a0a', border: '1px solid rgba(0,240,255,.15)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#00F0FF', letterSpacing: '.1em', textTransform: 'uppercase' }}>AI Classified</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#888' }}>Gemini auto-tagged the outcome on {stats.total_results_auto} of {stats.total_calls} call{stats.total_calls === 1 ? '' : 's'}.</p>
                  </div>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#00F0FF', fontFamily: 'JetBrains Mono, monospace' }}>
                    {Math.round((stats.total_results_auto / stats.total_calls) * 100)}%
                  </p>
                </div>
              </div>
            )}

            {/* Footer: last call (was a tile, now a single line so the grid stays clean) */}
            <p style={{ margin: '10px 0 0', fontSize: '10px', color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>
              Last call: <span style={{ color: stats.last_call_at ? '#bbb' : '#444' }}>{stats.last_call_at ? fmtAgo(stats.last_call_at) : '—'}</span>
              {stats.last_close_at && <span style={{ marginLeft: '14px' }}>Last close: <span style={{ color: '#bbb' }}>{fmtAgo(stats.last_close_at)}</span></span>}
            </p>
          </div>

          {/* Phone */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Phone (Twilio dialer)</div>
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#555', lineHeight: 1.6 }}>
              E.164 format (+1XXXXXXXXXX). The dialer button only appears for reps with a phone set.
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+1XXXXXXXXXX"
                style={inputStyle}
                onKeyDown={e => { if (e.key === 'Enter') savePhone(); }}
              />
              <button onClick={savePhone} disabled={savingPhone || phone.trim() === (rep.phone || '')}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(0,240,255,.3)', background: 'rgba(0,240,255,.08)', color: '#00F0FF', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: (savingPhone || phone.trim() === (rep.phone || '')) ? 0.5 : 1 }}>
                {savingPhone ? '...' : 'Save'}
              </button>
            </div>
            {phoneSaved && <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#22c55e' }}>Saved</p>}
          </div>

          {/* Role */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Role</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#fff', fontWeight: 700 }}>
                  Currently: <span style={{ color: rep.role === 'director' ? '#00F0FF' : '#888' }}>{rep.role}</span>
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>
                  Changing to <strong style={{ color: rep.role === 'director' ? '#888' : '#00F0FF' }}>{rep.role === 'director' ? 'rep' : 'director'}</strong> {rep.role === 'director' ? 'removes' : 'grants'} dashboard access.
                </p>
              </div>
              <button onClick={() => setShowRoleConfirm(true)} disabled={busy}
                style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #2a2a2a', background: 'transparent', color: '#aaa', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Change role
              </button>
            </div>
          </div>

          {/* Assign leads */}
          <div style={sectionStyle}>
            <div style={labelStyle}>Assign Unassigned Leads</div>
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#555' }}>
              Showing first 200 unassigned leads (sorted by priority). For bulk operations, use the All Leads tab.
            </p>
            <input value={assignSearch} onChange={e => setAssignSearch(e.target.value)}
              placeholder="Filter by name, niche, city..."
              style={{ ...inputStyle, marginBottom: '10px', fontFamily: 'Inter, sans-serif' }} />
            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #1a1a1a', borderRadius: '6px', background: '#0c0c0c' }}>
              {assignLoading ? (
                <p style={{ margin: 0, padding: '20px', textAlign: 'center', fontSize: '11px', color: '#555' }}>Loading...</p>
              ) : filteredUnassigned.length === 0 ? (
                <p style={{ margin: 0, padding: '20px', textAlign: 'center', fontSize: '11px', color: '#555' }}>No unassigned leads match.</p>
              ) : filteredUnassigned.map(lead => (
                <div key={lead.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #131313', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.business_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#555' }}>
                      {[lead.niche, lead.city, lead.priority].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <button onClick={() => assignLead(lead.id)} disabled={assigning === lead.id}
                    style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid rgba(34,197,94,.35)', background: 'rgba(34,197,94,.1)', color: '#22c55e', fontSize: '10px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: assigning === lead.id ? 0.5 : 1 }}>
                    {assigning === lead.id ? '...' : 'Assign'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div style={sectionStyle}>
            <div style={labelStyle}>{isInactive ? 'Reactivate' : 'Deactivate'}</div>
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#555', lineHeight: 1.6 }}>
              {isInactive
                ? 'Reactivating restores sign-in access and re-enables this rep for assignments.'
                : 'Deactivating blocks sign-in and removes this rep from assignment dropdowns. History is preserved. Reversible.'}
            </p>
            <button onClick={() => setShowDeactivateConfirm(true)} disabled={busy}
              style={{
                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                border: `1px solid ${isInactive ? 'rgba(34,197,94,.35)' : 'rgba(255,96,96,.35)'}`,
                background: isInactive ? 'rgba(34,197,94,.08)' : 'rgba(255,96,96,.08)',
                color: isInactive ? '#22c55e' : '#ff6060',
              }}>
              {isInactive ? 'Reactivate rep' : 'Deactivate rep'}
            </button>
          </div>
        </div>

        {/* Role confirmation overlay */}
        {showRoleConfirm && (
          <ConfirmOverlay
            title={`Change ${rep.name}'s role to ${rep.role === 'director' ? 'rep' : 'director'}?`}
            body={rep.role === 'director'
              ? 'They will lose access to the Director Dashboard, Pending Closes, and All Leads management.'
              : 'They will gain full Director Dashboard access including pending close approvals and bulk lead operations.'}
            confirmLabel="Change role"
            confirmColor="#00F0FF"
            busy={busy}
            onCancel={() => setShowRoleConfirm(false)}
            onConfirm={toggleRole}
          />
        )}

        {showDeactivateConfirm && (
          <ConfirmOverlay
            title={isInactive ? `Reactivate ${rep.name}?` : `Deactivate ${rep.name}?`}
            body={isInactive
              ? 'They will be able to sign in again and appear in assignment dropdowns.'
              : 'They will be unable to sign in. Their assigned leads stay assigned to them but no new leads can be assigned. All history is preserved.'}
            confirmLabel={isInactive ? 'Reactivate' : 'Deactivate'}
            confirmColor={isInactive ? '#22c55e' : '#ff6060'}
            busy={busy}
            onCancel={() => setShowDeactivateConfirm(false)}
            onConfirm={toggleActive}
          />
        )}
      </div>
    </>
  );
}

function fmtAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return '1d';
  if (d < 30) return `${d}d`;
  if (d < 365) return `${Math.floor(d / 30)}mo`;
  return `${Math.floor(d / 365)}y`;
}

function ConfirmOverlay({ title, body, confirmLabel, confirmColor, busy, onCancel, onConfirm }: {
  title: string; body: string; confirmLabel: string; confirmColor: string; busy: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '20px 22px', maxWidth: '400px' }}>
        <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 800, color: '#fff' }}>{title}</p>
        <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#888', lineHeight: 1.6 }}>{body}</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={busy} style={{ padding: '7px 16px', borderRadius: '6px', border: '1px solid #2a2a2a', background: 'transparent', color: '#888', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy} style={{
            padding: '7px 16px', borderRadius: '6px', cursor: busy ? 'wait' : 'pointer',
            border: `1px solid ${confirmColor}55`, background: `${confirmColor}1a`, color: confirmColor,
            fontSize: '11px', fontWeight: 800, opacity: busy ? 0.6 : 1,
          }}>
            {busy ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
