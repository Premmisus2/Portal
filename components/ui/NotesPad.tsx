'use client';

import { useState, useEffect } from 'react';
import { NOTES_EXPIRY_DAYS, PORTAL_AUTH_WEBHOOK } from '@/lib/constants';

interface NotesPadProps {
  storageKey: string;
}

const NotesPad = ({ storageKey }: NotesPadProps) => {
  const repName  = (() => { try { return localStorage.getItem('pmss_user')  || 'Rep'; } catch { return 'Rep'; } })();
  const repEmail = (() => { try { return localStorage.getItem('pmss_email') || '';    } catch { return '';    } })();
  const expiryKey = `${storageKey}_expires`;

  const [open,         setOpen]         = useState(false);
  const [text,         setText]         = useState(() => { try { return localStorage.getItem(storageKey) || ''; } catch { return ''; } });
  const [expiresAt,    setExpiresAt]    = useState(() => { try { return parseInt(localStorage.getItem(expiryKey)||'0',10); } catch { return 0; } });
  const [now,          setNow]          = useState(Date.now());
  const [uploading,    setUploading]    = useState(false);
  const [uploadResult, setUploadResult] = useState<null | {url: string; title: string} | 'error'>(null);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const hasNotes    = text.trim().length > 0;
  const msLeft      = expiresAt > 0 ? expiresAt - now : 0;
  const daysLeft    = Math.floor(msLeft / 86400000);
  const hoursLeft   = Math.floor((msLeft % 86400000) / 3600000);
  const isExpiring  = msLeft > 0 && msLeft < 86400000 * 2; // < 2 days
  const isExpired   = expiresAt > 0 && msLeft <= 0 && hasNotes;
  const timerColor  = isExpired ? '#ff4444' : isExpiring ? '#F59E0B' : '#2e2e2e';
  const timerText   = isExpired
    ? '⚠ Expired — upload to save!'
    : expiresAt > 0 && hasNotes
      ? `Clears in ${daysLeft}d ${hoursLeft}h — upload to save permanently`
      : '';

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    try { localStorage.setItem(storageKey, val); } catch {}
    if (val.trim() && !expiresAt) {
      const exp = Date.now() + NOTES_EXPIRY_DAYS * 86400000;
      try { localStorage.setItem(expiryKey, String(exp)); } catch {}
      setExpiresAt(exp);
    }
    if (!val.trim()) {
      try { localStorage.removeItem(expiryKey); } catch {}
      setExpiresAt(0);
    }
  };

  const handleUpload = async () => {
    if (!hasNotes || !PORTAL_AUTH_WEBHOOK) {
      alert('Upload endpoint not configured yet. Paste your Apps Script URL into the portal code.');
      return;
    }
    setUploading(true);
    const sectionLabel = storageKey.replace('notes_','').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    try {
      const res = await fetch(PORTAL_AUTH_WEBHOOK, {
        method:'POST',
        body: JSON.stringify({ action:'uploadNotes', repName, repEmail, notes:[{ section: sectionLabel, text }] }),
      });
      const data = await res.json();
      if (data.success) {
        setUploadResult({ url: data.docUrl, title: data.docTitle });
        setText('');
        try { localStorage.removeItem(storageKey); localStorage.removeItem(expiryKey); } catch {}
        setExpiresAt(0);
      } else {
        setUploadResult('error');
      }
    } catch { setUploadResult('error'); }
    setUploading(false);
  };

  const borderColor = isExpired ? 'rgba(255,68,68,.35)' : isExpiring ? 'rgba(245,158,11,.25)' : '#1a1a1a';

  return (
    <div className="no-print" style={{marginTop:'32px', border:`1px solid ${borderColor}`, borderRadius:'10px', overflow:'hidden', transition:'border-color .3s'}}>
      <button onClick={() => setOpen(p => !p)} style={{width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', background:'#080808', border:'none', cursor:'pointer', outline:'none', transition:'background .2s'}}
        onMouseEnter={e => e.currentTarget.style.background='#0d0d0d'}
        onMouseLeave={e => e.currentTarget.style.background='#080808'}>
        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
          <span style={{fontSize:'10px', fontWeight:800, letterSpacing:'.18em', textTransform:'uppercase', fontFamily:'JetBrains Mono, monospace', color:hasNotes?'#00F0FF':'#333'}}>My Notes</span>
          {hasNotes && <div style={{width:'5px', height:'5px', borderRadius:'50%', background:'#00F0FF', boxShadow:'0 0 6px rgba(0,240,255,.8)'}}/>}
          {timerText && <span style={{fontSize:'9px', color: timerColor, fontFamily:'JetBrains Mono, monospace', letterSpacing:'.06em'}}>{timerText}</span>}
          {!hasNotes && <span style={{fontSize:'10px', color:'#2a2a2a'}}>— notes save for {NOTES_EXPIRY_DAYS} days then auto-clear</span>}
        </div>
        <span style={{fontSize:'12px', color:'#333', display:'inline-block', transform:open?'rotate(90deg)':'rotate(0deg)', transition:'transform .2s'}}>▸</span>
      </button>
      {open && (
        <>
          <textarea value={text} onChange={handleChange}
            placeholder={`Jot anything down — tweaks, reminders, things to remember. Saves automatically. Clears in ${NOTES_EXPIRY_DAYS} days unless you upload to Google Drive.`}
            style={{width:'100%', minHeight:'140px', background:'#0a0a0a', border:'none', borderTop:'1px solid #1a1a1a', padding:'14px 16px', color:'#ccc', fontSize:'13px', lineHeight:1.65, fontFamily:'Roboto, sans-serif', resize:'vertical', outline:'none', boxSizing:'border-box', display:'block'}}
          />
          <div style={{padding:'10px 14px', background:'#060606', borderTop:'1px solid #111', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', flexWrap:'wrap'}}>
            <span style={{fontSize:'9px', color: timerColor, fontFamily:'JetBrains Mono, monospace', letterSpacing:'.08em'}}>
              {isExpired ? '⚠ EXPIRED' : expiresAt > 0 && hasNotes ? `↻ Local copy clears in ${daysLeft}d ${hoursLeft}h` : hasNotes ? 'Not yet saved — type to start timer' : ''}
            </span>
            {hasNotes && !uploadResult && (
              <button onClick={handleUpload} disabled={uploading} style={{background:'none', border:'1px solid rgba(0,240,255,.3)', borderRadius:'6px', padding:'5px 14px', cursor:uploading?'wait':'pointer', color:'#00F0FF', fontSize:'10px', fontWeight:700, fontFamily:'JetBrains Mono, monospace', letterSpacing:'.1em', textTransform:'uppercase', transition:'background .2s', opacity:uploading?.6:1}}>
                {uploading ? 'Uploading...' : '↑ Save to Google Drive'}
              </button>
            )}
            {uploadResult && uploadResult !== 'error' && (
              <span style={{fontSize:'10px', color:'#22c55e', fontFamily:'JetBrains Mono, monospace'}}>
                ✓ Saved — <a href={uploadResult.url} target="_blank" rel="noreferrer" style={{color:'#00F0FF'}}>Open in Google Docs</a>
              </span>
            )}
            {uploadResult === 'error' && (
              <span style={{fontSize:'10px', color:'#ff4444', fontFamily:'JetBrains Mono, monospace'}}>Upload failed — try again</span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotesPad;
