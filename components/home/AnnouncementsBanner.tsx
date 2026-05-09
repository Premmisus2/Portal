'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3).then(({ data }) => {
      if (data) setAnnouncements(data);
    });
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div style={{maxWidth:'1100px', margin:'0 auto', width:'100%', padding:'0 16px'}}>
      {announcements.map((a: any) => (
        <div key={a.id} className="fadein" style={{
          padding:'14px 20px', marginBottom:'10px', borderRadius:'10px',
          background: a.priority === 'urgent' ? 'rgba(255,136,0,.06)' : 'rgba(0,240,255,.04)',
          border: `1px solid ${a.priority === 'urgent' ? 'rgba(255,136,0,.25)' : 'rgba(0,240,255,.15)'}`,
          display:'flex', alignItems:'flex-start', gap:'12px',
        }}>
          <div style={{width:'6px', height:'6px', borderRadius:'50%', marginTop:'6px', flexShrink:0,
            background: a.priority === 'urgent' ? '#ff8800' : '#00F0FF',
            boxShadow: `0 0 8px ${a.priority === 'urgent' ? 'rgba(255,136,0,.6)' : 'rgba(0,240,255,.6)'}`}}/>
          <div style={{flex:1}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px'}}>
              <span style={{fontSize:'12px', fontWeight:800, color:'#fff'}}>{a.title}</span>
              {a.priority === 'urgent' && <span style={{fontSize:'8px', fontWeight:700, padding:'2px 6px', borderRadius:'3px', background:'rgba(255,136,0,.12)', border:'1px solid rgba(255,136,0,.3)', color:'#ff8800', letterSpacing:'.1em', textTransform:'uppercase'}}>Urgent</span>}
              <span style={{fontSize:'9px', color:'#333', fontFamily:'monospace', marginLeft:'auto'}}>
                {new Date(a.created_at).toLocaleDateString('en-CA', { month:'short', day:'numeric', timeZone: 'America/Toronto' })}
              </span>
            </div>
            <p style={{margin:0, fontSize:'12px', color:'#888', lineHeight:1.5}}>{a.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
