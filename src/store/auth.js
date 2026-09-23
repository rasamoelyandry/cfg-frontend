import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authPersistStorage, setRemembered, clearAuthState } from '../utils/authStorage.js';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: ({ user, accessToken, refreshToken, rememberMe = true }) => {
        // Must run before `set`, so persist writes to the right storage.
        setRemembered(rememberMe);
        set({ user, accessToken, refreshToken });
      },

      setAccessToken: (accessToken) => {
        set({ accessToken });
      },

      clearAuth: () => {
        clearAuthState();
        set({ user: null, accessToken: null, refreshToken: null });
      },

      isAuthenticated: () => {
        return !!get().accessToken && !!get().user;
      },

      hasRole: (...roles) => {
        const user = get().user;
        if (!user) return false;
        return roles.includes(user.role);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => authPersistStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
