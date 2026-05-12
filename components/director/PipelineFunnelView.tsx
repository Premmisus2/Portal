'use client';

import { useState } from 'react';
import type { Lead, Rep } from '@/lib/types';

interface PipelineFunnelViewProps {
  leads: Lead[];
  reps: Rep[];
}

export default function PipelineFunnelView({ leads, reps }: PipelineFunnelViewProps) {
  const [filterRep, setFilterRep] = useState('all');

  const filtered = filterRep === 'all' ? leads : leads.filter(l => l.assigned_rep_id === filterRep);
  const total = filtered.length;

  const stages = [
    { key: 'new', label: 'New Leads', color: 'var(--accent-ink)', statuses: ['new'] },
    { key: 'contacted', label: 'Contacted', color: 'var(--amber)', statuses: ['contacted', 'voicemail'] },
    { key: 'callback', label: 'Callback', color: 'var(--amber)', statuses: ['callback'] },
    { key: 'booked', label: 'Booked', color: 'var(--green)', statuses: ['booked'] },
    { key: 'discovery', label: 'Discovery Booked', color: 'var(--accent-ink)', statuses: ['discovery_completed'] },
    { key: 'noshow', label: 'No Show', color: '#ff8800', statuses: ['no_show'] },
  ];
  const dropoffs = [
    { key: 'not_interested', label: 'Not Interested', color: 'var(--red)', statuses: ['not_interested'] },
    { key: 'wrong_number', label: 'Wrong Number', color: 'var(--red)', statuses: ['wrong_number'] },
  ];

  const counts: Record<string, number> = {};
  stages.concat(dropoffs).forEach(s => {
    counts[s.key] = filtered.filter(l => s.statuses.includes(l.status)).length;
  });

  const maxCount = Math.max(...stages.map(s => counts[s.key]), 1);

  return (
    <div className="fadein">
      {/* Rep Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Filter by Rep</label>
        <select
          value={filterRep}
          onChange={e => setFilterRep(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-elev-pill)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'Inter,sans-serif' }}
        >
          <option value="all">All Reps</option>
          {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{total} total leads</span>
      </div>

      {/* Funnel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '24px' }}>
        {stages.map((stage, i) => {
          const count = counts[stage.key];
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
          const barWidth = maxCount > 0 ? Math.max((count / maxCount) * 100, 8) : 8;
          const prevCount = i > 0 ? counts[stages[i - 1].key] : total;
          const convRate = prevCount > 0 && i > 0 ? ((count / prevCount) * 100).toFixed(0) : null;

          return (
            <div key={stage.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
                <div style={{ width: '130px', flexShrink: 0, textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: stage.color }}>{stage.label}</p>
                  {convRate !== null && (
                    <p style={{ margin: '2px 0 0', fontSize: '9px', color: 'var(--text-faint)', fontFamily: 'monospace' }}>{convRate}% from prev</p>
                  )}
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <div style={{ height: '36px', background: 'var(--bg-sidebar-line)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%', borderRadius: '6px',
                      background: `linear-gradient(90deg, ${stage.color}22, ${stage.color}44)`,
                      border: `1px solid ${stage.color}55`,
                      width: `${barWidth}%`,
                      transition: 'width .7s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '12px',
                      minWidth: '60px',
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: stage.color, fontFamily: 'monospace' }}>{count}</span>
                    </div>
                  </div>
                </div>
                <div style={{ width: '60px', flexShrink: 0, textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{pct}%</span>
                </div>
              </div>
              {i < stages.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingLeft: '130px' }}>
                  <div style={{ width: '2px', height: '12px', background: 'var(--border-soft)' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Drop-offs */}
      <div className="card" style={{ padding: '16px 20px', borderColor: 'var(--border-soft)' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--red)', margin: '0 0 12px' }}>Drop-offs</p>
        <div style={{ display: 'flex', gap: '20px' }}>
          {dropoffs.map(d => (
            <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: d.color, fontFamily: 'monospace' }}>{counts[d.key]}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginTop: '16px' }}>
        {(() => {
          const contacted = counts.contacted + counts.callback;
          const booked = counts.booked;
          const discovery = counts.discovery;
          const contactRate = total > 0 ? ((contacted / total) * 100).toFixed(0) : '0';
          const bookRate = contacted > 0 ? ((booked / contacted) * 100).toFixed(0) : '0';
          const showRate = (booked + counts.noshow) > 0 ? ((discovery / (booked + counts.noshow + discovery)) * 100).toFixed(0) : '0';
          return [
            { label: 'Contact Rate', value: `${contactRate}%`, sub: `${contacted} of ${total} leads`, color: 'var(--amber)' },
            { label: 'Book Rate', value: `${bookRate}%`, sub: `${booked} of ${contacted} contacted`, color: 'var(--green)' },
            { label: 'Show Rate', value: `${showRate}%`, sub: `${discovery} of ${discovery + counts.noshow} scheduled`, color: 'var(--accent-ink)' },
          ];
        })().map(m => (
          <div key={m.label} className="card-glow" style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: m.color, margin: '0 0 6px' }}>{m.label}</p>
            <p style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, fontFamily: 'monospace' }}>{m.value}</p>
            <p style={{ fontSize: '10px', color: 'var(--text-faint)', margin: '4px 0 0' }}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Lead Source Attribution */}
      <div className="card" style={{ padding: '16px 20px', borderColor: 'var(--border-soft)', marginTop: '16px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#a855f7', margin: '0 0 14px' }}>Lead Sources</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(() => {
            const sourceMap: Record<string, number> = {};
            filtered.forEach(l => { const s = l.source || 'unknown'; sourceMap[s] = (sourceMap[s] || 0) + 1; });
            const sourceLabels: Record<string, string> = { warm_import: 'Warm Import', cold_import: 'Cold Import', csv_import: 'CSV Import', website: 'Website', manual: 'Manual Entry', cold_call: 'Cold Call', dm: 'DM Outreach', referral: 'Referral', unknown: 'Unknown' };
            const sourceColors: Record<string, string> = { warm_import: 'var(--amber)', cold_import: 'var(--accent-ink)', csv_import: 'var(--accent-ink)', website: 'var(--green)', manual: 'var(--text-tertiary)', cold_call: '#a855f7', dm: '#ec4899', referral: 'var(--green)', unknown: 'var(--text-faint)' };
            const sorted = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]);
            const maxSrc = sorted.length > 0 ? sorted[0][1] : 1;
            return sorted.map(([src, count]) => (
              <div key={src} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '100px', flexShrink: 0, fontSize: '11px', fontWeight: 600, color: sourceColors[src] || 'var(--text-tertiary)', textAlign: 'right' }}>{sourceLabels[src] || src}</span>
                <div style={{ flex: 1, height: '20px', background: 'var(--bg-sidebar-line)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '4px', background: `${sourceColors[src] || 'var(--text-tertiary)'}33`, border: `1px solid ${sourceColors[src] || 'var(--text-tertiary)'}44`, width: `${Math.max((count / maxSrc) * 100, 8)}%`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', minWidth: '40px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: sourceColors[src] || 'var(--text-tertiary)', fontFamily: 'monospace' }}>{count}</span>
                  </div>
                </div>
                <span style={{ width: '40px', fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'monospace', textAlign: 'right' }}>{total > 0 ? ((count / total) * 100).toFixed(0) : 0}%</span>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Niche Breakdown */}
      <div className="card" style={{ padding: '16px 20px', borderColor: 'var(--border-soft)', marginTop: '12px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--accent-ink)', margin: '0 0 14px' }}>By Niche</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {(() => {
            const nicheMap: Record<string, number> = {};
            filtered.forEach(l => { const n = l.niche || 'Unknown'; nicheMap[n] = (nicheMap[n] || 0) + 1; });
            return Object.entries(nicheMap).sort((a, b) => b[1] - a[1]).map(([niche, count]) => (
              <div key={niche} style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--bg-elev-pill)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>{niche}</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{count}</span>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
