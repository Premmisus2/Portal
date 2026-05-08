'use client';

import { useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useClosesStore } from '@/stores/closes-store';
import { useShadowStore } from '@/stores/shadow-store';
import { useUIStore } from '@/stores/ui-store';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const setAuth = useAuthStore(s => s.setAuth);
  const clearAuth = useAuthStore(s => s.clearAuth);
  const setAppLoading = useAuthStore(s => s.setAppLoading);
  const logout = useAuthStore(s => s.logout);
  const repId = useAuthStore(s => s.repId);

  const loadCloses = useClosesStore(s => s.loadCloses);

  const setAllReps = useShadowStore(s => s.setAllReps);

  const setMissedEvents = useUIStore(s => s.setMissedEvents);
  const setShowNotifPopup = useUIStore(s => s.setShowNotifPopup);

  // A1: Auto-login — check Supabase session on mount
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: repData } = await supabase
            .from('reps')
            .select('*')
            .eq('auth_id', session.user.id)
            .single();
          if (repData) {
            setAuth(repData);
            await loadCloses(repData.id);

            // Load all reps for shadow view if director
            if (repData.role === 'director') {
              const { data: repsData } = await supabase
                .from('reps')
                .select('id, name, email, role')
                .order('created_at', { ascending: true });
              if (repsData) setAllReps(repsData.filter((r: { role: string }) => r.role !== 'director'));

              // Director notification popup — query events since last visit
              try {
                const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
                const stored = localStorage.getItem('pmss_last_director_visit');
                const lastVisit = stored && stored > sevenDaysAgo ? stored : sevenDaysAgo;
                const [bookings, callbacks, handoffs, totalCalls] = await Promise.all([
                  supabase.from('call_logs').select('*, reps(name), leads(business_name)').in('outcome', ['booked_call', 'discovery_completed']).gt('created_at', lastVisit),
                  supabase.from('call_logs').select('*, reps(name), leads(business_name)').eq('outcome', 'callback_requested').gt('created_at', lastVisit),
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
              } catch (notifErr) {
                console.warn('Notification popup query failed:', notifErr);
              }
            }

            try {
              localStorage.setItem('pmss_user', repData.name);
              localStorage.setItem('pmss_email', repData.email);
            } catch {}
          }
        }
      } catch {}
      setAppLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A2: Auth state change listener — detect sign-outs and expired sessions
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        clearAuth();
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A3: Visibility change handler — re-check session when app comes back to foreground (mobile)
  useEffect(() => {
    const handleVis = async () => {
      if (document.visibilityState === 'visible' && repId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { logout(); }
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [repId, logout]);

  // A4: 10-minute heartbeat — verify session is still alive
  useEffect(() => {
    if (!repId) return;
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) logout();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [repId, logout]);

  return <>{children}</>;
}
