'use client';

// FloorContent — the actual /floor client logic. Wrapped in <Suspense> by
// app/floor/page.tsx because useSearchParams() requires a suspense boundary
// at the page level in Next.js 14 App Router (otherwise the static prerender
// pass bails out and the build fails). Caught by Vercel build 2026-05-21.

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { recordAuditEvent } from '@/features/audit';
import LeadSheet from '@/components/floor/LeadSheet';
import LeadDrawer from '@/components/floor/LeadDrawer';
import FloorPageSkeleton from '@/components/floor/FloorPageSkeleton';
import TeamActivityPanel from '@/components/floor/TeamActivityPanel';
import AgendaQueue from '@/components/floor/AgendaQueue';
import type { FloorLead } from './types';

const DIRECTOR_LEAD_CAP = 1000;

// Sales Floor is a CRM lens — shows leads that have been TOUCHED or are
// otherwise warm (in-person source, status != 'new'). Untouched cold leads
// stay in Call Center until first contact. Locked 2026-05-21 after Elliott
// articulated the Call Center vs CRM split.
const FLOOR_TOUCHED_OR_WARM_FILTER = 'status.neq.new,last_touch_at.not.is.null';

export default function FloorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<FloorLead[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repId, setRepId] = useState<string | null>(null);
  const [isDirector, setIsDirector] = useState(false);
  const [allReps, setAllReps] = useState<Array<{ id: string; name: string }>>([]);

  // Shadow View persistence (audit-locked 2026-05-22).
  // Director sets shadow in app/page.tsx → writes localStorage. /floor is a
  // separate Next route so we read those keys on mount, sync across tabs via
  // 'storage' event, and re-read on focus.
  const [shadowRepId, setShadowRepId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem('pmss_shadow_rep_id'); } catch { return null; }
  });
  const [shadowRepName, setShadowRepName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try { return localStorage.getItem('pmss_shadow_rep_name') || ''; } catch { return ''; }
  });
  const shadowMode = shadowRepId !== null;

  useEffect(() => {
    const sync = () => {
      try {
        setShadowRepId(localStorage.getItem('pmss_shadow_rep_id'));
        setShadowRepName(localStorage.getItem('pmss_shadow_rep_name') || '');
      } catch {}
    };
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const exitShadow = useCallback(() => {
    try {
      localStorage.removeItem('pmss_shadow_rep_id');
      localStorage.removeItem('pmss_shadow_rep_name');
    } catch {}
    setShadowRepId(null);
    setShadowRepName('');
  }, []);

  // ── auth gate — always verify rep + role from session, never trust localStorage ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      const { data: rep, error: repErr } = await supabase
        .from('reps')
        .select('id, role')
        .eq('auth_id', session.user.id)
        .single();
      if (repErr || !rep) {
        if (!cancelled) {
          setError('No rep account for this user.');
          setLoading(false);
        }
        return;
      }
      if (!cancelled) {
        setRepId(rep.id);
        setIsDirector(rep.role === 'director');
        try {
          localStorage.setItem('pmss_rep_id', rep.id);
          localStorage.setItem('pmss_role', rep.role);
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  // ── filter-by-rep dropdown state (director only) ──
  // URL param ?rep=<rep_id> filters the lead pool. Default null = "All" for
  // directors / "My leads" for reps (who can't change it).
  // Shadow mode FORCES filterRepId to the shadowed rep, overriding any URL
  // param. Audit-locked 2026-05-22.
  const urlFilterRepId = searchParams?.get('rep') ?? null;
  const filterRepId = shadowMode ? shadowRepId : urlFilterRepId;

  // ── lead fetch — abortable, CRM-filtered, capped for directors ──
  // CRM filter: status != 'new' OR last_touch_at IS NOT NULL.
  // (Untouched cold leads belong to Call Center, not Sales Floor.)
  const fetchLeads = useCallback(async (signal?: AbortSignal) => {
    if (!repId) return;
    setError(null);

    // Determine the effective scope:
    //   * Rep → their own assigned leads, CRM-filtered
    //   * Director with ?rep=X → that rep's assigned leads, CRM-filtered
    //   * Director with no filter → ALL CRM-filtered leads, capped
    const effectiveRepFilter = isDirector ? filterRepId : repId;

    const buildQuery = (countOnly: boolean) => {
      let q = supabase
        .from('leads')
        .select(countOnly ? 'id' : '*', countOnly ? { count: 'exact', head: true } : undefined)
        .or(FLOOR_TOUCHED_OR_WARM_FILTER);
      if (effectiveRepFilter) q = q.eq('assigned_rep_id', effectiveRepFilter);
      if (!countOnly) {
        q = q.order('last_touch_at', { ascending: false, nullsFirst: false });
        if (isDirector && !effectiveRepFilter) q = q.limit(DIRECTOR_LEAD_CAP);
      }
      return q;
    };

    const dataQuery = buildQuery(false);
    const { data, error: fetchErr } = await dataQuery.abortSignal(signal as AbortSignal);
    if (signal?.aborted) return;
    if (fetchErr) {
      if ((fetchErr as { code?: string }).code === '20') return;
      setError(fetchErr.message);
      setLoading(false);
      return;
    }
    setLeads((data || []) as FloorLead[]);

    // Fetch total count (only matters when director hits the cap).
    if (isDirector && !effectiveRepFilter) {
      const { count } = await buildQuery(true).abortSignal(signal as AbortSignal);
      if (!signal?.aborted && typeof count === 'number') setTotalCount(count);
    } else {
      setTotalCount(null);
    }
    setLoading(false);
  }, [repId, isDirector, filterRepId]);

  useEffect(() => {
    const ac = new AbortController();
    void fetchLeads(ac.signal);
    return () => ac.abort();
  }, [fetchLeads]);

  // Load rep roster for the filter-by-rep dropdown (director only).
  useEffect(() => {
    if (!isDirector) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('reps')
        .select('id, name')
        .order('name', { ascending: true });
      if (!cancelled && data) setAllReps(data as Array<{ id: string; name: string }>);
    })();
    return () => { cancelled = true; };
  }, [isDirector]);

  const setFilterRepId = useCallback((newRepId: string | null) => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    if (newRepId) params.set('rep', newRepId); else params.delete('rep');
    // Clear drawer state when switching rep view — that lead may not exist in new scope.
    params.delete('lead');
    const s = params.toString();
    router.replace(s ? `/floor?${s}` : '/floor', { scroll: false });
  }, [router, searchParams]);

  // ── URL → drawer state ────────────────────────────────────────────
  const selectedLeadId = searchParams?.get('lead') ?? null;
  const searchQuery = searchParams?.get('q') ?? '';

  // Pinned-active-lead: cache the last seen lead so refetches that
  // momentarily drop it don't unmount the drawer mid-keystroke
  // (Gemini load-bearing catch 2026-05-21).
  const lastSelectedLeadRef = useRef<FloorLead | null>(null);
  const selectedLead = useMemo<FloorLead | null>(() => {
    if (!selectedLeadId) {
      lastSelectedLeadRef.current = null;
      return null;
    }
    const fromList = leads.find((l) => l.id === selectedLeadId);
    if (fromList) {
      lastSelectedLeadRef.current = fromList;
      return fromList;
    }
    return lastSelectedLeadRef.current;
  }, [selectedLeadId, leads]);

  const openLeadDrawer = useCallback((leadId: string) => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    params.set('lead', leadId);
    router.replace(`/floor?${params.toString()}`, { scroll: false });
    void recordAuditEvent({
      actionType: 'floor.drawer_opened',
      leadId,
    });
  }, [router, searchParams]);

  const closeLeadDrawer = useCallback(() => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    params.delete('lead');
    const q = params.toString();
    router.replace(q ? `/floor?${q}` : '/floor', { scroll: false });
  }, [router, searchParams]);

  const setSearchQuery = useCallback((q: string) => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    if (q) params.set('q', q); else params.delete('q');
    const s = params.toString();
    router.replace(s ? `/floor?${s}` : '/floor', { scroll: false });
  }, [router, searchParams]);

  // ── optimistic mutations bubble back here ─────────────────────────
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refetchAbortRef = useRef<AbortController | null>(null);
  const handleLeadUpdated = useCallback((updated: Partial<FloorLead> & { id: string }) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    if (refetchAbortRef.current) refetchAbortRef.current.abort();
    refetchTimerRef.current = setTimeout(() => {
      const ac = new AbortController();
      refetchAbortRef.current = ac;
      void fetchLeads(ac.signal);
    }, 400);
  }, [fetchLeads]);

  useEffect(() => () => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    if (refetchAbortRef.current) refetchAbortRef.current.abort();
  }, []);

  // ── render ────────────────────────────────────────────────────────
  if (loading) return <FloorPageSkeleton />;
  if (error) {
    return (
      <main style={{ padding: 40, color: '#fff', background: '#000', minHeight: '100vh' }}>
        <h1 style={{ fontSize: 18, fontFamily: 'Inter, sans-serif' }}>Floor unavailable</h1>
        <p style={{ marginTop: 8, fontSize: 13, color: '#888' }}>{error}</p>
      </main>
    );
  }

  return (
    <main style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      {/* Shadow Banner — visible whenever shadow mode is active. Matches the
          amber banner from app/page.tsx so the director gets a consistent
          "you are shadowing X" affordance across all routes. */}
      {shadowMode && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 500,
          background: '#F59E0B', color: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '8px 16px',
          fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
          letterSpacing: '.03em', boxShadow: '0 2px 12px rgba(245,158,11,.4)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>SHADOWING: {shadowRepName} — Read Only</span>
          <button
            onClick={exitShadow}
            style={{
              background: '#000', color: '#F59E0B', border: 'none',
              borderRadius: 5, padding: '4px 14px', fontSize: 11, fontWeight: 800,
              cursor: 'pointer', letterSpacing: '.08em', textTransform: 'uppercase',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Exit
          </button>
        </div>
      )}
      <div style={{ paddingTop: 14 }}>
        <TeamActivityPanel />
      </div>
      {/* Agenda Queue — sticky Next Action card + Overdue/Today/Upcoming.
          In shadow view, follows the shadow rep; otherwise follows the
          logged-in rep (directors can have their own callbacks too — the
          component returns null when there are zero callbacks). */}
      {(shadowMode ? shadowRepId : repId) && (
        <AgendaQueue
          repId={(shadowMode ? shadowRepId : repId)!}
          onOpenLead={openLeadDrawer}
        />
      )}
      <LeadSheet
        leads={leads}
        totalCount={totalCount}
        selectedLeadId={selectedLeadId}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onRowClick={openLeadDrawer}
        repId={repId!}
        isDirector={isDirector && !shadowMode}
        allReps={allReps}
        filterRepId={filterRepId}
        onFilterRepIdChange={setFilterRepId}
      />
      {selectedLeadId && selectedLead && repId && (
        <LeadDrawer
          lead={selectedLead}
          repId={repId}
          onClose={closeLeadDrawer}
          onLeadUpdated={handleLeadUpdated}
        />
      )}
    </main>
  );
}
