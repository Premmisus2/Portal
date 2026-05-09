'use client';

import { useState, useEffect } from 'react';
import { supabase as sb } from '@/lib/supabase';
import { NICHE_LIST, OUTCOME_COLORS, OUTCOME_LABELS } from '@/lib/constants';
import { todayInToronto } from '@/lib/date';
import type { Rep, Lead, CallLog } from '@/lib/types';
import BulkAssignBar from '@/components/director/BulkAssignBar';

interface AllLeadsTableProps {
  reps: Rep[];
}

const statusLabels: Record<string, string> = { new: 'New', contacted: 'Contacted', callback: 'Callback', not_interested: 'Not Interested', booked: 'Booked', discovery_completed: 'Discovery Booked', no_show: 'No Show', wrong_number: 'Wrong Number', voicemail: 'Voicemail' };
const statusColors: Record<string, string> = { new: '#00F0FF', contacted: '#F59E0B', callback: '#F59E0B', not_interested: '#ff6060', booked: '#22c55e', discovery_completed: '#00F0FF', no_show: '#ff8800', wrong_number: '#ff6060', voicemail: '#888' };
const groupColorMap: Record<string, string> = { HOT: '#ff6060', HIGH: '#F59E0B', MEDIUM: '#888' };

const EDITABLE_FIELDS = (reps: Rep[]) => [
  { key: 'business_name', label: 'Business Name', required: true },
  { key: 'contact_name', label: 'Contact Name' },
  { key: 'niche', label: 'Niche', required: true },
  { key: 'category', label: 'Category' },
  { key: 'city', label: 'City' },
  { key: 'address', label: 'Address' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
  { key: 'email', label: 'Email' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'google_reviews', label: 'Reviews', type: 'number' },
  { key: 'priority', label: 'Priority', type: 'select', options: ['HOT', 'HIGH', 'MEDIUM'] },
  { key: 'status', label: 'Status', type: 'select', options: Object.keys(statusLabels) },
  { key: 'outreach_channel', label: 'Outreach Channel' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
  { key: 'source_tag', label: 'Source Tag' },
  { key: 'assigned_rep_id', label: 'Assigned Rep', type: 'select', options: reps.map(r => ({ value: r.id, label: r.role === 'director' ? `${r.name} (You)` : r.name })) },
];

interface LeadModalProps {
  lead: Record<string, unknown> | null;
  onSave: (form: Record<string, unknown>) => void;
  onClose: () => void;
  saving: boolean;
  reps: Rep[];
}

function LeadModal({ lead, onSave, onClose, saving, reps }: LeadModalProps) {
  const [form, setForm] = useState<Record<string, unknown>>(lead || { business_name: '', niche: '', priority: 'HOT', status: 'new', source: 'manual' });
  const set = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));
  const inputStyle = { width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', padding: '8px 10px', color: '#fff', fontSize: '13px', fontFamily: 'Inter,sans-serif', outline: 'none' as const };
  const fields = EDITABLE_FIELDS(reps);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '24px', width: '600px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#fff', fontFamily: 'Inter,sans-serif' }}>{(lead as Record<string, unknown>)?.id ? 'Edit Lead' : 'Add Lead'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {fields.map(f => (
            <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? '1 / -1' : undefined }}>
              <label style={{ display: 'block', fontSize: '10px', color: '#888', fontWeight: 700, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.05em' }}>{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'select' ? (
                <select value={(form[f.key] as string) || ''} onChange={e => set(f.key, e.target.value || null)} style={inputStyle}>
                  <option value="">&mdash;</option>
                  {(Array.isArray(f.options) ? f.options : []).map((o: string | { value: string; label: string }) => typeof o === 'object'
                    ? <option key={o.value} value={o.value}>{o.label}</option>
                    : <option key={o} value={o}>{f.key === 'status' ? statusLabels[o] : o}</option>
                  )}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea value={(form[f.key] as string) || ''} onChange={e => set(f.key, e.target.value)} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
              ) : (
                <input type={f.type || 'text'} value={(form[f.key] as string) ?? ''} onChange={e => set(f.key, f.type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value)} style={inputStyle} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: '4px', border: '1px solid #333', background: 'transparent', color: '#888', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.business_name || !form.niche} style={{ padding: '8px 20px', borderRadius: '4px', border: 'none', background: '#00F0FF', color: '#000', cursor: saving ? 'wait' : 'pointer', fontSize: '12px', fontWeight: 700, opacity: saving ? .6 : 1 }}>{saving ? 'Saving...' : ((lead as Record<string, unknown>)?.id ? 'Save Changes' : 'Add Lead')}</button>
        </div>
      </div>
    </div>
  );
}

export default function AllLeadsTable({ reps }: AllLeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<Record<string, CallLog>>({});
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState('business_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterNiche, setFilterNiche] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterRep, setFilterRep] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterBatch, setFilterBatch] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editingLead, setEditingLead] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [batches, setBatches] = useState<{ id: string; label: string; source_type: string; created_at: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 100;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    let allLeads: Lead[] = [], from = 0;
    while (true) {
      const { data, error } = await sb.from('leads').select('*, reps(name)').order('created_at', { ascending: false }).range(from, from + 999);
      if (error || !data || data.length === 0) break;
      allLeads = allLeads.concat(data as unknown as Lead[]);
      if (data.length < 1000) break;
      from += 1000;
    }
    setLeads(allLeads);
    let allLogs: CallLog[] = [], logFrom = 0;
    while (true) {
      const { data } = await sb.from('call_logs').select('*, reps:rep_id(name)').order('created_at', { ascending: false }).range(logFrom, logFrom + 999);
      if (!data || data.length === 0) break;
      allLogs = allLogs.concat(data as unknown as CallLog[]);
      if (data.length < 1000) break;
      logFrom += 1000;
    }
    const logMap: Record<string, CallLog> = {};
    allLogs.forEach(log => { if (log.lead_id && !logMap[log.lead_id]) logMap[log.lead_id] = log; });
    setCallLogs(logMap);
    const { data: batchData } = await sb.from('import_batches').select('id, label, source_type, created_at').order('created_at', { ascending: false });
    setBatches(batchData || []);
    setLoading(false);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(0);
  };

  const uniqueSourceTags = [...new Set(leads.map(l => (l as unknown as Record<string, string>).source_tag).filter(Boolean))].sort();

  const filtered = leads
    .filter(l => filterNiche === 'all' || l.niche === filterNiche)
    .filter(l => filterStatus === 'all' || l.status === filterStatus)
    .filter(l => filterPriority === 'all' || l.priority === filterPriority)
    .filter(l => filterRep === 'all' || (filterRep === 'unassigned' ? !l.assigned_rep_id : l.assigned_rep_id === filterRep))
    .filter(l => filterSource === 'all' || (l as unknown as Record<string, string>).source_tag === filterSource)
    .filter(l => filterBatch === 'all' || l.batch_id === filterBatch)
    .filter(l => !search || l.business_name?.toLowerCase().includes(search.toLowerCase()) || l.contact_name?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search) || l.city?.toLowerCase().includes(search.toLowerCase()) || (l as unknown as Record<string, string>).source_tag?.toLowerCase().includes(search.toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    let va: unknown = (a as unknown as Record<string, unknown>)[sortCol];
    let vb: unknown = (b as unknown as Record<string, unknown>)[sortCol];
    if (sortCol === 'assigned_rep') { va = a.reps?.name || ''; vb = b.reps?.name || ''; }
    if (sortCol === 'last_outcome') { va = callLogs[a.id]?.outcome || ''; vb = callLogs[b.id]?.outcome || ''; }
    if (sortCol === 'callback_date') { va = callLogs[a.id]?.callback_date || ''; vb = callLogs[b.id]?.callback_date || ''; }
    if (va == null) va = '';
    if (vb == null) vb = '';
    if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
    return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const getGroupKey = (lead: Lead) => {
    if (groupBy === 'niche') return lead.niche || 'Unknown';
    if (groupBy === 'source_tag') return (lead as unknown as Record<string, string>).source_tag || 'No Source Tag';
    if (groupBy === 'city') return lead.city || 'Unknown City';
    if (groupBy === 'priority') return lead.priority || 'Unknown';
    return 'all';
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const groups = groupBy !== 'none' ? (() => {
    const map: Record<string, Lead[]> = {};
    sorted.forEach(lead => {
      const key = getGroupKey(lead);
      if (!map[key]) map[key] = [];
      map[key].push(lead);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  })() : null;

  const paged = groupBy === 'none' ? sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : [];
  const totalPages = groupBy === 'none' ? Math.ceil(sorted.length / PAGE_SIZE) : 0;

  const saveLead = async (formData: Record<string, unknown>) => {
    setSaving(true);
    if (formData.id) {
      const { id, reps: _, created_at: _ca, updated_at: _ua, ...updates } = formData;
      const { error } = await sb.from('leads').update(updates).eq('id', id as string);
      if (error) { alert('Failed to update lead: ' + error.message); setSaving(false); return; }
    } else {
      const { id: _id, reps: _, ...newLead } = formData;
      const { error } = await sb.from('leads').insert(newLead);
      if (error) { alert('Failed to create lead: ' + error.message); setSaving(false); return; }
    }
    setEditingLead(null);
    setSaving(false);
    await loadAll();
  };

  const deleteLead = async (id: string) => {
    setDeleting(id);
    await sb.from('call_logs').delete().eq('lead_id', id);
    await sb.from('lead_assignments').delete().eq('lead_id', id);
    await sb.from('leads').delete().eq('id', id);
    setDeleting(null);
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const thStyle = (col: string): React.CSSProperties => ({
    padding: '6px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '.02em',
    color: sortCol === col ? '#00F0FF' : '#c0c0c0', cursor: 'pointer', whiteSpace: 'nowrap',
    borderBottom: '2px solid #333', borderRight: '1px solid #1a1a1a',
    background: '#111', position: 'sticky', top: 0, zIndex: 1, userSelect: 'none',
  });
  const tdStyle: React.CSSProperties = { padding: '5px 12px', borderBottom: '1px solid #1a1a1a', borderRight: '1px solid #141414', fontSize: '12px', whiteSpace: 'nowrap', color: '#ddd' };
  const rowNumStyle: React.CSSProperties = { ...tdStyle, color: '#555', textAlign: 'center', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600, width: '40px', minWidth: '40px', background: '#0c0c0c', borderRight: '2px solid #222' };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}><svg style={{ animation: 'spin 1s linear infinite' }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg></div>;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const visibleIds = groupBy === 'none'
      ? paged.map(l => l.id)
      : (groups || []).flatMap(([, leads]) => leads.slice(0, 50).map(l => l.id));
    setSelectedIds(new Set(visibleIds));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const renderRow = (lead: Lead, idx: number, globalIdx: number) => {
    const lastLog = callLogs[lead.id];
    const isEven = idx % 2 === 0;
    const isSelected = selectedIds.has(lead.id);
    return (
      <tr key={lead.id} style={{
        background: isSelected ? 'rgba(0,240,255,.08)' : (isEven ? '#0e0e0e' : '#131313'),
        transition: 'background .1s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = isSelected ? 'rgba(0,240,255,.14)' : '#1a1a1a')}
        onMouseLeave={e => (e.currentTarget.style.background = isSelected ? 'rgba(0,240,255,.08)' : (isEven ? '#0e0e0e' : '#131313'))}>
        <td style={{ ...tdStyle, textAlign: 'center', width: '36px', minWidth: '36px', padding: '4px 0', borderRight: '1px solid #141414' }}>
          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)} style={{ accentColor: '#00F0FF', cursor: 'pointer' }} />
        </td>
        <td style={rowNumStyle}>{globalIdx}</td>
        <td style={{ ...tdStyle, color: '#fff', fontWeight: 600, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.business_name}</td>
        <td style={{ ...tdStyle, color: '#aaa', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.contact_name || '\u2014'}</td>
        <td style={tdStyle}><span className="niche-badge">{lead.niche}</span></td>
        <td style={{ ...tdStyle, color: '#ccc' }}>{lead.city || '\u2014'}</td>
        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '11px' }}>{lead.phone ? <a href={`tel:${lead.phone}`} style={{ color: '#00F0FF', textDecoration: 'none' }}>{lead.phone}</a> : <span style={{ color: '#333' }}>&mdash;</span>}</td>
        <td style={{ ...tdStyle, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.website ? <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4da6ff', textDecoration: 'underline', textDecorationColor: '#4da6ff44', fontSize: '11px' }}>{lead.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 30)}</a> : <span style={{ color: '#333' }}>&mdash;</span>}</td>
        <td style={{ ...tdStyle, color: '#aaa', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '11px' }}>{lead.email ? <a href={`mailto:${lead.email}`} style={{ color: '#aaa', textDecoration: 'none' }}>{lead.email}</a> : <span style={{ color: '#333' }}>&mdash;</span>}</td>
        <td style={{ ...tdStyle, textAlign: 'center', color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>{lead.google_reviews ?? '\u2014'}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}><span className={`priority-${lead.priority?.toLowerCase()}`}>{lead.priority}</span></td>
        <td style={{ ...tdStyle, textAlign: 'center' }}><span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, background: `${statusColors[lead.status] || '#555'}20`, color: statusColors[lead.status] || '#555' }}>{statusLabels[lead.status] || lead.status}</span></td>
        <td style={{ ...tdStyle, color: lead.reps?.name ? '#00F0FF' : '#444', fontSize: '11px' }}>{lead.reps?.name || 'Unassigned'}</td>
        <td style={tdStyle}>{lastLog ? <span style={{ fontSize: '10px', color: OUTCOME_COLORS[lastLog.outcome] || '#555', fontWeight: 600 }}>{OUTCOME_LABELS[lastLog.outcome]}</span> : <span style={{ color: '#333' }}>&mdash;</span>}</td>
        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '11px', color: lastLog?.callback_date ? (lastLog.callback_date < todayInToronto() ? '#ff6060' : '#F59E0B') : '#333' }}>{lastLog?.callback_date || '\u2014'}</td>
        <td style={{ ...tdStyle, borderRight: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>
          <button onClick={() => setEditingLead(lead as unknown as Record<string, unknown>)} style={{ background: 'none', border: 'none', color: '#00F0FF', cursor: 'pointer', fontSize: '11px', fontWeight: 700, padding: '2px 6px', marginRight: '4px' }}>Edit</button>
          <button onClick={() => { if (confirm(`Delete "${lead.business_name}"?`)) deleteLead(lead.id); }} disabled={deleting === lead.id} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: deleting === lead.id ? 'wait' : 'pointer', fontSize: '11px', fontWeight: 700, padding: '2px 6px', opacity: deleting === lead.id ? .4 : 1 }}>Del</button>
        </td>
      </tr>
    );
  };

  return (
    <div className="fadein">
      {editingLead !== null && <LeadModal lead={editingLead.id ? editingLead : null} onSave={saveLead} onClose={() => setEditingLead(null)} saving={saving} reps={reps} />}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        {[
          { val: leads.length, label: 'Total Leads', color: '#fff' },
          { val: leads.filter(l => l.status === 'booked').length, label: 'Booked', color: '#22c55e' },
          { val: leads.filter(l => l.status === 'callback').length, label: 'Callbacks', color: '#F59E0B' },
          { val: leads.filter(l => l.priority === 'HOT').length, label: 'HOT Leads', color: '#ff6060' },
          { val: leads.filter(l => l.status === 'no_show').length, label: 'No Shows', color: '#ff8800' },
          { val: leads.filter(l => l.status === 'discovery_completed').length, label: 'Discoveries', color: '#00F0FF' },
          { val: leads.filter(l => !l.assigned_rep_id).length, label: 'Unassigned', color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} className="card-glow" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.val}</p>
            <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#444', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters Row 1 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search name, phone, city, source..." className="field" style={{ maxWidth: '240px', padding: '8px 12px', fontSize: '12px' }} />
        <select value={filterNiche} onChange={e => { setFilterNiche(e.target.value); setPage(0); }} className="field" style={{ maxWidth: '150px', padding: '8px 12px', fontSize: '12px' }}><option value="all">All Niches</option>{NICHE_LIST.map(n => <option key={n} value={n}>{n}</option>)}</select>
        <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(0); }} className="field" style={{ maxWidth: '120px', padding: '8px 12px', fontSize: '12px' }}><option value="all">All Priority</option><option value="HOT">HOT</option><option value="HIGH">HIGH</option><option value="MEDIUM">MEDIUM</option></select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }} className="field" style={{ maxWidth: '140px', padding: '8px 12px', fontSize: '12px' }}><option value="all">All Status</option>{Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={filterRep} onChange={e => { setFilterRep(e.target.value); setPage(0); }} className="field" style={{ maxWidth: '150px', padding: '8px 12px', fontSize: '12px' }}><option value="all">All Reps</option><option value="unassigned">Unassigned</option>{reps.map(r => <option key={r.id} value={r.id}>{r.name}{r.role === 'director' ? ' (You)' : ''}</option>)}</select>
        <button onClick={() => setEditingLead({})} style={{ marginLeft: 'auto', padding: '6px 16px', borderRadius: '4px', border: 'none', background: '#00F0FF', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 800, fontFamily: 'Inter,sans-serif' }}>+ Add Lead</button>
        <span style={{ fontSize: '12px', color: '#444', fontFamily: 'monospace' }}>{sorted.length} results</span>
      </div>

      {/* Filters Row 2 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(0); }} className="field" style={{ maxWidth: '180px', padding: '8px 12px', fontSize: '12px' }}><option value="all">All Sources</option>{uniqueSourceTags.map(t => <option key={t} value={t}>{t}</option>)}</select>
        <select value={filterBatch} onChange={e => { setFilterBatch(e.target.value); setPage(0); }} className="field" style={{ maxWidth: '220px', padding: '8px 12px', fontSize: '12px' }}><option value="all">All Batches</option>{batches.map(b => <option key={b.id} value={b.id}>{b.label} ({new Date(b.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })})</option>)}</select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
          <span style={{ fontSize: '10px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Group:</span>
          {[['none', 'None'], ['niche', 'Niche'], ['source_tag', 'Source'], ['city', 'City'], ['priority', 'Priority']].map(([val, label]) => (
            <button key={val} onClick={() => { setGroupBy(val); setCollapsedGroups(new Set()); setPage(0); }}
              style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', border: groupBy === val ? '1px solid #00F0FF' : '1px solid #222', background: groupBy === val ? 'rgba(0,240,255,.1)' : 'transparent', color: groupBy === val ? '#00F0FF' : '#555', transition: 'all .15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar — only renders when at least one row is selected */}
      {selectedIds.size > 0 && (
        <BulkAssignBar
          selectedIds={Array.from(selectedIds)}
          reps={reps}
          visibleCount={groupBy === 'none' ? paged.length : (groups || []).reduce((s, [, leads]) => s + Math.min(leads.length, 50), 0)}
          onSelectAllVisible={selectAllVisible}
          onClear={clearSelection}
          onAssigned={() => { clearSelection(); loadAll(); }}
        />
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: '4px', maxHeight: '70vh', overflowY: 'auto', background: '#0e0e0e' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '1300px' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle('_'), cursor: 'default', width: '36px', minWidth: '36px', textAlign: 'center', padding: '6px 0' }}>
                <input type="checkbox" aria-label="Select all visible"
                  checked={selectedIds.size > 0 && (groupBy === 'none' ? paged.every(l => selectedIds.has(l.id)) : false)}
                  onChange={e => e.target.checked ? selectAllVisible() : clearSelection()}
                  style={{ accentColor: '#00F0FF', cursor: 'pointer' }} />
              </th>
              <th style={{ ...thStyle('_'), cursor: 'default', width: '40px', minWidth: '40px', textAlign: 'center', borderRight: '2px solid #333' }}>#</th>
              {[['business_name', 'Business'], ['contact_name', 'Contact'], ['niche', 'Niche'], ['city', 'City'], ['phone', 'Phone'], ['website', 'Website'], ['email', 'Email'], ['google_reviews', 'Reviews'], ['priority', 'Priority'], ['status', 'Status'], ['assigned_rep', 'Assigned'], ['last_outcome', 'Last Call'], ['callback_date', 'Callback']].map(([col, label]) => (
                <th key={col} onClick={() => handleSort(col)} style={thStyle(col)}>{label} {sortCol === col ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}</th>
              ))}
              <th style={{ ...thStyle('_'), cursor: 'default', textAlign: 'center', borderRight: 'none', width: '80px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupBy === 'none'
              ? paged.map((lead, idx) => renderRow(lead, idx, page * PAGE_SIZE + idx + 1))
              : groups?.map(([groupKey, groupLeads]) => {
                  const isCollapsed = collapsedGroups.has(groupKey);
                  const hotCount = groupLeads.filter(l => l.priority === 'HOT').length;
                  const bookedCount = groupLeads.filter(l => l.status === 'booked').length;
                  const rows: React.ReactNode[] = [];
                  rows.push(
                    <tr key={`group-${groupKey}`} onClick={() => toggleGroup(groupKey)} style={{ cursor: 'pointer', background: '#161616', borderBottom: '2px solid #333' }}>
                      <td colSpan={17} style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: '#555', fontSize: '12px', fontWeight: 700, width: '16px' }}>{isCollapsed ? '>' : 'v'}</span>
                          <span style={{ color: groupColorMap[groupKey] || '#00F0FF', fontSize: '13px', fontWeight: 800 }}>{groupKey}</span>
                          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', background: 'rgba(255,255,255,.08)', padding: '2px 8px', borderRadius: '4px' }}>{groupLeads.length}</span>
                          {hotCount > 0 && <span style={{ fontSize: '10px', color: '#ff6060', fontWeight: 700 }}>HOT: {hotCount}</span>}
                          {bookedCount > 0 && <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700 }}>BOOKED: {bookedCount}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                  if (!isCollapsed) {
                    groupLeads.slice(0, 50).forEach((lead, idx) => { rows.push(renderRow(lead, idx, idx + 1)); });
                    if (groupLeads.length > 50) rows.push(<tr key={`more-${groupKey}`}><td colSpan={17} style={{ padding: '8px 14px', textAlign: 'center', color: '#555', fontSize: '11px', fontStyle: 'italic', background: '#0c0c0c' }}>Showing 50 of {groupLeads.length} -- use filters to narrow down</td></tr>);
                  }
                  return rows;
                })
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {groupBy === 'none' && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '14px' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '6px 14px', borderRadius: '6px', cursor: page === 0 ? 'not-allowed' : 'pointer', border: '1px solid #1e1e1e', background: 'transparent', color: page === 0 ? '#333' : '#888', fontSize: '11px', fontWeight: 700 }}>Prev</button>
          <span style={{ fontSize: '12px', color: '#555', fontFamily: 'monospace' }}>Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ padding: '6px 14px', borderRadius: '6px', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', border: '1px solid #1e1e1e', background: 'transparent', color: page >= totalPages - 1 ? '#333' : '#888', fontSize: '11px', fontWeight: 700 }}>Next</button>
        </div>
      )}
      {groupBy !== 'none' && groups && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '14px' }}>
          <span style={{ fontSize: '12px', color: '#555', fontFamily: 'monospace' }}>{groups.length} groups -- {sorted.length} total leads</span>
          <button onClick={() => setCollapsedGroups(new Set(groups.map(g => g[0])))} style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #222', background: 'transparent', color: '#555', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>Collapse All</button>
          <button onClick={() => setCollapsedGroups(new Set())} style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #222', background: 'transparent', color: '#555', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>Expand All</button>
        </div>
      )}
    </div>
  );
}
