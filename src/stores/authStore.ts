import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, UserRole } from '@/types'
import * as api from '@/lib/api'

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (role: UserRole, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setSession: (token: string, user: AuthUser) => void
  hydrateToken: () => void
}

function persistToken(token: string | null, user: AuthUser | null) {
  if (token && user) {
    localStorage.setItem('taskflow_token', token)
    localStorage.setItem('taskflow_user', JSON.stringify(user))
  } else {
    localStorage.removeItem('taskflow_token')
    localStorage.removeItem('taskflow_user')
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setSession: (token, user) => {
        persistToken(token, user)
        set({ token, user, isAuthenticated: true })
      },

      hydrateToken: () => {
        const { token, user, isAuthenticated } = get()
        if (isAuthenticated && token && user) {
          persistToken(token, user)
        }
      },

      login: async (role, email, password) => {
        const res =
          role === 'admin'
            ? await api.loginAdmin(email, password)
            : role === 'client'
              ? await api.loginClient(email, password)
              : await api.loginEmployee(email, password)
        persistToken(res.token, res.user)
        set({ token: res.token, user: res.user, isAuthenticated: true })
      },

      logout: async () => {
        try {
          await api.logout()
        } catch {
          // ignore network errors on logout
        }
        persistToken(null, null)
        set({ token: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'taskflow-auth',
      partialize: (s) => ({
        token: s.token,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Keep axios interceptor keys in sync after page reload
        if (state?.token && state.user) {
          localStorage.setItem('taskflow_token', state.token)
          localStorage.setItem('taskflow_user', JSON.stringify(state.user))
        }
      },
    },
  ),
)
