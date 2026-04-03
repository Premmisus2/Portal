'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PRODUCT_LABELS, CLOSE_PRODUCTS, DIRECTOR_EMAILS } from '@/lib/constants';
import { downloadPDF } from '@/lib/pdf';

// Auth
import AuthProvider from '@/components/auth/AuthProvider';
import LoginView from '@/components/auth/LoginView';

// Layout
import TopBar from '@/components/layout/TopBar';
import GlobalSidebar from '@/components/layout/GlobalSidebar';
import BottomNav from '@/components/layout/BottomNav';
import ShortcutsModal from '@/components/layout/ShortcutsModal';

// Shared
import ClosesTracker from '@/components/shared/ClosesTracker';
import ChatWidget from '@/components/shared/ChatWidget';

// Views
import HomeView from '@/components/home/HomeView';
import ColdCallView from '@/components/call-center/ColdCallView';
import FoundationView from '@/components/foundation/FoundationView';
import ScriptsView from '@/components/scripts/ScriptsView';
import PostCallView from '@/components/postcall/PostCallView';
import LadderView from '@/components/ladder/LadderView';
import HandoffView from '@/components/handoff/HandoffView';
import DMView from '@/components/outreach/DMView';
import EmailView from '@/components/outreach/EmailView';
import SMSView from '@/components/outreach/SMSView';
import OfferStackView from '@/components/offer-stack/OfferStackView';
import AIToolsView from '@/components/ai-tools/AIToolsView';
import TrainingView from '@/components/training/TrainingView';
import DirectorView from '@/components/director/DirectorView';
import NotificationPopup from '@/components/director/NotificationPopup';

// Script Panels (director-only views)
import VoicemailPanel from '@/components/scripts/VoicemailPanel';
import DiscoveryCallPanel from '@/components/scripts/DiscoveryCallPanel';
import UpsellPanel from '@/components/scripts/UpsellPanel';
import NoShowPanel from '@/components/scripts/NoShowPanel';
import ProofPointsPanel from '@/components/scripts/ProofPointsPanel';

// UI
import NotesPad from '@/components/ui/NotesPad';
import LoadingScreen from '@/components/ui/LoadingScreen';

/* ══════════════════════════════════════════════════════
   ROOT APP — STATE MACHINE (migrated from single HTML)
══════════════════════════════════════════════════════ */

const Logo = ({ height = 32 }: { height?: number }) => (
  <img src="/logo.png" alt="Premmisus" style={{ height, objectFit: 'contain' }} />
);

function AppShell() {
  const [view, setView] = useState('login');
  const [appLoading, setAppLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('rep');
  const [repId, setRepId] = useState<string | null>(null);
  const [totalCloses, setTotalCloses] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [lastClosePts, setLastClosePts] = useState(1);
  const [closeHistory, setCloseHistory] = useState<any[]>([]);
  const [scriptTab, setScriptTab] = useState('openers');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [repPhone, setRepPhone] = useState<string | null>(null);
  const [globalSidebarOpen, setGlobalSidebarOpen] = useState(false);
  const [viewAsRep, setViewAsRep] = useState(() => {
    try { return localStorage.getItem('pmss_viewAsRep') === 'true'; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem('pmss_viewAsRep', String(viewAsRep)); } catch {} }, [viewAsRep]);

  // Notification Popup
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [missedEvents, setMissedEvents] = useState<any>(null);
  const [lastDirectorVisit, setLastDirectorVisit] = useState<string | null>(null);

  // Shadow View
  const [shadowRepId, setShadowRepId] = useState<string | null>(null);
  const [shadowRepName, setShadowRepName] = useState('');
  const [allReps, setAllReps] = useState<any[]>([]);
  const shadowMode = shadowRepId !== null;

  // Helper: load closes from Supabase
  const loadCloses = async (rid: string) => {
    const { data } = await supabase.from('closes').select('*').eq('rep_id', rid).order('created_at', { ascending: true });
    if (data) {
      setCloseHistory(data.map((c: any) => ({ pts: c.pts, id: c.id, status: c.status || 'approved', product_label: c.product_label })));
      setTotalCloses(data.length);
      // Only approved closes count toward points
      const approvedPts = data.filter((c: any) => (c.status || 'approved') === 'approved').reduce((s: number, c: any) => s + c.pts, 0);
      setTotalPoints(approvedPts);
      if (data.length > 0) setLastClosePts(data[data.length - 1].pts);
      try { localStorage.setItem('pmss_closes', String(data.length)); localStorage.setItem('pmss_points', String(approvedPts)); } catch {}
    }
  };

  // Auto-login: check Supabase session
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: repData } = await supabase.from('reps').select('*').eq('auth_id', session.user.id).single();
          if (repData) {
            setUserName(repData.name); setUserEmail(repData.email);
            setUserRole(repData.role); setRepId(repData.id);
            setRepPhone(repData.phone || null);
            await loadCloses(repData.id);
            if (repData.role === 'director') {
              const { data: repsData } = await supabase.from('reps').select('id, name, email, role').order('created_at', { ascending: true });
              if (repsData) setAllReps(repsData.filter((r: any) => r.role !== 'director'));
              try {
                const lastVisit = localStorage.getItem('pmss_last_director_visit') || new Date(0).toISOString();
                setLastDirectorVisit(lastVisit);
                const [bookings, callbacks, handoffs, totalCalls] = await Promise.all([
                  supabase.from('call_logs').select('*, reps(name)').in('outcome', ['booked_call', 'discovery_completed']).gt('created_at', lastVisit),
                  supabase.from('call_logs').select('*, reps(name)').eq('outcome', 'callback_requested').gt('created_at', lastVisit),
                  supabase.from('handoffs').select('*, reps(name)').gt('created_at', lastVisit),
                  supabase.from('call_logs').select('id').gt('created_at', lastVisit),
                ]);
                const evts = {
                  bookings: bookings.data || [],
                  callbacks: callbacks.data || [],
                  handoffs: handoffs.data || [],
                  totalCalls: (totalCalls.data || []).length,
                };
                if (evts.bookings.length > 0 || evts.callbacks.length > 0 || evts.handoffs.length > 0) {
                  setMissedEvents(evts);
                  setShowNotifPopup(true);
                }
              } catch (notifErr) { console.warn('Notification popup query failed:', notifErr); }
            }
            try { localStorage.setItem('pmss_user', repData.name); localStorage.setItem('pmss_email', repData.email); } catch {}
            const savedView = (() => { try { return localStorage.getItem('pmss_view') || 'home'; } catch { return 'home'; } })();
            setView(savedView);
          }
        }
      } catch {}
      setAppLoading(false);
    };
    init();
  }, []);

  // Auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUserName(''); setUserEmail(''); setRepId(null); setUserRole('rep');
        setView('login');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Visibility change handler
  useEffect(() => {
    const handleVis = async () => {
      if (document.visibilityState === 'visible' && repId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { handleLogout(); }
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [repId]);

  // 10-minute heartbeat
  useEffect(() => {
    if (!repId) return;
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) handleLogout();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [repId]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') { setShowShortcuts(s => !s); return; }
      if (e.key === 'Escape') { if (showShortcuts) { setShowShortcuts(false); return; } setView(v => (v !== 'login' && v !== 'home') ? 'home' : v); return; }
      if (e.key === 'h' || e.key === 'H') { setView(v => (v !== 'login' && v !== 'home') ? 'home' : v); return; }
      if (e.shiftKey && e.code && e.code.startsWith('Digit')) {
        const num = e.code.replace('Digit', '');
        setView(v => {
          if (v === 'home') {
            const m: Record<string, string> = { '1': 'coldcall', '2': 'scripts', '3': 'foundation', '4': 'dms', '5': 'postcall', '6': 'ladder', '7': 'handoff', '8': 'aitools', '9': 'director' };
            if (num === '9' && userRole !== 'director') return v;
            return m[num] || v;
          }
          if (v === 'scripts') {
            const t: Record<string, string> = { '1': 'openers', '2': 'hooks', '3': 'objections', '4': 'missteps', '5': 'close' };
            if (t[num]) setScriptTab(t[num]);
          }
          return v;
        });
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [userRole, showShortcuts]);

  const addClose = async (pts: number, productId?: string) => {
    setTotalCloses(c => c + 1);
    // Points are NOT added until director approves — optimistic UI shows pending
    setLastClosePts(pts);
    const product = CLOSE_PRODUCTS.find(p => p.id === productId);
    const label = product?.label || PRODUCT_LABELS[pts] || 'Unknown';
    if (repId) {
      const { data, error: closeErr } = await supabase.from('closes').insert({ rep_id: repId, pts, product_label: label, status: 'pending' }).select().single();
      if (closeErr) { alert('Failed to save close: ' + closeErr.message); setTotalCloses(c => c - 1); return; }
      setCloseHistory(h => { const n = [...h, { pts, id: data?.id, status: 'pending', product_label: label }]; try { localStorage.setItem('pmss_history', JSON.stringify(n)); } catch {} return n; });
    } else {
      setCloseHistory(h => { const n = [...h, { pts, status: 'pending', product_label: label }]; try { localStorage.setItem('pmss_history', JSON.stringify(n)); } catch {} return n; });
    }
    try { localStorage.setItem('pmss_last_pts', String(pts)); } catch {}
  };

  const undoClose = async () => {
    if (totalCloses > 0) {
      const last = closeHistory[closeHistory.length - 1];
      setTotalCloses(c => Math.max(0, c - 1)); setTotalPoints(p => Math.max(0, p - (last?.pts || lastClosePts)));
      if (last?.id && repId) { await supabase.from('closes').delete().eq('id', last.id); }
      setCloseHistory(h => { const n = h.slice(0, -1); try { localStorage.setItem('pmss_history', JSON.stringify(n)); } catch {} return n; });
    }
  };

  const handleLogin = (name: string, email: string, code: string, id: string, role: string) => {
    setUserName(name); setUserEmail(email || ''); setRepId(id); setUserRole(role || 'rep');
    if (id) loadCloses(id);
    try { localStorage.setItem('pmss_user', name); localStorage.setItem('pmss_email', email || ''); if (code) localStorage.setItem('pmss_code', code); } catch {}
    setView('home');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserName(''); setUserEmail(''); setRepId(null); setUserRole('rep');
    setTotalCloses(0); setTotalPoints(0); setCloseHistory([]);
    try { localStorage.removeItem('pmss_user'); localStorage.removeItem('pmss_email'); localStorage.removeItem('pmss_view'); } catch {}
    setView('login');
  };

  const handleHome = () => { setView('home'); try { localStorage.setItem('pmss_view', 'home'); } catch {} window.history.pushState({ view: 'home' }, '', ''); };
  const handleNav = (key: string) => { setView(key); try { localStorage.setItem('pmss_view', key); } catch {} window.history.pushState({ view: key }, '', ''); };

  // Back button support
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const v = e.state?.view || 'home';
      setView(v);
      try { localStorage.setItem('pmss_view', v); } catch {}
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const actuallyDirector = userRole === 'director';
  const isDirector = actuallyDirector && !viewAsRep && !shadowMode;
  const effectiveRepId = shadowMode ? shadowRepId : repId;
  const effectiveIsDirector = shadowMode ? false : isDirector;

  // Shadow mode enter/exit handlers
  const enterShadow = async (sRepId: string, sRepName: string) => {
    setShadowRepId(sRepId);
    setShadowRepName(sRepName);
    setViewAsRep(true);
    const { data } = await supabase.from('closes').select('*').eq('rep_id', sRepId).order('created_at', { ascending: true });
    if (data) {
      setCloseHistory(data.map((c: any) => ({ pts: c.pts, id: c.id, status: c.status || 'approved', product_label: c.product_label })));
      setTotalCloses(data.length);
      const approvedPts = data.filter((c: any) => (c.status || 'approved') === 'approved').reduce((s: number, c: any) => s + c.pts, 0);
      setTotalPoints(approvedPts);
      if (data.length > 0) setLastClosePts(data[data.length - 1].pts);
    }
  };
  const exitShadow = async () => {
    setShadowRepId(null);
    setShadowRepName('');
    setViewAsRep(false);
    if (repId) await loadCloses(repId);
  };

  const shadowAddClose = () => {};
  const shadowUndoClose = () => {};
  const toggleSidebar = () => setGlobalSidebarOpen(s => !s);

  const shared = {
    userName: shadowMode ? shadowRepName : userName,
    userEmail,
    onHome: handleHome,
    onLogout: handleLogout,
    totalCloses,
    setTotalCloses,
    totalPoints,
    addClose: shadowMode ? shadowAddClose : addClose,
    undoClose: shadowMode ? shadowUndoClose : undoClose,
    closeHistory,
    repId: effectiveRepId,
    isDirector: effectiveIsDirector,
    onToggleSidebar: toggleSidebar,
    actuallyDirector,
    viewAsRep,
    onToggleView: () => { if (shadowMode) { exitShadow(); } else { setViewAsRep(v => !v); } },
    shadowMode,
    shadowRepId,
    shadowRepName,
    allReps,
    enterShadow,
    exitShadow,
    repPhone,
  };

  const chat = <ChatWidget userName={userName} userEmail={userEmail} currentView={view} repId={repId} userRole={userRole} />;
  const shortcuts = showShortcuts ? <ShortcutsModal onClose={() => setShowShortcuts(false)} /> : null;
  const sidebar = view !== 'login' ? <GlobalSidebar open={globalSidebarOpen} onClose={() => setGlobalSidebarOpen(false)} onNav={handleNav} currentView={view} isDirector={effectiveIsDirector} /> : null;

  if (appLoading) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <Logo height={48} />
        <svg style={{ animation: 'spin 1s linear infinite' }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
      </div>
    </div>
  );

  // Director notification popup
  const notifPopup = showNotifPopup && missedEvents ? (
    <NotificationPopup events={missedEvents} lastVisit={lastDirectorVisit} onDismiss={() => {
      setShowNotifPopup(false);
      localStorage.setItem('pmss_last_director_visit', new Date().toISOString());
    }} />
  ) : null;

  if (view === 'login') return <LoginView onLogin={handleLogin} />;

  // Shadow Banner
  const shadowBanner = shadowMode ? (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500, background: '#F59E0B', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '8px 16px', fontFamily: 'Inter,sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '.03em', boxShadow: '0 2px 12px rgba(245,158,11,.4)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
      <span>SHADOWING: {shadowRepName} — Read Only</span>
      <button onClick={exitShadow} style={{ background: '#000', color: '#F59E0B', border: 'none', borderRadius: '5px', padding: '4px 14px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'Inter,sans-serif', transition: 'opacity .15s' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '.8')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
        Exit
      </button>
    </div>
  ) : null;

  const shadowPadding = shadowMode ? <div style={{ height: '40px', flexShrink: 0 }} /> : null;
  const bottomNav = <BottomNav currentView={view} onNav={handleNav} addClose={shadowMode ? shadowAddClose : addClose} shadowMode={shadowMode} />;

  // View wrapper for director-only script panels
  const wrapPanel = (title: string, subtitle: string, pdfName: string, panel: React.ReactNode, showNotes?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000' }}>
      {shadowPadding}
      <TopBar title={title} subtitle={subtitle} {...shared} onPrint={() => downloadPDF(pdfName)} />
      <main className="print-area section-main" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
        {panel}
        {showNotes && <NotesPad storageKey={showNotes} />}
      </main>
    </div>
  );

  if (view === 'home')       return <>{notifPopup}{shadowBanner}{sidebar}<HomeView {...shared} onNav={handleNav} onShortcuts={() => setShowShortcuts(true)} missedEventCount={missedEvents ? (missedEvents.bookings.length + missedEvents.callbacks.length + missedEvents.handoffs.length) : 0} />{bottomNav}{chat}{shortcuts}</>;
  if (view === 'coldcall')   return <>{notifPopup}{shadowBanner}{sidebar}<ColdCallView {...shared} />{bottomNav}{chat}</>;
  if (view === 'foundation') return <>{notifPopup}{shadowBanner}{sidebar}<FoundationView {...shared} />{bottomNav}{chat}</>;
  if (view === 'scripts')    return <>{notifPopup}{shadowBanner}{sidebar}<ScriptsView {...shared} scriptTab={scriptTab} setScriptTab={setScriptTab} />{bottomNav}{chat}</>;
  if (view === 'postcall')   return <>{notifPopup}{shadowBanner}{sidebar}<PostCallView {...shared} />{bottomNav}{chat}</>;
  if (view === 'ladder')     return <>{notifPopup}{shadowBanner}{sidebar}<LadderView {...shared} />{bottomNav}{chat}</>;
  if (view === 'handoff')    return <>{notifPopup}{shadowBanner}{sidebar}<HandoffView {...shared} />{bottomNav}{chat}</>;
  if (view === 'dms')        return <>{notifPopup}{shadowBanner}{sidebar}<DMView {...shared} />{bottomNav}{chat}</>;
  if (view === 'email')      return <>{notifPopup}{shadowBanner}{sidebar}<EmailView {...shared} />{bottomNav}{chat}</>;
  if (view === 'sms')        return <>{notifPopup}{shadowBanner}{sidebar}<SMSView {...shared} />{bottomNav}{chat}</>;
  if (view === 'offerstack') return <>{notifPopup}{shadowBanner}{sidebar}<OfferStackView {...shared} />{bottomNav}{chat}</>;
  if (view === 'aitools')    return <>{notifPopup}{shadowBanner}{sidebar}<AIToolsView {...shared} />{bottomNav}{chat}</>;
  if (view === 'training')   return <>{notifPopup}{shadowBanner}{sidebar}<TrainingView {...shared} />{bottomNav}{chat}</>;
  if (view === 'voicemail')  return <>{notifPopup}{shadowBanner}{sidebar}{wrapPanel('Voicemail Scripts', 'VM — Leave the Right Message', 'Voicemail-Scripts', <VoicemailPanel />)}{bottomNav}{chat}</>;
  if (view === 'discovery')  return <>{notifPopup}{shadowBanner}{sidebar}{wrapPanel('Discovery Call Framework', 'DC — The 15-Minute Close', 'Discovery-Call', <DiscoveryCallPanel />)}{bottomNav}{chat}</>;
  if (view === 'upsell')     return <>{notifPopup}{shadowBanner}{sidebar}{wrapPanel('0.5 → 1.0 Upsell', 'UP — Turn Websites Into Retainers', 'Upsell-Script', <UpsellPanel />)}{bottomNav}{chat}</>;
  if (view === 'noshow')     return <>{notifPopup}{shadowBanner}{sidebar}{wrapPanel('No-Show Recovery', 'NS — Don\'t Chase. Replace.', 'No-Show-Recovery', <NoShowPanel />)}{bottomNav}{chat}</>;
  if (view === 'proofpoints') return <>{notifPopup}{shadowBanner}{sidebar}{wrapPanel('Proof Points & Ammo', 'PP — Confidence Arsenal', 'Proof-Points', <ProofPointsPanel />, 'notes_proofpoints')}{bottomNav}{chat}</>;
  if (view === 'director' && isDirector) return <>{notifPopup}{shadowBanner}{sidebar}<DirectorView {...shared} />{bottomNav}{chat}</>;
  if (view === 'newupdates' && actuallyDirector) return <>{notifPopup}{shadowBanner}{sidebar}<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000' }}>{shadowPadding}<TopBar title="New Updates" subtitle="Features built — activate when ready" {...shared} /><main className="print-area section-main" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: '900px', width: '100%', margin: '0 auto' }}><div style={{ marginBottom: '8px' }}><span className="tag">NEW UPDATES</span></div><h2 style={{ fontSize: '26px', fontWeight: 900, color: '#fff', margin: '8px 0 4px' }}>Features Built — Not Yet Active</h2><p style={{ color: '#666', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>Build these once the current sales portal is up to speed. Click any to open.</p><div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{[{ key: 'upsell', title: '0.5 → 1.0 Upsell', desc: 'Post-delivery upsell script — turn websites into recurring revenue' }, { key: 'voicemail', title: 'Voicemail Scripts', desc: '4 voicemail templates under 20 seconds each' }, { key: 'discovery', title: 'Discovery Call Framework', desc: '15-minute discovery call agenda with 5 phases' }, { key: 'noshow', title: 'No-Show Recovery', desc: '3-touch SMS recovery sequence' }, { key: 'proofpoints', title: 'Proof Points & Ammo', desc: 'Social proof, competitor ammunition, credibility builders' }].map(f => (<button key={f.key} onClick={() => handleNav(f.key)} className="card" style={{ padding: '18px 20px', textAlign: 'left', cursor: 'pointer', border: '1px solid #1e1e1e', font: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: '15px' }}>{f.title}</p><p style={{ margin: '4px 0 0', color: '#555', fontSize: '12px' }}>{f.desc}</p></div><span style={{ color: '#00F0FF', fontSize: '12px', fontWeight: 700 }}>Open →</span></button>))}</div></main></div>{bottomNav}{chat}</>;

  // Fallback
  return <>{notifPopup}{shadowBanner}{sidebar}<HomeView {...shared} onNav={handleNav} onShortcuts={() => setShowShortcuts(true)} missedEventCount={missedEvents ? (missedEvents.bookings.length + missedEvents.callbacks.length + missedEvents.handoffs.length) : 0} />{bottomNav}{chat}{shortcuts}</>;
}

export default function Page() {
  return <AppShell />;
}
