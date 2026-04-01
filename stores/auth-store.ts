import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Rep } from '@/lib/types';

interface AuthState {
  userName: string;
  userEmail: string;
  userRole: 'rep' | 'director';
  repId: string | null;
  repPhone: string | null;
  appLoading: boolean;

  setAuth: (rep: Rep) => void;
  clearAuth: () => void;
  setAppLoading: (loading: boolean) => void;
  setRepPhone: (phone: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userName: '',
  userEmail: '',
  userRole: 'rep',
  repId: null,
  repPhone: null,
  appLoading: true,

  setAuth: (rep: Rep) => set({
    userName: rep.name,
    userEmail: rep.email,
    userRole: rep.role,
    repId: rep.id,
    repPhone: rep.phone || null,
  }),

  clearAuth: () => set({
    userName: '',
    userEmail: '',
    userRole: 'rep',
    repId: null,
    repPhone: null,
  }),

  setAppLoading: (loading: boolean) => set({ appLoading: loading }),

  setRepPhone: (phone: string) => set({ repPhone: phone }),

  logout: async () => {
    await supabase.auth.signOut();
    try {
      localStorage.removeItem('pmss_user');
      localStorage.removeItem('pmss_email');
      localStorage.removeItem('pmss_view');
    } catch {}
    set({
      userName: '',
      userEmail: '',
      userRole: 'rep',
      repId: null,
      repPhone: null,
    });
  },
}));
