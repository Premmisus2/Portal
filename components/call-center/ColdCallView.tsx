'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { OUTCOME_LABELS, OUTCOME_COLORS, NICHE_LIST, CALENDAR_ENDPOINT } from '@/lib/constants';
import { todayInToronto, torontoDayBoundsUTC, weekStartInToronto } from '@/lib/date';
import TopBar from '@/components/layout/TopBar';
import LeadRow from './LeadRow';
import QuickLogForm from './QuickLogForm';
import CallTranscriptToggle from './CallTranscriptToggle';
import EditCallLogModal from './EditCallLogModal';

const ColdCallView = ({ userName, userEmail, onHome, onLogout, totalCloses, totalPoints, addClose, undoClose, repId, isDirector, shadowMode, repPhone }: any) => {
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('pmss_cc_tab') || 'list'; } catch { return 'list'; } });
  const [leads, setLeads] = useState<any[]>([]);
  const [callLogs, setCallLogs] = useState<Record<string, any[]>>({});
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => { try { return localStorage.getItem('pmss_cc_search') || ''; } catch { return ''; } });
  const [quickFilter, setQuickFilter] = useState(() => { try { return localStorage.getItem('pmss_cc_quickFilter') || 'all'; } catch { return 'all'; } });
  const [filterNiche, setFilterNiche] = useState(() => { try { return localStorage.getItem('pmss_cc_filterNiche') || 'all'; } catch { return 'all'; } });
  const [filterPriority, setFilterPriority] = useState(() => { try { return localStorage.getItem('pmss_cc_filterPriority') || 'all'; } catch { return 'all'; } });
  const [filterStatus, setFilterStatus] = useState(() => { try { return localStorage.getItem('pmss_cc_filterStatus') || 'all'; } catch { return 'all'; } });
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ today: 0, week: 0, booked: 0, pending: 0 });
  const [toast, setToast] = useState<any>(null);
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  const [playbackSearch, setPlaybackSearch] = useState('');
  const [expandedPlayback, setExpandedPlayback] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState(() => { try { return localStorage.getItem('pmss_cc_batch') || 'all'; } catch { return 'all'; } });
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => { try { localStorage.setItem('pmss_cc_batch', selectedBatch); } catch {} }, [selectedBatch]);
  useEffect(() => { try { localStorage.setItem('pmss_cc_tab', tab); } catch {} }, [tab]);
  useEffect(() => { try { localStorage.setItem('pmss_cc_search', searchQuery); } catch {} }, [searchQuery]);
  useEffect(() => { try { localStorage.setItem('pmss_cc_quickFilter', quickFilter); } catch {} }, [quickFilter]);
  useEffect(() => { try { localStorage.setItem('pmss_cc_filterNiche', filterNiche); } catch {} }, [filterNiche]);
  useEffect(() => { try { localStorage.setItem('pmss_cc_filterPriority', filterPriority); } catch {} }, [filterPriority]);
  useEffect(() => { try { localStorage.setItem('pmss_cc_filterStatus', filterStatus); } catch {} }, [filterStatus]);

  const loadLeads = async () => {
    setLoading(true);
    let allLeads: any[] = [], from = 0;
    while (true) {
      let query = supabase.from('leads').select('*');
      if (!isDirector) query = query.eq('assigned_rep_id', repId);
      query = query.order('google_reviews', { ascending: true }).order('id', { ascending: true }).range(from, from + 999);
      const { data, error } = await query;
      if (error || !data || data.length === 0) break;
      allLeads = allLeads.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }

    // Load import batches
    const { data: batchData } = await supabase.from('import_batches').select('*').order('created_at', { ascending: true });
    if (batchData) setBatches(batchData);

    if (allLeads.length > 0) {
      let allLogs: any[] = [], logFrom = 0;
      while (true) {
        const { data: logsData } = await supabase.from('call_logs').select('*').eq('rep_id', repId).order('created_at', { ascending: false }).range(logFrom, logFrom + 999);
        if (!logsData || logsData.length === 0) break;
        allLogs = allLogs.concat(logsData);
        if (logsData.length < 1000) break;
        logFrom += 1000;
      }
      const logsMap: Record<string, any[]> = {};
      allLogs.forEach(log => {
        if (!logsMap[log.lead_id]) logsMap[log.lead_id] = [];
        logsMap[log.lead_id].push(log);
      });
      setCallLogs(logsMap);
    }

    setLeads(allLeads);
    setLoading(false);
  };

  const loadStats = async () => {
    const { startUTC: todayStart } = torontoDayBoundsUTC();
    const { startUTC: weekStart } = torontoDayBoundsUTC(weekStartInToronto());
    let logQuery = supabase.from('call_logs').select('*', { count: 'exact' });
    if (!isDirector) logQuery = logQuery.eq('rep_id', repId);
    const { count: todayCount } = await logQuery.gte('created_at', todayStart);
    const { count: weekCount } = await supabase.from('call_logs').select('*', { count: 'exact' }).eq('rep_id', repId).gte('created_at', weekStart);
    const { count: bookedCount } = await supabase.from('call_logs').select('*', { count: 'exact' }).eq('rep_id', repId).eq('outcome', 'booked_call');
    const today = todayInToronto();
    const { count: pendingCount } = await supabase.from('call_logs').select('*', { count: 'exact' }).eq('rep_id', repId).eq('outcome', 'callback_requested').gte('callback_date', today);
    setStats({ today: todayCount || 0, week: weekCount || 0, booked: bookedCount || 0, pending: pendingCount || 0 });
  };

  const loadCalendar = async () => {
    if (!CALENDAR_ENDPOINT) { setCalendarEvents([]); return; }
    try {
      const res = await fetch(CALENDAR_ENDPOINT);
      const data = await res.json();
      setCalendarEvents(data || []);
    } catch { setCalendarEvents([]); }
  };

  useEffect(() => { loadLeads(); loadStats(); loadCalendar(); }, []);

  const handleLogged = (leadId: string, outcome: string, newStatus: string) => {
    const loggedLead = leads.find(l => l.id === leadId);
    const bizName = loggedLead ? loggedLead.business_name : 'Lead';
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    setCallLogs(prev => {
      const newLog = { id: Date.now().toString(), lead_id: leadId, rep_id: repId, outcome, created_at: new Date().toISOString() };
      return { ...prev, [leadId]: [newLog, ...(prev[leadId] || [])] };
    });
    loadStats();
    setToast({ message: 'Logged: ' + (OUTCOME_LABELS[outcome] || outcome) + ' — ' + bizName, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const priorityOrder: Record<string, number> = { HOT: 0, HIGH: 1, MEDIUM: 2 };
  const today = todayInToronto();
  const callbackLeads = leads.filter(l => {
    const logs = callLogs[l.id] || [];
    return logs.some((log: any) => log.callback_date && log.callback_date <= today);
  });

  // "To Call" tab only shows uncalled leads; "All Leads" shows everything
  const tabBaseLeads = tab === 'list' ? leads.filter(l => l.status === 'new') : leads;
  const filteredLeads = tabBaseLeads
    .filter(l => selectedBatch === 'all' || l.batch_id === selectedBatch)
    .filter(l => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (l.business_name || '').toLowerCase().includes(q)
        || (l.city || '').toLowerCase().includes(q)
        || (l.phone || '').toLowerCase().includes(q)
        || (l.niche || '').toLowerCase().includes(q)
        || (l.contact_name || '').toLowerCase().includes(q)
        || (l.email || '').toLowerCase().includes(q);
    })
    .filter(l => {
      if (quickFilter === 'all') return true;
      if (quickFilter === 'HOT') return l.priority === 'HOT';
      if (quickFilter === 'HIGH') return l.priority === 'HIGH';
      if (quickFilter === 'MEDIUM') return l.priority === 'MEDIUM';
      if (quickFilter === 'callbacks') return callbackLeads.some((cb: any) => cb.id === l.id);
      if (quickFilter === 'new') return l.status === 'new';
      return true;
    })
    .filter(l => filterNiche === 'all' || l.niche === filterNiche)
    .filter(l => filterPriority === 'all' || l.priority === filterPriority)
    .filter(l => filterStatus === 'all' || l.status === filterStatus)
    .sort((a, b) => {
      // To Call + All Leads: import order (created_at ascending, never changes)
      if (tab === 'list' || tab === 'allleads') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      // Default: priority then id
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2) || a.id.localeCompare(b.id);
    });
  const bookedLeads = leads.filter(l => l.status === 'booked' || l.status === 'discovery_completed');

  const bookingRate = stats.today > 0 ? Math.round((stats.booked / stats.week) * 100) : 0;

  /* ── Reusable sub-renderers ── */

  const renderBatchFilter = (countFn: (l: any) => boolean) => {
    if (batches.length === 0) return null;
    return (
      <>
        <div style={{display:'flex', gap:'6px', marginBottom:'12px', flexWrap:'wrap', alignItems:'center'}}>
          <button className={`call-tab${selectedBatch==='all'?' active':''}`} onClick={()=>setSelectedBatch('all')}>
            All Batches
            <span style={{marginLeft:'6px', fontSize:'10px', opacity:0.7}}>{leads.filter(countFn).length}</span>
          </button>
          {batches.map(b => {
            const batchLeadCount = leads.filter(l => l.batch_id === b.id && countFn(l)).length;
            return (
              <button key={b.id} className={`call-tab${selectedBatch===b.id?' active':''}`} onClick={()=>setSelectedBatch(b.id)}>
                {b.label || `Batch — ${new Date(b.created_at).toLocaleDateString()}`}
                <span style={{marginLeft:'6px', fontSize:'10px', opacity:0.7}}>{batchLeadCount}</span>
              </button>
            );
          })}
        </div>
        {selectedBatch !== 'all' && (() => {
          const batch = batches.find(b => b.id === selectedBatch);
          if (!batch) return null;
          const batchLeads = leads.filter(l => l.batch_id === batch.id);
          const calledCount = batchLeads.filter(l => l.status !== 'new').length;
          return (
            <div style={{display:'flex', alignItems:'center', gap:'12px', padding:'8px 14px', marginBottom:'12px', borderRadius:'8px', background:'rgba(0,240,255,.04)', border:'1px solid rgba(0,240,255,.12)', fontSize:'12px', color:'#888'}}>
              <span style={{fontWeight:700, color:'#00F0FF'}}>{batch.label || `Batch ${batch.id.slice(0,6)}`}</span>
              <span>{new Date(batch.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>
              <span style={{color:'#555'}}>|</span>
              <span>{batchLeads.length} leads</span>
              <span style={{color:'#555'}}>|</span>
              <span>{calledCount} called</span>
            </div>
          );
        })()}
      </>
    );
  };

  const renderSearchBar = () => (
    <div style={{position:'relative', marginBottom:'14px'}}>
      <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search leads — name, city, phone, niche..."
        className="field" style={{width:'100%', padding:'12px 16px 12px 40px', fontSize:'14px', background:'rgba(255,255,255,.03)', border:'1px solid #1e1e1e', borderRadius:'10px', color:'#fff', fontFamily:'Inter,sans-serif'}}/>
      <span style={{position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', fontSize:'16px', color:'#333', pointerEvents:'none'}}>🔍</span>
      {searchQuery && <button onClick={()=>setSearchQuery('')} style={{position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:'14px', fontFamily:'Inter'}}>✕</button>}
    </div>
  );

  const renderAdvancedFilters = () => (
    <div className="cc-filter-bar" style={{display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap'}}>
      <select value={filterNiche} onChange={e=>setFilterNiche(e.target.value)} className="field" style={{maxWidth:'180px', padding:'8px 12px', fontSize:'12px'}}>
        <option value="all">All Niches</option>
        {NICHE_LIST.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)} className="field" style={{maxWidth:'140px', padding:'8px 12px', fontSize:'12px'}}>
        <option value="all">All Priority</option>
        <option value="HOT">HOT (0-19)</option>
        <option value="HIGH">HIGH (20-59)</option>
        <option value="MEDIUM">MEDIUM (60-100)</option>
      </select>
      <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="field" style={{maxWidth:'160px', padding:'8px 12px', fontSize:'12px'}}>
        <option value="all">All Status</option>
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="callback">Callback</option>
        <option value="booked">Booked</option>
        <option value="discovery_completed">Discovery Booked</option>
        <option value="no_show">No Show</option>
        <option value="not_interested">Not Interested</option>
      </select>
      <span style={{marginLeft:'auto', fontSize:'12px', color:'#444', alignSelf:'center'}}>{filteredLeads.length} leads</span>
    </div>
  );

  const renderLeadList = (leadsToRender: any[]) => (
    <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
      {leadsToRender.map((lead, idx) => (
        <LeadRow key={lead.id} lead={lead} repId={repId}
          isExpanded={expandedLead === lead.id}
          onToggle={(id: string) => setExpandedLead(expandedLead === id ? null : id)}
          onLogged={handleLogged}
          callLogs={callLogs[lead.id] || []}
          shadowMode={shadowMode}
          repPhone={repPhone}
          setToast={setToast}
          leadNumber={idx + 1}
          userName={userName}/>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="card" style={{padding:'40px', textAlign:'center'}}>
      <p style={{color:'#444', fontSize:'14px', margin:0}}>
        {leads.length === 0 ? 'No leads assigned yet. Ask your director to assign leads.' : 'No leads match your filters.'}
      </p>
    </div>
  );

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100vh', background:'#000', paddingTop: shadowMode ? '40px' : 0}}>
      <TopBar title="Call Center" subtitle="Your calling command center"
        userName={userName} userEmail={userEmail} onHome={onHome} onLogout={onLogout}
        totalCloses={totalCloses} totalPoints={totalPoints} addClose={addClose} undoClose={undoClose}/>
      {toast && (
        <div style={{
          position:'fixed', top: shadowMode ? '76px' : '36px', left:'50%', transform:'translateX(-50%)',
          background: toast.type === 'error' ? '#ff4444' : '#22c55e', color:'#000', padding:'10px 24px', borderRadius:'8px',
          fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'13px',
          zIndex:450, boxShadow:'0 4px 12px rgba(0,0,0,.3)',
          animation:'fadein .3s'
        }}>
          {toast.message}
        </div>
      )}
      <main className="section-main" style={{flex:1, overflowY:'auto', padding:'28px 32px', maxWidth:'1100px', width:'100%', margin:'0 auto'}}>
        <div style={{marginBottom:'6px'}}><span className="tag">Command Center</span></div>
        <h2 style={{fontSize:'26px', fontWeight:900, color:'#fff', margin:'8px 0 4px'}}>Call Center</h2>
        <p style={{color:'#555', fontSize:'13px', margin:'0 0 16px'}}>Your leads, your calls, your numbers. All in one place.</p>
        <div className="divider" style={{margin:'16px 0'}}/>

        {/* No-phone warning — Twilio calling disabled */}
        {!repPhone && !shadowMode && (
          <div style={{marginBottom:'16px', padding:'12px 16px', borderRadius:'8px', background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.3)', display:'flex', alignItems:'center', gap:'12px'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style={{fontSize:'12px', color:'#F59E0B', fontWeight:600}}>Twilio calling disabled — no phone number on your account. Director: set it in Dashboard → Settings.</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div style={{display:'flex', gap:'6px', marginBottom:'20px', flexWrap:'wrap'}}>
          {[['list','To Call'],['mycalls','Called'],['allleads','All Leads'],['followup','Follow Up'],['booked','Booked'],['quicklog','Manual Log'],['stats','My Stats'],['playback','Playback']].map(([key, label]) => {
            const toCallCount = leads.filter(l => l.status === 'new').length;
            const followUpCount = leads.filter(l => { const logs = callLogs[l.id] || []; return logs.some((log: any) => log.outcome === 'callback_requested'); }).length;
            const bookedCount = leads.filter(l => l.status === 'booked' || l.status === 'discovery_completed').length;
            const badge = key === 'list' ? toCallCount : key === 'followup' ? followUpCount : key === 'booked' ? bookedCount : 0;
            return (
              <button key={key} className={`call-tab${tab===key?' active':''}`} onClick={()=>setTab(key)}>
                {label}
                {badge > 0 && (
                  <span style={{marginLeft:'6px', background: key === 'followup' ? '#ff6060' : key === 'booked' ? '#22c55e' : '#00F0FF', color: key === 'list' ? '#000' : '#fff', borderRadius:'10px', padding:'1px 6px', fontSize:'10px', fontWeight:800}}>{badge}</span>
                )}
              </button>
            );
          })}
          <button onClick={()=>{ loadLeads(); loadStats(); loadCalendar(); }} style={{marginLeft:'auto', padding:'8px 14px', borderRadius:'7px', cursor:'pointer', border:'1px solid #1e1e1e', background:'transparent', color:'#444', fontSize:'11px', fontWeight:700, fontFamily:'Inter,sans-serif', transition:'all .15s'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(0,240,255,.3)';(e.currentTarget as HTMLElement).style.color='#00F0FF';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#1e1e1e';(e.currentTarget as HTMLElement).style.color='#444';}}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 0'}}>
            <svg style={{animation:'spin 1s linear infinite'}} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          </div>
        ) : (
          <>
            {/* TODAY'S LIST */}
            {tab === 'list' && (
              <div className="fadein">
                {renderBatchFilter(l => l.status === 'new')}
                {renderSearchBar()}

                {/* Quick Filter Buttons */}
                <div style={{display:'flex', gap:'6px', marginBottom:'14px', flexWrap:'wrap'}}>
                  {[['all','All'],['HOT','HOT'],['HIGH','HIGH'],['MEDIUM','MEDIUM'],['callbacks','Callbacks']].map(([key, label]) => {
                    const isActive = quickFilter === key;
                    const colors: Record<string, string> = { HOT:'#ff6060', HIGH:'#F59E0B', MEDIUM:'#3B82F6', callbacks:'#A855F7' };
                    const accentColor = colors[key] || '#00F0FF';
                    const toCallBase = leads.filter(l => l.status === 'new');
                    const count = key === 'all' ? toCallBase.length
                      : key === 'HOT' ? toCallBase.filter(l=>l.priority==='HOT').length
                      : key === 'HIGH' ? toCallBase.filter(l=>l.priority==='HIGH').length
                      : key === 'MEDIUM' ? toCallBase.filter(l=>l.priority==='MEDIUM').length
                      : key === 'callbacks' ? callbackLeads.length : 0;
                    return (
                      <button key={key} onClick={()=>setQuickFilter(key)}
                        style={{padding:'7px 16px', borderRadius:'8px', cursor:'pointer', fontSize:'11px', fontWeight:700, fontFamily:'Inter,sans-serif', transition:'all .15s',
                          background: isActive ? `${accentColor}15` : 'transparent',
                          border: `1px solid ${isActive ? accentColor+'55' : '#1e1e1e'}`,
                          color: isActive ? accentColor : '#555',
                        }}>
                        {label}
                        <span style={{marginLeft:'6px', fontSize:'10px', opacity:0.7}}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                {renderAdvancedFilters()}

                {filteredLeads.length === 0 ? renderEmptyState() : renderLeadList(filteredLeads)}
              </div>
            )}

            {/* MY CALLS — Rep's call history grouped by time */}
            {tab === 'mycalls' && (
              <div className="fadein">
                {(() => {
                  const allMyLogs = Object.values(callLogs).flat().filter((log: any) => log.rep_id === repId || !isDirector).sort((a: any,b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  if (allMyLogs.length === 0) return (
                    <div className="card" style={{padding:'40px', textAlign:'center'}}>
                      <p style={{color:'#444', fontSize:'14px', margin:0}}>No calls logged yet. Start dialing.</p>
                    </div>
                  );
                  const now = new Date();
                  const todayStr = now.toISOString().split('T')[0];
                  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
                  const groups: Record<string, any[]> = { today: [], thisWeek: [], older: [] };
                  allMyLogs.forEach((log: any) => {
                    const logDate = new Date(log.created_at);
                    const logDateStr = logDate.toISOString().split('T')[0];
                    if (logDateStr === todayStr) groups.today.push(log);
                    else if (logDate >= weekStart) groups.thisWeek.push(log);
                    else groups.older.push(log);
                  });
                  const totalLogs = allMyLogs.length;
                  const renderLogEntry = (log: any) => {
                    const logLead = leads.find(l => l.id === log.lead_id);
                    const bizName = log.business_name || (logLead ? logLead.business_name : 'Unknown');
                    const duration = log.duration ? `${Math.floor(log.duration / 60)}m ${log.duration % 60}s` : null;
                    return (
                      <div key={log.id} style={{padding:'14px 18px', background:'#0a0a0a', border:'1px solid #1a1a1a', borderRadius:'8px'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom: (log.notes || log.recording_url || log.transcript) ? '8px' : '0'}}>
                          <span style={{fontSize:'10px', color:'#333', fontFamily:'JetBrains Mono,monospace', fontWeight:600, minWidth:'28px'}}>#{totalLogs - allMyLogs.indexOf(log)}</span>
                          <div style={{width:'8px', height:'8px', borderRadius:'50%', background: OUTCOME_COLORS[log.outcome] || '#555', flexShrink:0}}/>
                          <span style={{fontSize:'13px', fontWeight:700, color:'#fff'}}>{bizName}</span>
                          <span style={{fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'4px', background:`${OUTCOME_COLORS[log.outcome] || '#555'}15`, color: OUTCOME_COLORS[log.outcome] || '#555', letterSpacing:'.05em', textTransform:'uppercase'}}>{OUTCOME_LABELS[log.outcome] || log.outcome}</span>
                          {duration && <span style={{fontSize:'10px', color:'#666', fontFamily:'monospace'}}>{duration}</span>}
                          <span style={{fontSize:'11px', color:'#444', marginLeft:'auto', fontFamily:'monospace'}}>{new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          {log.callback_date && <span style={{fontSize:'10px', color:'#F59E0B', fontWeight:600}}>CB: {log.callback_date}</span>}
                          {!shadowMode && log.rep_id === repId && (
                            <button
                              onClick={() => setEditingLog(log)}
                              title="Edit call log"
                              aria-label="Edit call log"
                              style={{
                                background: 'transparent', border: '1px solid #1e1e1e',
                                borderRadius: '6px', padding: '4px 8px', cursor: 'pointer',
                                color: '#666', fontSize: '12px', lineHeight: 1,
                                transition: 'all .15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#00F0FF'; e.currentTarget.style.borderColor = '#00F0FF55'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = '#1e1e1e'; }}
                            >✎</button>
                          )}
                        </div>
                        {log.notes && <p style={{margin:'0 0 6px', fontSize:'12px', color:'#aaa', lineHeight:'1.5', wordBreak:'break-word'}}>{log.notes}</p>}
                        {log.recording_url && (
                          <div style={{marginTop:'6px'}}>
                            <audio controls src={log.recording_sid ? `/api/recording?sid=${log.recording_sid}` : log.recording_url} style={{width:'100%', height:'32px', borderRadius:'6px'}}/>
                          </div>
                        )}
                        {log.transcript && (
                          <CallTranscriptToggle transcript={log.transcript}/>
                        )}
                      </div>
                    );
                  };
                  const sectionHeader = (title: string, count: number) => (
                    <div style={{display:'flex', alignItems:'center', gap:'10px', margin:'18px 0 10px'}}>
                      <span style={{fontSize:'10px', fontWeight:800, letterSpacing:'.18em', textTransform:'uppercase', color:'#00F0FF', whiteSpace:'nowrap'}}>{title}</span>
                      <span style={{fontSize:'10px', color:'#333'}}>({count})</span>
                      <div style={{flex:1, height:'1px', background:'linear-gradient(90deg,rgba(0,240,255,.35),transparent)'}}/>
                    </div>
                  );
                  return (
                    <div>
                      {groups.today.length > 0 && <>{sectionHeader('Today', groups.today.length)}<div style={{display:'flex', flexDirection:'column', gap:'6px'}}>{groups.today.map(renderLogEntry)}</div></>}
                      {groups.thisWeek.length > 0 && <>{sectionHeader('This Week', groups.thisWeek.length)}<div style={{display:'flex', flexDirection:'column', gap:'6px'}}>{groups.thisWeek.map(renderLogEntry)}</div></>}
                      {groups.older.length > 0 && <>{sectionHeader('Older', groups.older.length)}<div style={{display:'flex', flexDirection:'column', gap:'6px'}}>{groups.older.map(renderLogEntry)}</div></>}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* QUICK LOG — Manual Call Entry (hidden in shadow mode) */}
            {tab === 'quicklog' && !shadowMode && (
              <QuickLogForm repId={repId} onLogged={() => { loadLeads(); loadStats(); }}/>
            )}
            {tab === 'quicklog' && shadowMode && (
              <div className="card" style={{padding:'40px', textAlign:'center'}}>
                <p style={{color:'#F59E0B', fontSize:'14px', margin:0, fontWeight:700}}>Read Only — Shadow Mode</p>
                <p style={{color:'#444', fontSize:'12px', margin:'6px 0 0'}}>Cannot log calls while shadowing a rep.</p>
              </div>
            )}

            {/* ALL LEADS — Full lead list with all filters */}
            {tab === 'allleads' && (
              <div className="fadein">
                {renderBatchFilter(() => true)}
                {renderSearchBar()}

                {/* Quick Filter Buttons */}
                <div style={{display:'flex', gap:'6px', marginBottom:'14px', flexWrap:'wrap'}}>
                  {[['all','All'],['HOT','HOT'],['HIGH','HIGH'],['MEDIUM','MEDIUM'],['callbacks','Callbacks'],['new','Not Called']].map(([key, label]) => {
                    const isActive = quickFilter === key;
                    const colors: Record<string, string> = { HOT:'#ff6060', HIGH:'#F59E0B', MEDIUM:'#3B82F6', callbacks:'#A855F7', new:'#22c55e' };
                    const accentColor = colors[key] || '#00F0FF';
                    const count = key === 'all' ? leads.length
                      : key === 'HOT' ? leads.filter(l=>l.priority==='HOT').length
                      : key === 'HIGH' ? leads.filter(l=>l.priority==='HIGH').length
                      : key === 'MEDIUM' ? leads.filter(l=>l.priority==='MEDIUM').length
                      : key === 'callbacks' ? callbackLeads.length
                      : key === 'new' ? leads.filter(l=>l.status==='new').length : 0;
                    return (
                      <button key={key} onClick={()=>setQuickFilter(key)}
                        style={{padding:'7px 16px', borderRadius:'8px', cursor:'pointer', fontSize:'11px', fontWeight:700, fontFamily:'Inter,sans-serif', transition:'all .15s',
                          background: isActive ? `${accentColor}15` : 'transparent',
                          border: `1px solid ${isActive ? accentColor+'55' : '#1e1e1e'}`,
                          color: isActive ? accentColor : '#555',
                        }}>
                        {label}
                        <span style={{marginLeft:'6px', fontSize:'10px', opacity:0.7}}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                {renderAdvancedFilters()}

                {filteredLeads.length === 0 ? renderEmptyState() : (() => {
                  const uncalled = filteredLeads.filter(l => l.status === 'new');
                  const called = filteredLeads.filter(l => l.status !== 'new');
                  return (
                    <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                      {uncalled.length > 0 && (
                        <>
                          <div style={{padding:'8px 0', borderBottom:'1px solid #1a1a1a', marginBottom:'4px'}}>
                            <span style={{fontSize:'11px', fontWeight:800, color:'#22c55e', letterSpacing:'.1em', textTransform:'uppercase'}}>TO CALL — {uncalled.length} leads</span>
                          </div>
                          {uncalled.map((lead, idx) => (
                            <LeadRow key={lead.id} lead={lead} repId={repId}
                              isExpanded={expandedLead === lead.id}
                              onToggle={(id: string) => setExpandedLead(expandedLead === id ? null : id)}
                              onLogged={handleLogged}
                              callLogs={callLogs[lead.id] || []}
                              shadowMode={shadowMode}
                              repPhone={repPhone}
                              setToast={setToast}
                              leadNumber={idx + 1}
                              userName={userName}/>
                          ))}
                        </>
                      )}
                      {called.length > 0 && (
                        <>
                          <div style={{padding:'12px 0 8px', borderBottom:'1px solid #1a1a1a', marginTop:'12px', marginBottom:'4px'}}>
                            <span style={{fontSize:'11px', fontWeight:800, color:'#555', letterSpacing:'.1em', textTransform:'uppercase'}}>CALLED — {called.length} leads</span>
                          </div>
                          {called.map((lead, idx) => (
                            <LeadRow key={lead.id} lead={lead} repId={repId}
                              isExpanded={expandedLead === lead.id}
                              onToggle={(id: string) => setExpandedLead(expandedLead === id ? null : id)}
                              onLogged={handleLogged}
                              callLogs={callLogs[lead.id] || []}
                              shadowMode={shadowMode}
                              repPhone={repPhone}
                              setToast={setToast}
                              leadNumber={uncalled.length + idx + 1}
                              userName={userName}/>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* FOLLOW UP — Leads with callback_requested outcome */}
            {tab === 'followup' && (
              <div className="fadein">
                {(() => {
                  const CALLBACK_REASON_LABELS: Record<string, string> = { too_busy:'Too Busy / On Job Site', has_someone:'Has Someone Working On It', call_later:'Asked to Call Back Later', interested:'Interested But Not Ready', wants_info:'Wants More Information', other:'Other' };
                  const followUpLeads = leads.filter(l => {
                    const logs = callLogs[l.id] || [];
                    return logs.some((log: any) => log.outcome === 'callback_requested');
                  }).map(l => {
                    const logs = callLogs[l.id] || [];
                    const lastCbLog = logs.find((log: any) => log.outcome === 'callback_requested');
                    return { ...l, _cbDate: lastCbLog?.callback_date || null, _cbReason: lastCbLog?.callback_reason || null, _cbNotes: lastCbLog?.notes || null };
                  });
                  const todayStr = new Date().toISOString().split('T')[0];
                  const overdue = followUpLeads.filter(l => l._cbDate && l._cbDate < todayStr).sort((a,b) => (a._cbDate || '').localeCompare(b._cbDate || ''));
                  const dueToday = followUpLeads.filter(l => l._cbDate === todayStr);
                  const upcoming = followUpLeads.filter(l => !l._cbDate || l._cbDate > todayStr).sort((a,b) => (a._cbDate || 'z').localeCompare(b._cbDate || 'z'));
                  if (followUpLeads.length === 0) return (
                    <div className="card" style={{padding:'40px', textAlign:'center'}}>
                      <p style={{color:'#444', fontSize:'14px', margin:0}}>No follow-ups pending. Keep dialing.</p>
                    </div>
                  );
                  const renderFollowUpCard = (lead: any) => {
                    const borderColor = lead._cbDate && lead._cbDate < todayStr ? '#ff6060' : lead._cbDate === todayStr ? '#F59E0B' : '#1a1a1a';
                    return (
                      <div key={lead.id} style={{padding:'16px 18px', background:'#0a0a0a', border:`1px solid ${borderColor}`, borderRadius:'10px', borderLeftWidth:'3px'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'8px'}}>
                          <span style={{fontSize:'14px', fontWeight:700, color:'#fff'}}>{lead.business_name}</span>
                          {lead._cbDate && <span style={{fontSize:'11px', color: lead._cbDate < todayStr ? '#ff6060' : lead._cbDate === todayStr ? '#F59E0B' : '#666', fontWeight:600, fontFamily:'monospace'}}>{lead._cbDate}</span>}
                          <span style={{fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'4px', background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.25)', color:'#F59E0B', letterSpacing:'.05em', textTransform:'uppercase'}}>
                            {lead._cbReason ? (CALLBACK_REASON_LABELS[lead._cbReason] || lead._cbReason) : 'No reason given'}
                          </span>
                          {!shadowMode && (
                            <button onClick={()=>{ setTab('list'); setExpandedLead(lead.id); }}
                              style={{marginLeft:'auto', padding:'5px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'10px', fontWeight:700, fontFamily:'Inter,sans-serif',
                                background:'transparent', border:'1px solid rgba(0,240,255,.3)', color:'#00F0FF', transition:'all .15s'}}
                              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(0,240,255,.08)';}}
                              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';}}>
                              Call Again
                            </button>
                          )}
                        </div>
                        {lead._cbNotes && <p style={{margin:0, fontSize:'12px', color:'#aaa', lineHeight:'1.5'}}>{lead._cbNotes}</p>}
                      </div>
                    );
                  };
                  const sectionHeader = (title: string, count: number, color: string) => (
                    <div style={{display:'flex', alignItems:'center', gap:'10px', margin:'16px 0 8px'}}>
                      <span style={{fontSize:'10px', fontWeight:800, letterSpacing:'.18em', textTransform:'uppercase', color: color || '#00F0FF', whiteSpace:'nowrap'}}>{title}</span>
                      <span style={{fontSize:'10px', color:'#333'}}>({count})</span>
                      <div style={{flex:1, height:'1px', background:`linear-gradient(90deg,${color || 'rgba(0,240,255,.35)'},transparent)`}}/>
                    </div>
                  );
                  return (
                    <div>
                      {overdue.length > 0 && <>{sectionHeader('Overdue', overdue.length, '#ff6060')}<div style={{display:'flex', flexDirection:'column', gap:'6px'}}>{overdue.map(renderFollowUpCard)}</div></>}
                      {dueToday.length > 0 && <>{sectionHeader('Today', dueToday.length, '#F59E0B')}<div style={{display:'flex', flexDirection:'column', gap:'6px'}}>{dueToday.map(renderFollowUpCard)}</div></>}
                      {upcoming.length > 0 && <>{sectionHeader('Upcoming', upcoming.length, '#00F0FF')}<div style={{display:'flex', flexDirection:'column', gap:'6px'}}>{upcoming.map(renderFollowUpCard)}</div></>}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* BOOKED — Leads with booked or discovery_completed status */}
            {tab === 'booked' && (
              <div className="fadein">
                {(() => {
                  const BOOKING_TYPE_LABELS: Record<string, string> = { sales_call:'Sales Call', discovery:'Discovery', scheduled_callback:'Scheduled Callback' };
                  const bookedList = leads.filter(l => l.status === 'booked' || l.status === 'discovery_completed').map(l => {
                    const logs = callLogs[l.id] || [];
                    const bookedLog = logs.find((log: any) => log.outcome === 'booked_call' || log.outcome === 'discovery_completed');
                    return { ...l, _bookingType: bookedLog?.booking_type || null, _bookingDate: bookedLog?.callback_date || l.updated_at || l.created_at, _bookingNotes: bookedLog?.notes || null };
                  }).sort((a,b) => (a._bookingDate || '').localeCompare(b._bookingDate || ''));
                  if (bookedList.length === 0) return (
                    <div className="card" style={{padding:'40px', textAlign:'center'}}>
                      <p style={{color:'#444', fontSize:'14px', margin:0}}>No bookings yet. Keep dialing.</p>
                    </div>
                  );
                  return (
                    <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                      {bookedList.map(lead => (
                        <div key={lead.id} style={{padding:'16px 18px', background:'#0a0a0a', border:'1px solid rgba(34,197,94,.25)', borderRadius:'10px', borderLeftWidth:'3px', borderLeftColor:'#22c55e'}}>
                          <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom: lead._bookingNotes ? '8px' : '0'}}>
                            <span style={{fontSize:'14px', fontWeight:700, color:'#fff'}}>{lead.business_name}</span>
                            <span style={{fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'4px',
                              background: lead.status === 'discovery_completed' ? 'rgba(0,240,255,.08)' : 'rgba(34,197,94,.08)',
                              border: `1px solid ${lead.status === 'discovery_completed' ? 'rgba(0,240,255,.25)' : 'rgba(34,197,94,.25)'}`,
                              color: lead.status === 'discovery_completed' ? '#00F0FF' : '#22c55e',
                              letterSpacing:'.05em', textTransform:'uppercase'}}>
                              {lead.status === 'discovery_completed' ? 'Discovery Booked' : 'Booked'}
                            </span>
                            {lead._bookingType && (
                              <span style={{fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'4px', background:'rgba(255,255,255,.04)', border:'1px solid #1e1e1e', color:'#888', letterSpacing:'.05em'}}>
                                {BOOKING_TYPE_LABELS[lead._bookingType] || lead._bookingType}
                              </span>
                            )}
                            {lead._bookingDate && (
                              <span style={{fontSize:'11px', color:'#666', fontFamily:'monospace', marginLeft:'auto'}}>
                                {new Date(lead._bookingDate).toLocaleDateString()} {new Date(lead._bookingDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </span>
                            )}
                          </div>
                          {lead._bookingNotes && <p style={{margin:0, fontSize:'12px', color:'#aaa', lineHeight:'1.5'}}>{lead._bookingNotes}</p>}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* MY STATS — Enhanced with outcome breakdown and coaching */}
            {tab === 'stats' && (
              <div className="fadein">
                {(() => {
                  const allMyLogs = Object.values(callLogs).flat().filter((log: any) => log.rep_id === repId || !isDirector);
                  const now = new Date();
                  const todayStr = now.toISOString().split('T')[0];
                  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
                  const todayLogs = allMyLogs.filter((l: any) => l.created_at && l.created_at.startsWith(todayStr));
                  const weekLogs = allMyLogs.filter((l: any) => new Date(l.created_at) >= weekStart);
                  const outcomeCounts: Record<string, number> = {};
                  allMyLogs.forEach((l: any) => { outcomeCounts[l.outcome] = (outcomeCounts[l.outcome] || 0) + 1; });
                  const totalLogs = allMyLogs.length;
                  const todayOutcomeCounts: Record<string, number> = {};
                  todayLogs.forEach((l: any) => { todayOutcomeCounts[l.outcome] = (todayOutcomeCounts[l.outcome] || 0) + 1; });

                  const statCards = [
                    { key:'today', label:'Calls Today', value: stats.today, color:'#fff', logs: todayLogs },
                    { key:'week', label:'Calls This Week', value: stats.week, color:'#fff', logs: weekLogs },
                    { key:'booked', label:'Total Bookings', value: stats.booked, color:'#22c55e', logs: allMyLogs.filter((l: any) => l.outcome === 'booked_call') },
                    { key:'pending', label:'Callbacks Pending', value: stats.pending, color:'#F59E0B', logs: allMyLogs.filter((l: any) => l.outcome === 'callback_requested') },
                  ];

                  return (
                    <>
                      <div className="cc-stats-grid" style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'12px', marginBottom:'24px'}}>
                        {statCards.map(sc => (
                          <div key={sc.key} className="stat-card" style={{cursor:'pointer', transition:'all .15s', borderColor: expandedStat === sc.key ? 'rgba(0,240,255,.5)' : 'rgba(0,240,255,.22)'}}
                            onClick={() => setExpandedStat(expandedStat === sc.key ? null : sc.key)}>
                            <p className="stat-label">{sc.label}</p>
                            <p className="stat-number" style={{color: sc.color}}>{sc.value}</p>
                          </div>
                        ))}
                      </div>
                      {expandedStat && (() => {
                        const card = statCards.find(s => s.key === expandedStat);
                        if (!card || card.logs.length === 0) return (
                          <div className="card" style={{padding:'20px', marginBottom:'16px', textAlign:'center'}}>
                            <p style={{color:'#444', fontSize:'13px', margin:0}}>No calls in this category.</p>
                          </div>
                        );
                        return (
                          <div className="card" style={{padding:'16px', marginBottom:'16px', maxHeight:'300px', overflowY:'auto'}}>
                            <p style={{margin:'0 0 10px', fontSize:'10px', fontWeight:800, letterSpacing:'.2em', textTransform:'uppercase', color:'#00F0FF'}}>{card.label} — Detail</p>
                            {card.logs.slice(0, 50).map((log: any) => {
                              const logLead = leads.find(l => l.id === log.lead_id);
                              return (
                                <div key={log.id} style={{display:'flex', alignItems:'center', gap:'8px', padding:'6px 0', borderBottom:'1px solid #111'}}>
                                  <div style={{width:'6px', height:'6px', borderRadius:'50%', background: OUTCOME_COLORS[log.outcome] || '#555'}}/>
                                  <span style={{fontSize:'12px', color:'#fff', fontWeight:600}}>{log.business_name || logLead?.business_name || 'Unknown'}</span>
                                  <span style={{fontSize:'10px', color: OUTCOME_COLORS[log.outcome] || '#555', fontWeight:600}}>{OUTCOME_LABELS[log.outcome] || log.outcome}</span>
                                  <span style={{fontSize:'10px', color:'#333', marginLeft:'auto', fontFamily:'monospace'}}>{new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      <div className="card-glow" style={{padding:'20px', marginBottom:'20px'}}>
                        <p className="stat-label">Booking Rate</p>
                        <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                          <p style={{fontSize:'36px', fontWeight:900, color:'#22c55e', margin:0, fontFamily:'monospace'}}>{bookingRate}%</p>
                          <div style={{flex:1}}>
                            <div style={{height:'8px', background:'#1a1a1a', borderRadius:'4px', overflow:'hidden'}}>
                              <div style={{height:'100%', background:'#22c55e', width:`${Math.min(bookingRate, 100)}%`, borderRadius:'4px', transition:'width .5s ease'}}/>
                            </div>
                            <p style={{margin:'6px 0 0', fontSize:'11px', color:'#444'}}>{stats.booked} bookings / {stats.week} calls this week</p>
                          </div>
                        </div>
                      </div>
                      {/* Outcome Breakdown */}
                      {totalLogs > 0 && (
                        <div className="card" style={{padding:'20px', marginBottom:'20px'}}>
                          <p style={{margin:'0 0 14px', fontSize:'10px', fontWeight:800, letterSpacing:'.2em', textTransform:'uppercase', color:'#00F0FF'}}>Outcome Breakdown</p>
                          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                            {Object.entries(OUTCOME_LABELS).map(([key, label]) => {
                              const cnt = outcomeCounts[key] || 0;
                              if (cnt === 0) return null;
                              const pct = Math.round((cnt / totalLogs) * 100);
                              return (
                                <div key={key}>
                                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                                    <span style={{fontSize:'11px', fontWeight:600, color:'#ccc'}}>{label}</span>
                                    <span style={{fontSize:'11px', fontWeight:700, color: OUTCOME_COLORS[key] || '#555', fontFamily:'monospace'}}>{cnt} ({pct}%)</span>
                                  </div>
                                  <div style={{height:'6px', background:'#1a1a1a', borderRadius:'3px', overflow:'hidden'}}>
                                    <div style={{height:'100%', background: OUTCOME_COLORS[key] || '#555', width:`${pct}%`, borderRadius:'3px', transition:'width .4s ease'}}/>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {/* Coaching Tips */}
                      {(todayOutcomeCounts.not_interested || 0) >= 2 && (
                        <div style={{padding:'16px 18px', background:'rgba(245,158,11,.05)', border:'1px solid rgba(245,158,11,.2)', borderRadius:'10px', marginBottom:'16px'}}>
                          <p style={{margin:'0 0 6px', fontSize:'10px', fontWeight:800, letterSpacing:'.15em', textTransform:'uppercase', color:'#F59E0B'}}>Coaching Tip</p>
                          <p style={{margin:0, fontSize:'13px', color:'#ccc', lineHeight:'1.5'}}>You've had {todayOutcomeCounts.not_interested} "Not Interested" outcomes today. Review the Objection Handling scripts in section 04 to sharpen your responses.</p>
                        </div>
                      )}
                      {(todayOutcomeCounts.no_answer || 0) >= 5 && (
                        <div style={{padding:'16px 18px', background:'rgba(0,240,255,.03)', border:'1px solid rgba(0,240,255,.15)', borderRadius:'10px', marginBottom:'16px'}}>
                          <p style={{margin:'0 0 6px', fontSize:'10px', fontWeight:800, letterSpacing:'.15em', textTransform:'uppercase', color:'#00F0FF'}}>Coaching Tip</p>
                          <p style={{margin:0, fontSize:'13px', color:'#ccc', lineHeight:'1.5'}}>High no-answer rate today ({todayOutcomeCounts.no_answer} calls). Consider trying different call times or switching to voicemail-first strategy.</p>
                        </div>
                      )}

                      {/* DAILY DEBRIEF */}
                      {(() => {
                        const debriefDate = new Date().toISOString().split('T')[0];
                        const debriefKey = `pmss_debrief_${debriefDate}`;
                        const savedDebrief = JSON.parse(localStorage.getItem(debriefKey) || '{}');
                        const debriefFields = [
                          { id: 'went_well', label: 'What went well today?' },
                          { id: 'didnt_work', label: "What didn't work?" },
                          { id: 'best_convo', label: 'Best conversation — what made it work?' },
                          { id: 'objection', label: "Objection I couldn't handle — what should I review?" },
                          { id: 'goal_tomorrow', label: 'Goal for tomorrow:' },
                        ];
                        const saveDebrief = (fieldId: string, value: string) => {
                          const current = JSON.parse(localStorage.getItem(debriefKey) || '{}');
                          current[fieldId] = value;
                          current._timestamp = new Date().toISOString();
                          localStorage.setItem(debriefKey, JSON.stringify(current));
                        };
                        // Get last 3 debriefs (excluding today)
                        const pastDebriefs: any[] = [];
                        for (let i = 1; i <= 30; i++) {
                          if (pastDebriefs.length >= 3) break;
                          const d = new Date();
                          d.setDate(d.getDate() - i);
                          const dk = `pmss_debrief_${d.toISOString().split('T')[0]}`;
                          const data = JSON.parse(localStorage.getItem(dk) || 'null');
                          if (data && Object.keys(data).filter(k => k !== '_timestamp').length > 0) {
                            pastDebriefs.push({ date: d.toISOString().split('T')[0], data });
                          }
                        }
                        return (
                          <div className="card-glow" style={{padding:'24px', marginTop:'8px'}}>
                            <p style={{margin:'0 0 4px', fontSize:'10px', fontWeight:800, letterSpacing:'.2em', textTransform:'uppercase', color:'#F59E0B'}}>Daily Debrief</p>
                            <p style={{margin:'0 0 16px', fontSize:'12px', color:'#555'}}>Fill this out before you close for the day.</p>
                            <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                              {debriefFields.map(f => (
                                <div key={f.id}>
                                  <label style={{display:'block', fontSize:'12px', fontWeight:700, color:'#ccc', marginBottom:'6px'}}>{f.label}</label>
                                  <textarea
                                    defaultValue={savedDebrief[f.id] || ''}
                                    onBlur={e => saveDebrief(f.id, e.target.value)}
                                    placeholder="Type here..."
                                    className="field"
                                    style={{width:'100%', minHeight:'64px', resize:'vertical', fontSize:'13px', lineHeight:'1.5', fontFamily:'Roboto, sans-serif'}}
                                  />
                                </div>
                              ))}
                            </div>
                            <p style={{margin:'12px 0 0', fontSize:'10px', color:'#333', fontStyle:'italic'}}>Auto-saved to your browser. Key: {debriefKey}</p>

                            {pastDebriefs.length > 0 && (
                              <div style={{marginTop:'24px'}}>
                                <div className="divider" style={{marginBottom:'18px'}}/>
                                <p style={{margin:'0 0 14px', fontSize:'10px', fontWeight:800, letterSpacing:'.2em', textTransform:'uppercase', color:'#444'}}>Previous Debriefs</p>
                                {pastDebriefs.map(pd => (
                                  <div key={pd.date} className="card" style={{padding:'16px 18px', marginBottom:'10px'}}>
                                    <p style={{margin:'0 0 10px', fontSize:'11px', fontWeight:700, color:'#00F0FF', fontFamily:'monospace'}}>{pd.date}</p>
                                    {debriefFields.map(f => pd.data[f.id] ? (
                                      <div key={f.id} style={{marginBottom:'8px'}}>
                                        <p style={{margin:0, fontSize:'10px', fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.1em'}}>{f.label}</p>
                                        <p style={{margin:'2px 0 0', fontSize:'12px', color:'#999', lineHeight:'1.5'}}>{pd.data[f.id]}</p>
                                      </div>
                                    ) : null)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>
            )}

            {/* PLAYBACK — Calls with recordings */}
            {tab === 'playback' && (
              <div className="fadein">
                {(() => {
                  const allMyLogs = Object.values(callLogs).flat().filter((log: any) => (log.rep_id === repId || !isDirector) && log.recording_url).sort((a: any,b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  const filteredPlayback = playbackSearch ? allMyLogs.filter((log: any) => {
                    const q = playbackSearch.toLowerCase();
                    const bizName = (log.business_name || '').toLowerCase();
                    const transcript = (log.transcript || '').toLowerCase();
                    return bizName.includes(q) || transcript.includes(q);
                  }) : allMyLogs;
                  if (allMyLogs.length === 0) return (
                    <div className="card" style={{padding:'40px', textAlign:'center'}}>
                      <p style={{color:'#444', fontSize:'14px', margin:0}}>No recorded calls yet. Twilio recordings will appear here.</p>
                    </div>
                  );
                  return (
                    <div>
                      <div style={{position:'relative', marginBottom:'16px'}}>
                        <input value={playbackSearch} onChange={e=>setPlaybackSearch(e.target.value)} placeholder="Search recordings and transcripts..."
                          className="field" style={{width:'100%', padding:'12px 16px 12px 40px', fontSize:'14px', background:'rgba(255,255,255,.03)', border:'1px solid #1e1e1e', borderRadius:'10px', color:'#fff', fontFamily:'Inter,sans-serif'}}/>
                        <span style={{position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', fontSize:'16px', color:'#333', pointerEvents:'none'}}>🔍</span>
                        {playbackSearch && <button onClick={()=>setPlaybackSearch('')} style={{position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:'14px', fontFamily:'Inter'}}>✕</button>}
                      </div>
                      <p style={{fontSize:'11px', color:'#444', marginBottom:'12px'}}>{filteredPlayback.length} recording{filteredPlayback.length !== 1 ? 's' : ''}</p>
                      <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                        {filteredPlayback.map((log: any) => {
                          const logLead = leads.find(l => l.id === log.lead_id);
                          const bizName = log.business_name || (logLead ? logLead.business_name : 'Unknown');
                          const duration = log.duration ? `${Math.floor(log.duration / 60)}m ${log.duration % 60}s` : null;
                          const isExpanded = expandedPlayback === log.id;
                          return (
                            <div key={log.id} style={{padding:'14px 18px', background:'#0a0a0a', border:'1px solid #1a1a1a', borderRadius:'10px', cursor:'pointer', transition:'all .15s', borderColor: isExpanded ? 'rgba(0,240,255,.3)' : '#1a1a1a'}}
                              onClick={()=>setExpandedPlayback(isExpanded ? null : log.id)}>
                              <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                                <span style={{fontSize:'14px', fontWeight:700, color:'#fff'}}>{bizName}</span>
                                <span style={{fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'4px', background:`${OUTCOME_COLORS[log.outcome] || '#555'}15`, color: OUTCOME_COLORS[log.outcome] || '#555', letterSpacing:'.05em', textTransform:'uppercase'}}>{OUTCOME_LABELS[log.outcome] || log.outcome}</span>
                                {duration && <span style={{fontSize:'11px', color:'#666', fontFamily:'monospace'}}>{duration}</span>}
                                <span style={{fontSize:'11px', color:'#444', marginLeft:'auto', fontFamily:'monospace'}}>{new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              </div>
                              {isExpanded && (
                                <div style={{marginTop:'12px'}} onClick={e=>e.stopPropagation()}>
                                  <audio controls src={log.recording_sid ? `/api/recording?sid=${log.recording_sid}` : log.recording_url} style={{width:'100%', height:'36px', borderRadius:'6px', marginBottom:'8px'}}/>
                                  {log.transcript_status === 'completed' && log.transcript ? (
                                    <div style={{marginTop:'8px'}}>
                                      <p style={{margin:'0 0 6px', fontSize:'10px', fontWeight:700, color:'#00F0FF', letterSpacing:'.1em', textTransform:'uppercase'}}>Transcript</p>
                                      <div style={{padding:'12px', background:'rgba(255,255,255,.02)', border:'1px solid #1e1e1e', borderRadius:'8px', maxHeight:'300px', overflowY:'auto'}}>
                                        <p style={{margin:0, fontSize:'12px', color:'#aaa', lineHeight:'1.6', whiteSpace:'pre-wrap'}}>{log.transcript}</p>
                                      </div>
                                    </div>
                                  ) : log.transcript_status === 'pending' ? (
                                    <p style={{margin:'8px 0 0', fontSize:'11px', color:'#F59E0B', fontStyle:'italic'}}>Transcribing...</p>
                                  ) : (
                                    <p style={{margin:'8px 0 0', fontSize:'11px', color:'#444', fontStyle:'italic'}}>No transcript</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </main>

      {editingLog && (
        <EditCallLogModal
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSaved={() => { loadLeads(); loadStats(); }}
        />
      )}
    </div>
  );
};

export default ColdCallView;
