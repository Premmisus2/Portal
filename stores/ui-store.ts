import { create } from 'zustand';

interface MissedEvents {
  bookings: Array<Record<string, unknown>>;
  callbacks: Array<Record<string, unknown>>;
  handoffs: Array<Record<string, unknown>>;
  totalCalls: number;
}

interface UIState {
  globalSidebarOpen: boolean;
  showShortcuts: boolean;
  showNotifPopup: boolean;
  missedEvents: MissedEvents | null;
  lastDirectorVisit: string | null;

  toggleSidebar: () => void;
  setShowShortcuts: (show: boolean) => void;
  setShowNotifPopup: (show: boolean) => void;
  setMissedEvents: (events: MissedEvents | null) => void;
  loadLastDirectorVisit: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  globalSidebarOpen: false,
  showShortcuts: false,
  showNotifPopup: false,
  missedEvents: null,
  lastDirectorVisit: null,

  toggleSidebar: () => set((s) => ({ globalSidebarOpen: !s.globalSidebarOpen })),

  setShowShortcuts: (show: boolean) => set({ showShortcuts: show }),

  setShowNotifPopup: (show: boolean) => set({ showNotifPopup: show }),

  setMissedEvents: (events: MissedEvents | null) => set({ missedEvents: events }),

  loadLastDirectorVisit: () => {
    try {
      const lastVisit = localStorage.getItem('pmss_last_director_visit') || null;
      set({ lastDirectorVisit: lastVisit });
    } catch {
      set({ lastDirectorVisit: null });
    }
  },
}));
