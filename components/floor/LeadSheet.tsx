'use client';

// LeadSheet — the spreadsheet view of "my leads" on /floor.
//
// TanStack Table v8 + react-virtual v3. Per 2026-05-21 pre-build audit:
//   * getRowId = lead.id (stable UUID, never array index).
//   * Fixed 44px row height for virtualization math + scrolling smoothness.
//   * Column visibility persisted to localStorage per rep.
//   * useMemo on data + columns + filter/sort row models.
//   * Pinned-active-lead: when drawer is open, that lead stays rendered even
//     if current filter would have removed it (Gemini load-bearing catch —
//     prevents drawer-vanishes-mid-keystroke).

import { useMemo, useRef, useEffect, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { FloorLead } from './types';

const ROW_HEIGHT = 44;
const VIRTUALIZATION_THRESHOLD = 100;

interface LeadSheetProps {
  leads: FloorLead[];
  selectedLeadId: string | null;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onRowClick: (leadId: string) => void;
  repId: string;
}

function relativeTime(iso?: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

function nextActionFor(lead: FloorLead): { label: string; tone: 'overdue' | 'due' | 'fresh' | 'default' } {
  // Overdue callback?
  if (lead.callback_date) {
    const cb = new Date(lead.callback_date).getTime();
    if (!isNaN(cb)) {
      const now = Date.now();
      if (cb < now) return { label: 'CALLBACK OVERDUE', tone: 'overdue' };
      const minsUntil = Math.floor((cb - now) / 60000);
      if (minsUntil < 60) return { label: `CALLBACK · ${minsUntil} MIN`, tone: 'overdue' };
      if (minsUntil < 24 * 60) return { label: `CALLBACK · ${Math.floor(minsUntil / 60)}H ${minsUntil % 60}M`, tone: 'due' };
      return { label: `CALLBACK · ${Math.floor(minsUntil / (24 * 60))}D`, tone: 'default' };
    }
  }
  switch (lead.status) {
    case 'new': return { label: 'FIRST DIAL', tone: 'fresh' };
    case 'voicemail': return { label: 'RETRY DIAL', tone: 'default' };
    case 'no_show': return { label: 'NO-SHOW FOLLOWUP', tone: 'overdue' };
    case 'contacted': return { label: 'FOLLOW-UP', tone: 'default' };
    case 'callback': return { label: 'CALL BACK', tone: 'due' };
    case 'booked': return { label: 'CONFIRM BOOKING', tone: 'due' };
    case 'discovery_completed': return { label: 'AWAITING CLOSE', tone: 'fresh' };
    case 'not_interested': return { label: '30D NURTURE', tone: 'default' };
    case 'wrong_number': return { label: 'BAD NUMBER', tone: 'default' };
    default: return { label: '—', tone: 'default' };
  }
}

const STATUS_LABELS: Record<string, string> = {
  new: 'NEW', contacted: 'CONTACTED', callback: 'CALLBACK', not_interested: 'NOT INT.',
  booked: 'BOOKED', discovery_completed: 'DISC. DONE', no_show: 'NO SHOW',
  wrong_number: 'WRONG #', voicemail: 'VOICEMAIL',
};

const STATUS_COLORS: Record<string, { fg: string; bg: string; border: string }> = {
  new: { fg: '#00F0FF', bg: 'rgba(0,240,255,.08)', border: 'rgba(0,240,255,.3)' },
  contacted: { fg: '#F59E0B', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.3)' },
  callback: { fg: '#F59E0B', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.3)' },
  not_interested: { fg: '#ff6060', bg: 'rgba(255,68,68,.06)', border: 'rgba(255,68,68,.25)' },
  booked: { fg: '#22c55e', bg: 'rgba(34,197,94,.08)', border: 'rgba(34,197,94,.3)' },
  discovery_completed: { fg: '#00F0FF', bg: 'rgba(0,240,255,.08)', border: 'rgba(0,240,255,.3)' },
  no_show: { fg: '#ff8800', bg: 'rgba(255,136,0,.08)', border: 'rgba(255,136,0,.3)' },
  wrong_number: { fg: '#ff6060', bg: 'rgba(255,68,68,.06)', border: 'rgba(255,68,68,.25)' },
  voicemail: { fg: '#888', bg: '#111', border: '#252525' },
};

function initialsOf(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function LeadSheet({ leads, selectedLeadId, searchQuery, onSearchQueryChange, onRowClick, repId }: LeadSheetProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'next_action_due_at', desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(`pmss_floor_col_vis_${repId}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem(`pmss_floor_col_vis_${repId}`, JSON.stringify(columnVisibility)); } catch {}
  }, [columnVisibility, repId]);

  // Stable reference — TanStack reads it as `data`. No memo override needed
  // here because the pinned-active-lead protection lives at the filter level
  // (globalFilterFn below) where it can survive TanStack's filtering pass.
  const data: FloorLead[] = leads;

  // Pinned-active-lead globalFilterFn (Gemini load-bearing catch 2026-05-21).
  // Override default includesString so the row matching `selectedLeadId` is
  // ALWAYS included in the filtered model — even when the rep's search term
  // wouldn't match it. Prevents drawer-vanishes-mid-keystroke when rep is
  // editing a lead whose status change pulls it out of the current view.
  const globalFilterFn = useMemo(
    () => (row: { original: FloorLead }, _columnId: string, filterValue: string) => {
      if (selectedLeadId && row.original.id === selectedLeadId) return true;
      if (!filterValue) return true;
      const v = String(filterValue).toLowerCase();
      const l = row.original;
      return (
        (l.business_name || '').toLowerCase().includes(v) ||
        (l.contact_name || '').toLowerCase().includes(v) ||
        (l.phone || '').toLowerCase().includes(v) ||
        (l.niche || '').toLowerCase().includes(v) ||
        (l.notes || '').toLowerCase().includes(v)
      );
    },
    [selectedLeadId],
  );

  // TanStack rowSelection derived from URL — spec decision #2 (2026-05-21
  // pre-build audit). Selection state is single-select keyed by lead.id.
  const rowSelection = useMemo(
    () => (selectedLeadId ? { [selectedLeadId]: true } : {}),
    [selectedLeadId],
  );

  const columns = useMemo<ColumnDef<FloorLead>[]>(() => [
    {
      id: 'idx',
      header: '#',
      cell: ({ row }) => (
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: '#555' }}>
          {row.index + 1}
        </span>
      ),
      enableSorting: false,
      enableGlobalFilter: false,
      size: 40,
    },
    {
      id: 'business',
      accessorKey: 'business_name',
      header: 'BUSINESS',
      cell: ({ row }) => {
        const l = row.original;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: 'rgba(0,240,255,.06)', border: '1px solid rgba(0,240,255,.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 10, color: '#00F0FF',
            }}>{initialsOf(l.business_name)}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.business_name}</div>
              <div style={{ color: '#888', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.contact_name ? `${l.contact_name} · ${l.niche || ''}` : (l.niche || '')}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'phone',
      accessorKey: 'phone',
      header: 'PHONE',
      cell: ({ getValue }) => (
        <a
          href={`tel:${String(getValue() || '')}`}
          onClick={(e) => e.stopPropagation()}
          style={{ color: '#00F0FF', textDecoration: 'none', fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}
        >
          {String(getValue() || '—')}
        </a>
      ),
      size: 140,
    },
    {
      id: 'niche',
      accessorKey: 'niche',
      header: 'NICHE',
      cell: ({ getValue }) => (
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
          {String(getValue() || '').slice(0, 8)}
        </span>
      ),
      size: 90,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'STATUS',
      cell: ({ getValue }) => {
        const s = String(getValue() || 'new');
        const c = STATUS_COLORS[s] || STATUS_COLORS.voicemail;
        return (
          <span style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 800, letterSpacing: '.12em',
            padding: '4px 8px', borderRadius: 4, background: c.bg, border: `1px solid ${c.border}`, color: c.fg,
          }}>{STATUS_LABELS[s] || s.toUpperCase()}</span>
        );
      },
      size: 110,
    },
    {
      id: 'last_touch_at',
      accessorKey: 'last_touch_at',
      header: 'LAST TOUCH',
      cell: ({ getValue }) => (
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#888' }}>
          {relativeTime(getValue() as string)}
        </span>
      ),
      sortingFn: (a, b) => {
        const av = a.original.last_touch_at ? new Date(a.original.last_touch_at).getTime() : 0;
        const bv = b.original.last_touch_at ? new Date(b.original.last_touch_at).getTime() : 0;
        return bv - av;
      },
      size: 110,
    },
    {
      id: 'next_action_due_at',
      header: 'NEXT ACTION',
      accessorFn: (row) => row.callback_date || '',
      cell: ({ row }) => {
        const na = nextActionFor(row.original);
        const color = na.tone === 'overdue' ? '#ff6060' : na.tone === 'due' ? '#F59E0B' : na.tone === 'fresh' ? '#00F0FF' : '#888';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}` }} />
            {na.label}
          </div>
        );
      },
      sortingFn: (a, b) => {
        // Overdue first → today → tomorrow → no callback.
        const av = a.original.callback_date ? new Date(a.original.callback_date).getTime() : Number.POSITIVE_INFINITY;
        const bv = b.original.callback_date ? new Date(b.original.callback_date).getTime() : Number.POSITIVE_INFINITY;
        return av - bv;
      },
      size: 160,
    },
    {
      id: 'touch_count',
      accessorKey: 'touch_count',
      header: 'TC',
      cell: ({ getValue }) => {
        const v = Number(getValue() || 0);
        return (
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, color: v === 0 ? '#555' : '#ccc', textAlign: 'center', display: 'block' }}>
            {v}
          </span>
        );
      },
      size: 50,
    },
    {
      id: 'connect_count',
      accessorKey: 'connect_count',
      header: 'CC',
      cell: ({ getValue }) => {
        const v = Number(getValue() || 0);
        return (
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, color: v === 0 ? '#555' : '#ccc', textAlign: 'center', display: 'block' }}>
            {v}
          </span>
        );
      },
      size: 50,
    },
    {
      id: 'action',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${row.original.phone || ''}`; }}
          aria-label={`Call ${row.original.business_name}`}
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(0,240,255,.06)', border: '1px solid rgba(0,240,255,.3)',
            color: '#00F0FF', cursor: 'pointer', fontSize: 13,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >☎</button>
      ),
      enableSorting: false,
      enableGlobalFilter: false,
      size: 60,
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: searchQuery, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: (v) => onSearchQueryChange(typeof v === 'function' ? v(searchQuery) : String(v ?? '')),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      // Single-select derived from URL. We intercept any selection change
      // (e.g. shift-click multi-select) and pipe the first row's id back to
      // the parent, which updates the URL and re-derives state here.
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      const ids = Object.keys(next).filter((k) => next[k]);
      if (ids[0]) onRowClick(ids[0]);
    },
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn,
    enableMultiRowSelection: false,
  });

  const rows = table.getRowModel().rows;
  const parentRef = useRef<HTMLDivElement>(null);

  // Audit-locked: virtualize when row count > threshold.
  const shouldVirtualize = rows.length > VIRTUALIZATION_THRESHOLD;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  return (
    <div style={{ maxWidth: 1640, margin: '0 auto', padding: '20px 24px 60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#00F0FF', marginBottom: 6 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#00F0FF', boxShadow: '0 0 6px rgba(0,240,255,.8)', marginRight: 8, verticalAlign: 'middle' }} />
            Sales Floor
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.01em', color: '#fff' }}>
            My Leads · {data.length}
          </h1>
        </div>
        <input
          type="text"
          placeholder="🔍 Search business, contact, phone…"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          style={{
            background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 8,
            padding: '9px 14px', color: '#fff', fontSize: 13, width: 320,
            fontFamily: 'Inter, sans-serif',
          }}
        />
      </div>

      {/* Sheet */}
      <div
        ref={parentRef}
        style={{
          background: '#080808', border: '1px solid #1e1e1e', borderRadius: 12,
          maxHeight: 'calc(100vh - 180px)', overflowY: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: '#0d0d0d' }}>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    style={{
                      width: header.column.columnDef.size,
                      padding: '11px 14px', textAlign: 'left',
                      fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700,
                      letterSpacing: '.14em', textTransform: 'uppercase', color: '#888',
                      borderBottom: '1px solid #1e1e1e',
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && <span style={{ marginLeft: 4, color: '#00F0FF' }}>↑</span>}
                    {header.column.getIsSorted() === 'desc' && <span style={{ marginLeft: 4, color: '#00F0FF' }}>↓</span>}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {shouldVirtualize && paddingTop > 0 && (
              <tr style={{ height: paddingTop }}><td colSpan={columns.length} /></tr>
            )}
            {(shouldVirtualize ? virtualRows : rows.map((_, i) => ({ index: i, start: 0, end: 0, size: 0, key: i }))).map((vRow) => {
              const row = rows[vRow.index];
              if (!row) return null;
              const isSelected = row.original.id === selectedLeadId;
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row.original.id)}
                  style={{
                    height: ROW_HEIGHT,
                    borderBottom: '1px solid #1a1a1a',
                    background: isSelected ? 'rgba(0,240,255,.08)' : 'transparent',
                    boxShadow: isSelected ? 'inset 2px 0 0 #00F0FF' : 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(0,240,255,.04)'; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{
                        padding: '0 14px',
                        fontSize: 13, color: '#ccc',
                        verticalAlign: 'middle',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {shouldVirtualize && paddingBottom > 0 && (
              <tr style={{ height: paddingBottom }}><td colSpan={columns.length} /></tr>
            )}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px 14px', color: '#555', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
                  No leads match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
