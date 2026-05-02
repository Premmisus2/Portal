'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Rep, RepStats } from '@/lib/types';
import { reportClientError } from '@/lib/error-reporting';
import RepDetailDrawer from './RepDetailDrawer';
import InviteRepModal from './InviteRepModal';

type SortKey = 'name' | 'role' | 'phone' | 'total_closes' | 'pending_closes' | 'approved_points' | 'total_calls' | 'last_close_at' | 'last_call_at' | 'assigned_leads';

interface RepRow extends Rep {
  stats: RepStats;
}

const fmtRelative = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

export default function RepsTab() {
  const [rows, setRows] = useState<RepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('total_closes');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showInactive, setShowInactive] = useState(false);
  const [openRepId, setOpenRepId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Helper: paginated fetch in chunks of 1000 (Supabase default cap per request).
    // We fetch metadata only — never row payloads with transcript text — so this
    // stays light even when call_logs grows large.
    const fetchAllPaginated = async <T,>(
      table: string,
      columns: string,
      orderCol = 'created_at',
    ): Promise<T[]> => {
      let all: T[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select(columns)
          .order(orderCol, { ascending: false })
          .range(from, from + 999);
        if (error) {
          reportClientError('RepsTab.fetchAllPaginated', error, { table }, 'reps-tab-v1');
          break;
        }
        if (!data || data.length === 0) break;
        all = all.concat(data as T[]);
        if (data.length < 1000) break;
        from += 1000;
      }
      return all;
    };

    const [repsRes, closesRes, callsMeta, outcomeAutoMeta, leadsMeta] = await Promise.all([
      // `*` for forward-compat: works whether 20260502_reps_active has been applied or not.
      supabase.from('reps').select('*').order('created_at', { ascending: true }),
      supabase.from('closes').select('rep_id, status, pts, created_at'),
      // Lean call_logs fetch for total/auto/manual/last_call. Always works.
      fetchAllPaginated<{ rep_id: string | null; call_sid: string | null; created_at: string }>(
        'call_logs', 'rep_id, call_sid, created_at',
      ),
      // Separate fetch for outcome_auto so a missing-column error (pre-migration
      // for #outcome-auto-classifier) only zeros out total_results_auto without
      // breaking the rest of the stats. fetchAllPaginated already reports the
      // error to Telegram via reportClientError and returns [].
      fetchAllPaginated<{ rep_id: string | null; outcome_auto: string | null }>(
        'call_logs', 'rep_id, outcome_auto', 'created_at',
      ),
      fetchAllPaginated<{ assigned_rep_id: string | null; priority: string | null; status: string | null }>(
        'leads', 'assigned_rep_id, priority, status', 'created_at',
      ),
    ]);

    if (repsRes.error) {
      reportClientError('RepsTab.loadReps', repsRes.error, undefined, 'reps-tab-v1');
      setError(repsRes.error.message);
      setLoading(false);
      return;
    }

    const reps = (repsRes.data as Rep[]) || [];

    // Closes aggregation
    const closesByRep = new Map<string, { total: number; pending: number; approvedPoints: number; lastAt: string | null }>();
    (closesRes.data || []).forEach(c => {
      const existing = closesByRep.get(c.rep_id) || { total: 0, pending: 0, approvedPoints: 0, lastAt: null };
      existing.total++;
      if (c.status === 'pending') existing.pending++;
      if (c.status === 'approved') existing.approvedPoints += (c.pts || 0);
      if (!existing.lastAt || (c.created_at && c.created_at > existing.lastAt)) existing.lastAt = c.created_at;
      closesByRep.set(c.rep_id, existing);
    });

    // Call aggregation: total + auto/manual split + last_call_at, all in one pass.
    const callStatsByRep = new Map<string, { total: number; auto: number; manual: number; lastAt: string | null }>();
    callsMeta.forEach(c => {
      if (!c.rep_id) return;
      const s = callStatsByRep.get(c.rep_id) || { total: 0, auto: 0, manual: 0, lastAt: null };
      s.total++;
      if (c.call_sid) s.auto++; else s.manual++;
      if (!s.lastAt || c.created_at > s.lastAt) s.lastAt = c.created_at;
      callStatsByRep.set(c.rep_id, s);
    });

    // Auto-classified outcome count (from #outcome-auto-classifier).
    // outcomeAutoMeta is empty if the column doesn't exist yet — degrades to 0.
    const outcomeAutoByRep = new Map<string, number>();
    outcomeAutoMeta.forEach(c => {
      if (!c.rep_id || !c.outcome_auto) return;
      outcomeAutoByRep.set(c.rep_id, (outcomeAutoByRep.get(c.rep_id) || 0) + 1);
    });

    // Lead aggregation: total assigned + warm contacted + warm closed.
    const WARM_PRIORITIES = new Set(['HOT', 'HIGH']);
    const CONTACTED_STATUSES = new Set(['contacted', 'callback', 'booked', 'discovery_completed']);
    const CLOSED_STATUSES = new Set(['booked', 'discovery_completed']);
    const leadStatsByRep = new Map<string, { assigned: number; warmContacted: number; warmClosed: number }>();
    leadsMeta.forEach(l => {
      if (!l.assigned_rep_id) return;
      const s = leadStatsByRep.get(l.assigned_rep_id) || { assigned: 0, warmContacted: 0, warmClosed: 0 };
      s.assigned++;
      if (l.priority && WARM_PRIORITIES.has(l.priority)) {
        if (l.status && CONTACTED_STATUSES.has(l.status)) s.warmContacted++;
        if (l.status && CLOSED_STATUSES.has(l.status)) s.warmClosed++;
      }
      leadStatsByRep.set(l.assigned_rep_id, s);
    });

    const enriched: RepRow[] = reps.map(rep => {
      const c = closesByRep.get(rep.id);
      const cs = callStatsByRep.get(rep.id);
      const ls = leadStatsByRep.get(rep.id);
      return {
        ...rep,
        stats: {
          rep_id: rep.id,
          total_closes: c?.total || 0,
          pending_closes: c?.pending || 0,
          approved_points: c?.approvedPoints || 0,
          total_calls: cs?.total || 0,
          total_calls_auto: cs?.auto || 0,
          total_calls_manual: cs?.manual || 0,
          total_results_auto: outcomeAutoByRep.get(rep.id) || 0,
          warm_leads_contacted: ls?.warmContacted || 0,
          warm_leads_closed: ls?.warmClosed || 0,
          last_close_at: c?.lastAt || null,
          last_call_at: cs?.lastAt || null,
          assigned_leads: ls?.assigned || 0,
        },
      };
    });

    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = useMemo(
    () => showInactive ? rows : rows.filter(r => r.active !== false),
    [rows, showInactive],
  );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      switch (sortKey) {
        case 'name': va = a.name || ''; vb = b.name || ''; break;
        case 'role': va = a.role || ''; vb = b.role || ''; break;
        case 'phone': va = a.phone || ''; vb = b.phone || ''; break;
        case 'total_closes': va = a.stats.total_closes; vb = b.stats.total_closes; break;
        case 'pending_closes': va = a.stats.pending_closes; vb = b.stats.pending_closes; break;
        case 'approved_points': va = a.stats.approved_points; vb = b.stats.approved_points; break;
        case 'total_calls': va = a.stats.total_calls; vb = b.stats.total_calls; break;
        case 'assigned_leads': va = a.stats.assigned_leads; vb = b.stats.assigned_leads; break;
        case 'last_close_at': va = a.stats.last_close_at || ''; vb = b.stats.last_close_at || ''; break;
        case 'last_call_at': va = a.stats.last_call_at || ''; vb = b.stats.last_call_at || ''; break;
      }
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(['name', 'role', 'phone'].includes(key) ? 'asc' : 'desc'); }
  };

  const openRep = openRepId ? rows.find(r => r.id === openRepId) : null;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
      <svg style={{ animation: 'spin 1s linear infinite' }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </div>
  );

  if (error) return (
    <div style={{ padding: '14px 16px', background: 'rgba(255,96,96,.06)', border: '1px solid rgba(255,96,96,.2)', borderRadius: '10px' }}>
      <p style={{ margin: 0, fontSize: '12px', color: '#ff6060' }}>Failed to load reps: {error}</p>
    </div>
  );

  return (
    <div className="fadein">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#fff' }}>Reps</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>Manage your sales team. Click a row to edit. Sort defaults to Total Closes desc.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#666', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ accentColor: '#00F0FF' }} />
            Show inactive
          </label>
          <button onClick={() => setInviteOpen(true)} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#00F0FF', color: '#000', cursor: 'pointer', fontSize: '12px', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>
            + Invite Rep
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        {[
          { val: rows.filter(r => r.active !== false).length, label: 'Active Reps', color: '#fff' },
          { val: rows.filter(r => r.role === 'director').length, label: 'Directors', color: '#00F0FF' },
          { val: rows.reduce((s, r) => s + r.stats.total_calls, 0), label: 'Total Calls', color: '#00F0FF' },
          { val: rows.reduce((s, r) => s + r.stats.total_closes, 0), label: 'Total Closes', color: '#22c55e' },
          { val: rows.reduce((s, r) => s + r.stats.pending_closes, 0), label: 'Pending', color: '#F59E0B' },
          { val: rows.reduce((s, r) => s + r.stats.approved_points, 0), label: 'Approved Pts', color: '#22c55e' },
          { val: rows.reduce((s, r) => s + r.stats.assigned_leads, 0), label: 'Assigned Leads', color: '#fff' },
        ].map(s => (
          <div key={s.label} className="card-glow" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.val}</p>
            <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#444', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: '4px', background: '#0e0e0e' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
          <thead>
            <tr>
              {[
                ['name', 'Name'], ['role', 'Role'], ['phone', 'Phone'],
                ['total_calls', 'Calls'],
                ['total_closes', 'Closes'], ['pending_closes', 'Pending'], ['approved_points', 'Approved Pts'],
                ['last_close_at', 'Last Close'], ['last_call_at', 'Last Call'], ['assigned_leads', 'Leads'],
              ].map(([key, label]) => (
                <th key={key} onClick={() => toggleSort(key as SortKey)} style={{
                  padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
                  color: sortKey === key ? '#00F0FF' : '#c0c0c0', cursor: 'pointer', whiteSpace: 'nowrap',
                  borderBottom: '2px solid #333', borderRight: '1px solid #1a1a1a', background: '#111',
                  userSelect: 'none',
                }}>
                  {label} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
              <th style={{ padding: '8px 12px', background: '#111', borderBottom: '2px solid #333', width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => {
              const isInactive = r.active === false;
              return (
                <tr key={r.id} onClick={() => setOpenRepId(r.id)} style={{
                  background: idx % 2 === 0 ? '#0e0e0e' : '#131313',
                  cursor: 'pointer', opacity: isInactive ? 0.45 : 1,
                  transition: 'background .1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#0e0e0e' : '#131313')}>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a1a', borderRight: '1px solid #141414' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: r.role === 'director' ? '#00F0FF' : '#fff', fontWeight: 700 }}>{r.name || r.email}</span>
                      {isInactive && <span style={{ fontSize: '8px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(255,96,96,.1)', border: '1px solid rgba(255,96,96,.25)', color: '#ff6060', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' }}>Inactive</span>}
                    </div>
                    <div style={{ fontSize: '10px', color: '#444', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>{r.email}</div>
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a1a', borderRight: '1px solid #141414' }}>
                    <span style={{
                      fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px',
                      background: r.role === 'director' ? 'rgba(0,240,255,.08)' : 'rgba(255,255,255,.04)',
                      border: `1px solid ${r.role === 'director' ? 'rgba(0,240,255,.2)' : '#1e1e1e'}`,
                      color: r.role === 'director' ? '#00F0FF' : '#888',
                      letterSpacing: '.1em', textTransform: 'uppercase',
                    }}>{r.role}</span>
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a1a', borderRight: '1px solid #141414', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: r.phone ? '#bbb' : '#333' }}>
                    {r.phone || 'No phone'}
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a1a', borderRight: '1px solid #141414', textAlign: 'center', fontFamily: 'monospace', color: r.stats.total_calls > 0 ? '#00F0FF' : '#444', fontWeight: 700 }}>
                    {r.stats.total_calls}
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a1a', borderRight: '1px solid #141414', textAlign: 'center', fontFamily: 'monospace', color: '#fff', fontWeight: 700 }}>
                    {r.stats.total_closes}
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a1a', borderRight: '1px solid #141414', textAlign: 'center', fontFamily: 'monospace', color: r.stats.pending_closes > 0 ? '#F59E0B' : '#444', fontWeight: 700 }}>
                    {r.stats.pending_closes}
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a1a', borderRight: '1px solid #141414', textAlign: 'center', fontFamily: 'monospace', color: r.stats.approved_points > 0 ? '#22c55e' : '#444', fontWeight: 700 }}>
                    {r.stats.approved_points}
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a1a', borderRight: '1px solid #141414', fontSize: '11px', color: r.stats.last_close_at ? '#ccc' : '#444' }}>
                    {fmtRelative(r.stats.last_close_at)}
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a1a', borderRight: '1px solid #141414', fontSize: '11px', color: r.stats.last_call_at ? '#ccc' : '#444' }}>
                    {fmtRelative(r.stats.last_call_at)}
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a1a', borderRight: '1px solid #141414', textAlign: 'center', fontFamily: 'monospace', color: r.stats.assigned_leads > 0 ? '#fff' : '#444', fontWeight: 700 }}>
                    {r.stats.assigned_leads}
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a1a', textAlign: 'center', color: '#555', fontSize: '14px' }}>
                    &rsaquo;
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: '12px' }}>
                  No reps {showInactive ? '' : '(toggle "Show inactive" to see deactivated)'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openRep && (
        <RepDetailDrawer
          rep={openRep}
          stats={openRep.stats}
          onClose={() => setOpenRepId(null)}
          onMutated={loadAll}
        />
      )}

      {inviteOpen && (
        <InviteRepModal
          existingNames={rows.map(r => r.name)}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </div>
  );
}
