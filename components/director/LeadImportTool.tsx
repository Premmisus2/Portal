'use client';

import { useState, useEffect } from 'react';
import { supabase as sb } from '@/lib/supabase';
import { audit, auditFromLocalStorage } from '@/lib/audit';

const SOURCE_TYPES = [
  { value: 'csv_import', label: 'CSV Import' },
  { value: 'scraper', label: 'Scraper' },
  { value: 'warm_import', label: 'Warm Leads' },
  { value: 'ghl_sync', label: 'GHL Sync' },
  { value: 'manual', label: 'Manual Entry' },
  { value: 'website', label: 'Website Form' },
];

interface ImportBatch {
  id: string;
  label: string;
  source_type: string;
  filename?: string;
  lead_count: number;
  created_at: string;
}

type DupeInfo = { phone: string; existing_niche: string | null; existing_status: string | null; is_dnc: boolean };

export default function LeadImportTool() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [batchLabel, setBatchLabel] = useState('');
  const [sourceType, setSourceType] = useState('csv_import');
  const [sourceTag, setSourceTag] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [recentBatches, setRecentBatches] = useState<ImportBatch[]>([]);
  const [dupeCheck, setDupeCheck] = useState<{ checking: boolean; dupes: DupeInfo[]; dncCount: number } | null>(null);
  const [skipDupes, setSkipDupes] = useState(true);

  useEffect(() => { loadBatches(); }, []);

  const loadBatches = async () => {
    const { data } = await sb.from('import_batches').select('*').order('created_at', { ascending: false }).limit(10);
    setRecentBatches(data || []);
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers: string[] = [];
    let inQuote = false, current = '';
    for (const ch of lines[0]) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { headers.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    headers.push(current.trim());

    return lines.slice(1).map(line => {
      const vals: string[] = [];
      inQuote = false; current = '';
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; continue; }
        if (ch === ',' && !inQuote) { vals.push(current.trim()); current = ''; continue; }
        current += ch;
      }
      vals.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ''; });
      return row;
    });
  };

  const checkDupes = async (rows: Record<string, string>[]) => {
    const phones = Array.from(new Set(rows.map(r => (r['Phone'] || '').trim()).filter(Boolean)));
    if (phones.length === 0) { setDupeCheck({ checking: false, dupes: [], dncCount: 0 }); return; }
    setDupeCheck({ checking: true, dupes: [], dncCount: 0 });
    const dupes: DupeInfo[] = [];
    let dncCount = 0;
    for (let i = 0; i < phones.length; i += 200) {
      const chunk = phones.slice(i, i + 200);
      const { data } = await sb.from('leads').select('phone, niche, status, notes').in('phone', chunk);
      if (data) {
        for (const row of data as Array<{ phone: string; niche: string | null; status: string | null; notes: string | null }>) {
          const isDnc = typeof row.notes === 'string' && row.notes.startsWith('🚫 DNC:');
          if (isDnc) dncCount += 1;
          dupes.push({ phone: row.phone, existing_niche: row.niche, existing_status: row.status, is_dnc: isDnc });
        }
      }
    }
    setDupeCheck({ checking: false, dupes, dncCount });
  };

  const handleFile = (f: File) => {
    setFile(f); setDone(false);
    setDupeCheck(null);
    if (!batchLabel) setBatchLabel(f.name.replace(/\.csv$/i, ''));
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target?.result as string);
      setPreview(rows.slice(0, 5));
      setProgress({ done: 0, total: rows.length, errors: 0 });
      const niches = [...new Set(rows.slice(0, 100).map(r => r['Niche']).filter(Boolean))];
      if (niches.length > 0 && !sourceTag) setSourceTag(niches.length === 1 ? niches[0] : niches.join(', '));
      checkDupes(rows);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file || !batchLabel.trim()) { alert('Give this batch a name before importing.'); return; }
    setImporting(true);

    const { data: batchRecord, error: batchErr } = await sb.from('import_batches').insert({
      label: batchLabel.trim(),
      source_type: sourceType,
      filename: file.name,
      lead_count: progress.total,
      notes: batchNotes || null,
    }).select().single();

    if (batchErr) { console.error('Batch create error:', batchErr); }
    const batchId = batchRecord?.id || null;
    const tag = sourceTag.trim() || batchLabel.trim();

    const reader = new FileReader();
    reader.onload = async (e) => {
      let rows = parseCSV(e.target?.result as string);
      const isWarm = rows[0] && 'Last Result' in rows[0];
      const dupePhoneSet = new Set((dupeCheck?.dupes || []).map(d => d.phone));
      const originalCount = rows.length;
      let skipped = 0;
      if (skipDupes && dupePhoneSet.size > 0) {
        rows = rows.filter(r => {
          const phone = (r['Phone'] || '').trim();
          if (phone && dupePhoneSet.has(phone)) { skipped += 1; return false; }
          return true;
        });
      }
      setProgress({ done: 0, total: rows.length, errors: 0 });
      let imported = 0, errors = 0;

      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200).map(r => {
          if (isWarm) {
            return {
              business_name: r['Business Name'] || 'Unknown',
              niche: r['Niche'] || 'General',
              phone: r['Phone'] || null,
              website: r['Website'] || null,
              instagram: r['Socials'] || null,
              notes: [r['Notes'], r['Last Result'], r['Next Action']].filter(Boolean).join(' | '),
              status: r['Status']?.toLowerCase() === 'follow up' ? 'callback' : 'new',
              priority: 'HOT',
              source: 'warm_import',
              source_tag: tag,
              batch_id: batchId,
            };
          }
          const reviews = parseInt(r['Google Reviews'] || r['Review Count']) || 0;
          return {
            business_name: r['Business Name'] || 'Unknown',
            contact_name: r['Owner Name'] || r['Contact Name'] || null,
            niche: r['Niche'] || 'General',
            category: r['Category'] || null,
            city: r['City'] || null,
            address: r['Address'] || null,
            phone: r['Phone'] || null,
            website: r['Website'] || null,
            email: r['Email'] || null,
            instagram: r['Instagram'] || null,
            google_reviews: reviews,
            rating: parseFloat(r['Rating']) || null,
            priority: r['Priority'] || (reviews <= 19 ? 'HOT' : reviews <= 59 ? 'HIGH' : 'MEDIUM'),
            outreach_channel: r['Outreach Channel'] || null,
            status: 'new',
            notes: r['Notes'] || null,
            source: sourceType,
            source_tag: tag,
            batch_id: batchId,
          };
        });
        const { error } = await sb.from('leads').upsert(chunk, { onConflict: 'phone,niche', ignoreDuplicates: false });
        if (error) { console.error('Import batch error:', error); errors += chunk.length; } else { imported += chunk.length; }
        setProgress({ done: imported, total: rows.length, errors });
      }

      if (batchId) await sb.from('import_batches').update({ lead_count: imported }).eq('id', batchId);

      audit(auditFromLocalStorage({
        actionType: 'leads.imported',
        targetType: 'import_batch', targetId: batchId,
        metadata: { imported, errors, total: originalCount, skipped_dupes: skipped, source_tag: tag, batch_label: batchLabel },
      }));

      setImporting(false);
      setDone(true);
      loadBatches();
    };
    reader.readAsText(file);
  };

  const deleteBatch = async (batch: ImportBatch) => {
    if (!confirm(`Delete batch "${batch.label}" and all ${batch.lead_count} leads in it?`)) return;
    await sb.from('leads').delete().eq('batch_id', batch.id);
    await sb.from('import_batches').delete().eq('id', batch.id);
    loadBatches();
  };

  const inputStyle = { width: '100%', background: 'var(--border-soft)', border: '1px solid #333', borderRadius: '4px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'Inter,sans-serif', outline: 'none' as const };
  const labelStyle = { display: 'block' as const, fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '.06em' };

  return (
    <div className="fadein">
      {/* Batch Config */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Batch Name *</label>
          <input value={batchLabel} onChange={e => setBatchLabel(e.target.value)} placeholder="e.g. No-Website Scraper — Mar 24" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Source Type</label>
          <select value={sourceType} onChange={e => setSourceType(e.target.value)} style={inputStyle}>
            {SOURCE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Source Tag</label>
          <input value={sourceTag} onChange={e => setSourceTag(e.target.value)} placeholder="Auto-detected from CSV niches" style={inputStyle} />
          <p style={{ margin: '4px 0 0', fontSize: '10px', color: 'var(--text-faint)' }}>Used for filtering -- e.g. &quot;Cleaning&quot;, &quot;Hamilton No-Website&quot;, &quot;Isaiah Warm&quot;</p>
        </div>
        <div>
          <label style={labelStyle}>Notes (optional)</label>
          <input value={batchNotes} onChange={e => setBatchNotes(e.target.value)} placeholder="Any context about this import" style={inputStyle} />
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`import-dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv'; inp.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFile(f); }; inp.click(); }}
      >
        {file ? (
          <div>
            <p style={{ color: 'var(--accent-ink)', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>{file.name}</p>
            <p style={{ color: 'var(--text-faint)', fontSize: '12px', margin: 0 }}>{progress.total} rows detected -- Click to change file</p>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>Drop a CSV file here or click to browse</p>
            <p style={{ color: 'var(--text-faint)', fontSize: '11px', margin: 0 }}>Supports cold lead CSVs and warm lead CSVs</p>
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>Preview (first 5 rows)</p>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>{Object.keys(preview[0]).map(h => <th key={h} style={{ padding: '8px 10px', background: 'var(--bg-elev-pill)', color: 'var(--accent-ink)', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>{Object.values(row).map((v, j) => <td key={j} style={{ padding: '6px 10px', color: 'var(--text-tertiary)', borderBottom: '1px solid #111', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dupeCheck && (dupeCheck.checking || dupeCheck.dupes.length > 0) && (
        <div style={{ marginTop: '16px', padding: '14px 18px', background: dupeCheck.dncCount > 0 ? 'rgba(255,96,96,.06)' : 'rgba(245,158,11,.06)', border: `1px solid ${dupeCheck.dncCount > 0 ? 'rgba(255,96,96,.3)' : 'rgba(245,158,11,.3)'}`, borderRadius: '8px' }}>
          {dupeCheck.checking ? (
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>Checking for cross-niche duplicates...</p>
          ) : (
            <>
              <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: dupeCheck.dncCount > 0 ? '#ff6060' : '#F59E0B' }}>
                ⚠ {dupeCheck.dupes.length} duplicate phone{dupeCheck.dupes.length === 1 ? '' : 's'} already in DB
                {dupeCheck.dncCount > 0 && ` — ${dupeCheck.dncCount} marked DEAD`}
              </p>
              <p style={{ margin: '0 0 10px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                These phone numbers exist in `leads` under another niche or this same niche. {dupeCheck.dncCount > 0 ? 'Some are flagged as DNC — re-importing them would resurrect dead leads.' : 'Re-importing creates duplicate records.'}
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={skipDupes} onChange={e => setSkipDupes(e.target.checked)} style={{ cursor: 'pointer' }} />
                <span>Skip duplicates ({skipDupes ? `${dupeCheck.dupes.length} will be skipped, ${progress.total - dupeCheck.dupes.length} imported` : 'all rows will be imported'})</span>
              </label>
            </>
          )}
        </div>
      )}

      {file && !done && (
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handleImport} disabled={importing || !batchLabel.trim()}
            className="btn-primary" style={{ width: 'auto', padding: '12px 28px', opacity: (importing || !batchLabel.trim()) ? .6 : 1 }}>
            {importing ? `Importing... ${progress.done}/${progress.total}` : `Import ${skipDupes && dupeCheck?.dupes.length ? progress.total - dupeCheck.dupes.length : progress.total} Leads`}
          </button>
          {importing && (
            <div style={{ flex: 1 }}>
              <div style={{ height: '6px', background: 'var(--border-soft)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--accent-ink)', width: `${(progress.done / progress.total) * 100}%`, borderRadius: '3px', transition: 'width .3s' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="card-glow fadein" style={{ marginTop: '16px', padding: '16px 20px' }}>
          <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>Import Complete -- Batch: {batchLabel}</p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>{progress.done} imported -- {progress.errors} errors -- {progress.total} total -- Tagged: {sourceTag || batchLabel}</p>
        </div>
      )}

      {/* Recent Batches */}
      {recentBatches.length > 0 && (
        <div style={{ marginTop: '28px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Recent Import Batches</p>
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  {['Batch', 'Source', 'File', 'Leads', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', background: 'var(--bg-sidebar-line)', color: 'var(--text-tertiary)', fontWeight: 700, textAlign: h === 'Leads' || h === 'Actions' ? 'center' : 'left', borderBottom: '2px solid #333', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBatches.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontWeight: 600 }}>{b.label}</td>
                    <td style={{ padding: '8px 12px' }}><span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'var(--accent-glow-10)', color: 'var(--accent-ink)', fontWeight: 700 }}>{SOURCE_TYPES.find(s => s.value === b.source_type)?.label || b.source_type}</span></td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '11px' }}>{b.filename || '\u2014'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-primary)', fontFamily: 'monospace', fontWeight: 700 }}>{b.lead_count}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(b.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button onClick={() => deleteBatch(b)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>Delete Batch</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
