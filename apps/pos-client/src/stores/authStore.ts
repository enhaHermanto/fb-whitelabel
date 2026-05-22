import { create } from 'zustand';
import type { User } from '@resto-pos/shared-types';
import { API_URL } from './posStore';

interface AuthState {
  currentUser: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;

  login: (tenantId: string, username: string, password: string) => Promise<boolean>;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  token: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,

  login: async (tenantId, username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/${tenantId}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal masuk. Silakan cek kredensial Anda.');
      }

      const data = await res.json();
      
      // Store in LocalStorage for persistence
      localStorage.setItem('pos_auth_user', JSON.stringify(data.user));
      localStorage.setItem('pos_auth_token', data.token);

      set({
        currentUser: data.user,
        token: data.token,
        isLoggedIn: true,
        isLoading: false
      });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('pos_auth_user');
    localStorage.removeItem('pos_auth_token');
    set({
      currentUser: null,
      token: null,
      isLoggedIn: false,
      error: null
    });
  },

  initializeAuth: () => {
    const storedUser = localStorage.getItem('pos_auth_user');
    const storedToken = localStorage.getItem('pos_auth_token');

    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        set({
          currentUser: user,
          token: storedToken,
          isLoggedIn: true
        });
      } catch (e) {
        localStorage.removeItem('pos_auth_user');
        localStorage.removeItem('pos_auth_token');
      }
    }
  }
}));
