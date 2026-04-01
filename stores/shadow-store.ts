import { create } from 'zustand';
type RepSummary = { id: string; name: string; email: string; role: string };

interface ShadowState {
  shadowRepId: string | null;
  shadowRepName: string;
  allReps: RepSummary[];
  viewAsRep: boolean;

  enterShadow: (repId: string, name: string) => void;
  exitShadow: () => void;
  setAllReps: (reps: RepSummary[]) => void;
  toggleViewAsRep: () => void;
}

export const useShadowStore = create<ShadowState>((set) => ({
  shadowRepId: null,
  shadowRepName: '',
  allReps: [],
  viewAsRep: (() => { try { return localStorage.getItem('pmss_viewAsRep') === 'true'; } catch { return false; } })(),

  enterShadow: (repId: string, name: string) => set({
    shadowRepId: repId,
    shadowRepName: name,
  }),

  exitShadow: () => set({
    shadowRepId: null,
    shadowRepName: '',
  }),

  setAllReps: (reps: RepSummary[]) => set({ allReps: reps }),

  toggleViewAsRep: () => set((s) => {
    const next = !s.viewAsRep;
    try { localStorage.setItem('pmss_viewAsRep', String(next)); } catch {}
    return { viewAsRep: next };
  }),
}));
