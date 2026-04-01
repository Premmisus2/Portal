import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { PRODUCT_LABELS } from '@/lib/constants';

interface CloseEntry {
  pts: number;
  id?: string;
}

interface ClosesState {
  totalCloses: number;
  totalPoints: number;
  closeHistory: CloseEntry[];
  lastClosePts: number;

  loadCloses: (repId: string) => Promise<void>;
  addClose: (pts: number, repId: string | null) => Promise<void>;
  undoClose: (repId: string | null) => Promise<void>;
  setCloses: (closes: number, points: number, history: CloseEntry[]) => void;
}

export const useClosesStore = create<ClosesState>((set, get) => ({
  totalCloses: 0,
  totalPoints: 0,
  closeHistory: [],
  lastClosePts: 1,

  loadCloses: async (repId: string) => {
    const { data } = await supabase.from('closes').select('*').eq('rep_id', repId).order('created_at', { ascending: true });
    if (data) {
      const history = data.map((c: { pts: number; id: string }) => ({ pts: c.pts, id: c.id }));
      const totalCloses = data.length;
      const totalPoints = data.reduce((s: number, c: { pts: number }) => s + c.pts, 0);
      const lastClosePts = data.length > 0 ? data[data.length - 1].pts : 1;
      set({ closeHistory: history, totalCloses, totalPoints, lastClosePts });
      try {
        localStorage.setItem('pmss_closes', String(totalCloses));
        localStorage.setItem('pmss_points', String(totalPoints));
      } catch {}
    }
  },

  addClose: async (pts: number, repId: string | null) => {
    const label = PRODUCT_LABELS[pts] || 'Unknown';
    set(s => ({
      totalCloses: s.totalCloses + 1,
      totalPoints: s.totalPoints + pts,
      lastClosePts: pts,
    }));

    if (repId) {
      const { data, error: closeErr } = await supabase
        .from('closes')
        .insert({ rep_id: repId, pts, product_label: label })
        .select()
        .single();
      if (closeErr) {
        alert('Failed to save close: ' + closeErr.message);
        set(s => ({
          totalCloses: s.totalCloses - 1,
          totalPoints: s.totalPoints - pts,
        }));
        return;
      }
      set(s => {
        const n = [...s.closeHistory, { pts, id: data?.id }];
        try { localStorage.setItem('pmss_history', JSON.stringify(n)); } catch {}
        return { closeHistory: n };
      });
    } else {
      set(s => {
        const n = [...s.closeHistory, { pts }];
        try { localStorage.setItem('pmss_history', JSON.stringify(n)); } catch {}
        return { closeHistory: n };
      });
    }
    try { localStorage.setItem('pmss_last_pts', String(pts)); } catch {}
  },

  undoClose: async (repId: string | null) => {
    const { totalCloses, closeHistory, lastClosePts } = get();
    if (totalCloses <= 0) return;

    const last = closeHistory[closeHistory.length - 1];
    const ptsToRemove = last?.pts || lastClosePts;

    // Only allow undo within 60 seconds
    set(s => ({
      totalCloses: Math.max(0, s.totalCloses - 1),
      totalPoints: Math.max(0, s.totalPoints - ptsToRemove),
    }));

    if (last?.id && repId) {
      await supabase.from('closes').delete().eq('id', last.id);
    }

    set(s => {
      const n = s.closeHistory.slice(0, -1);
      try { localStorage.setItem('pmss_history', JSON.stringify(n)); } catch {}
      return { closeHistory: n };
    });
  },

  setCloses: (closes: number, points: number, history: CloseEntry[]) => set({
    totalCloses: closes,
    totalPoints: points,
    closeHistory: history,
  }),
}));
