'use client';

// /floor — Sales Floor route.
//
// Single 'use client' page matching the rest of the portal's auth model
// (localStorage + supabase anon key + RLS). Per 2026-05-21 pre-build audit,
// Gemini load-bearing call: do NOT migrate to Server Components for one
// route — would require switching the whole portal to @supabase/ssr cookies.
//
// Implementation patterns locked by audit:
//   * URL is source of truth for the drawer (`?lead=<uuid>`) AND filter
//     (`?q=<search>`). TanStack rowSelection is derived from URL.
//   * No Realtime on leads / timeline — pure useEffect + optimistic +
//     refresh-on-action invalidation. Realtime only for team activity panel
//     (Slice 1.5).
//   * Pinned-active-lead: lastSelectedLeadRef caches the drawer's lead so
//     refetches that drop it (rare — reassignment, deletion) don't destroy
//     the rep's unsaved drawer state.
//   * Drawer in a React Portal to document.body so the mobile fullscreen
//     modal doesn't hit the overlay-containment trap.
//   * Role + repId resolved from session every load — never trusted from
//     localStorage alone (post-build audit fix 2026-05-21).

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Lead } from '@/lib/types';
import { recordAuditEvent } from '@/features/audit';
import LeadSheet from '@/components/floor/LeadSheet';
import LeadDrawer from '@/components/floor/LeadDrawer';
import FloorPageSkeleton from '@/components/floor/FloorPageSkeleton';
import TeamActivityPanel from '@/components/floor/TeamActivityPanel';

// Extended lead row with the new counter columns (added 2026-05-21).
export interface FloorLead extends Lead {
  last_touch_at?: string | null;
  touch_count?: number;
  connect_count?: number;
}

const DIRECTOR_LEAD_CAP = 1000;

export default function FloorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<FloorLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repId, setRepId] = useState<string | null>(null);
  const [isDirector, setIsDirector] = useState(false);

  // ── auth gate — always verify rep + role from session, never trust localStorage ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      // Authoritative lookup — session.user.id → reps row.
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
        // Cache for sibling code that still reads pmss_rep_id (lib/audit.ts).
        try {
          localStorage.setItem('pmss_rep_id', rep.id);
          localStorage.setItem('pmss_role', rep.role);
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  // ── lead fetch — abortable, capped for directors ──
  const fetchLeads = useCallback(async (signal?: AbortSignal) => {
    if (!repId) return;
    setError(null);
    const baseQuery = supabase.from('leads').select('*');
    const query = isDirector
      ? baseQuery
          .order('last_touch_at', { ascending: false, nullsFirst: false })
          .limit(DIRECTOR_LEAD_CAP)
      : baseQuery
          .eq('assigned_rep_id', repId)
          .order('last_touch_at', { ascending: false, nullsFirst: false });

    const { data, error: fetchErr } = await query.abortSignal(signal as AbortSignal);
    if (signal?.aborted) return;
    if (fetchErr) {
      // PostgREST aborts surface as { code: '20' } — don't show as error.
      if ((fetchErr as { code?: string }).code === '20') return;
      setError(fetchErr.message);
      setLoading(false);
      return;
    }
    setLeads((data || []) as FloorLead[]);
    setLoading(false);
  }, [repId, isDirector]);

  useEffect(() => {
    const ac = new AbortController();
    void fetchLeads(ac.signal);
    return () => ac.abort();
  }, [fetchLeads]);

  // ── URL → drawer state ────────────────────────────────────────────
  const selectedLeadId = searchParams?.get('lead') ?? null;
  const searchQuery = searchParams?.get('q') ?? '';

  // Pinned-active-lead: cache the last seen lead so refetches that
  // momentarily drop it (rare — reassignment, deletion) don't unmount
  // the drawer mid-keystroke (Gemini load-bearing catch 2026-05-21).
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
  // Children call onLeadUpdated({ id, ...patch }) after a successful action.
  // Local state patches immediately for optimistic feel. A debounced background
  // refetch picks up trigger-maintained columns (touch_count, last_touch_at).
  // Abortable so rapid successive mutations don't queue duplicate fetches.
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refetchAbortRef = useRef<AbortController | null>(null);
  const handleLeadUpdated = useCallback((updated: Partial<FloorLead> & { id: string }) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    // Debounce + abort prior in-flight refetch.
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
      <div style={{ paddingTop: 14 }}>
        <TeamActivityPanel />
      </div>
      <LeadSheet
        leads={leads}
        selectedLeadId={selectedLeadId}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onRowClick={openLeadDrawer}
        repId={repId!}
      />
      {/* Drawer renders based on URL state; the pinned-ref lets it survive
          a momentary leads-array drop without losing unsaved drawer state. */}
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
