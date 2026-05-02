'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Rep } from '@/lib/types';
import { reportClientError } from '@/lib/error-reporting';
import { audit, auditFromLocalStorage } from '@/lib/audit';

interface Props {
  selectedIds: string[];
  reps: Rep[];
  onAssigned: () => void;
  onClear: () => void;
  onSelectAllVisible: () => void;
  visibleCount: number;
}

export default function BulkAssignBar({ selectedIds, reps, onAssigned, onClear, onSelectAllVisible, visibleCount }: Props) {
  const [targetRepId, setTargetRepId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const activeReps = reps.filter(r => r.active !== false);
  const target = activeReps.find(r => r.id === targetRepId);

  const assign = async () => {
    if (!target || selectedIds.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from('leads').update({ assigned_rep_id: target.id }).in('id', selectedIds);
    setBusy(false);
    setConfirming(false);
    if (error) {
      reportClientError('BulkAssignBar.assign', error, { count: selectedIds.length, repId: target.id }, 'reps-tab-v1');
      alert('Bulk assign failed: ' + error.message);
      return;
    }
    audit(auditFromLocalStorage({
      actionType: 'leads.bulk_assigned',
      targetType: 'rep', targetId: target.id,
      metadata: { count: selectedIds.length, rep_name: target.name, source: 'bulk_bar' },
    }));
    setTargetRepId('');
    onAssigned();
  };

  const unassign = async () => {
    if (selectedIds.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from('leads').update({ assigned_rep_id: null }).in('id', selectedIds);
    setBusy(false);
    if (error) {
      reportClientError('BulkAssignBar.unassign', error, { count: selectedIds.length }, 'reps-tab-v1');
      alert('Bulk unassign failed: ' + error.message);
      return;
    }
    audit(auditFromLocalStorage({
      actionType: 'leads.bulk_unassigned',
      metadata: { count: selectedIds.length, source: 'bulk_bar' },
    }));
    onAssigned();
  };

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 5,
      background: '#0a0a0a', border: '1px solid rgba(0,240,255,.25)', borderRadius: '8px',
      padding: '10px 14px', marginBottom: '10px',
      display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#00F0FF', fontFamily: 'JetBrains Mono, monospace' }}>
          {selectedIds.length} selected
        </span>
        {selectedIds.length < visibleCount && (
          <button onClick={onSelectAllVisible}
            style={{ padding: '3px 10px', borderRadius: '4px', border: '1px solid #1e1e1e', background: 'transparent', color: '#888', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
            Select all visible ({visibleCount})
          </button>
        )}
        <button onClick={onClear}
          style={{ padding: '3px 10px', borderRadius: '4px', border: '1px solid #1e1e1e', background: 'transparent', color: '#888', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
          Clear
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#444', letterSpacing: '.1em', textTransform: 'uppercase' }}>Assign to:</span>
        <select value={targetRepId} onChange={e => setTargetRepId(e.target.value)}
          style={{ padding: '6px 10px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', fontSize: '12px', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
          <option value="">— pick rep —</option>
          {activeReps.map(r => (
            <option key={r.id} value={r.id}>{r.name}{r.role === 'director' ? ' (Director)' : ''}</option>
          ))}
        </select>
        <button onClick={() => setConfirming(true)} disabled={!target || busy || selectedIds.length === 0}
          style={{
            padding: '6px 16px', borderRadius: '6px', cursor: (!target || busy || selectedIds.length === 0) ? 'not-allowed' : 'pointer',
            border: 'none', background: '#00F0FF', color: '#000', fontSize: '11px', fontWeight: 800,
            opacity: (!target || busy || selectedIds.length === 0) ? 0.4 : 1,
          }}>
          {busy ? '...' : 'Assign'}
        </button>
        <button onClick={unassign} disabled={busy || selectedIds.length === 0}
          style={{
            padding: '6px 14px', borderRadius: '6px', cursor: (busy || selectedIds.length === 0) ? 'not-allowed' : 'pointer',
            border: '1px solid rgba(255,96,96,.3)', background: 'rgba(255,96,96,.08)', color: '#ff6060',
            fontSize: '11px', fontWeight: 700, opacity: (busy || selectedIds.length === 0) ? 0.4 : 1,
          }}>
          Unassign
        </button>
      </div>

      {confirming && target && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => !busy && setConfirming(false)}>
          <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '20px 22px', maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 800, color: '#fff' }}>
              Assign {selectedIds.length} {selectedIds.length === 1 ? 'lead' : 'leads'} to {target.name}?
            </p>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
              Any existing assignments on these leads will be replaced. This cannot be undone in bulk — you'd need to reassign or unassign manually.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirming(false)} disabled={busy}
                style={{ padding: '7px 16px', borderRadius: '6px', border: '1px solid #2a2a2a', background: 'transparent', color: '#888', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={assign} disabled={busy}
                style={{ padding: '7px 16px', borderRadius: '6px', cursor: busy ? 'wait' : 'pointer', border: 'none', background: '#00F0FF', color: '#000', fontSize: '11px', fontWeight: 800, opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Assigning...' : 'Confirm assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
