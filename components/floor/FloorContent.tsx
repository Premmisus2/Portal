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
import type { FloorLead } from './types';

const DIRECTOR_LEAD_CAP = 1000;

export default function FloorContent() {
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
