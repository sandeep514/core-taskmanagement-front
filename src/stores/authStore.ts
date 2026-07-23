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
  updateUser: (user: AuthUser) => void
  clearMustChangePassword: () => void
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

      updateUser: (user) => {
        const { token } = get()
        if (token) persistToken(token, user)
        set({ user })
      },

      clearMustChangePassword: () => {
        const { user, token } = get()
        if (!user) return
        const next = { ...user, must_change_password: false }
        if (token) persistToken(token, next)
        set({ user: next })
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

        const user: AuthUser = {
          ...res.user,
          // Also treat a typed default password as requiring change (covers any lag).
          must_change_password:
            res.user.must_change_password === true || password === '123456',
        }

        persistToken(res.token, user)
        set({ token: res.token, user, isAuthenticated: true })
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
