import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Briefcase, Loader2, Shield, User } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getApiError } from '@/lib/api-error'
import { homePathForRole } from '@/lib/api'

const roleDefaults: Record<UserRole, string> = {
  admin: '',
  employee: 'alex@taskflow.com',
  client: 'acme@login.com',
}

export function LoginPage() {
  const { isAuthenticated, user, login } = useAuthStore()
  const navigate = useNavigate()
  const [role, setRole] = useState<UserRole>('admin')
  const [email, setEmail] = useState(roleDefaults.admin)
  const [password, setPassword] = useState('password')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated && user) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  const switchRole = (r: UserRole) => {
    setRole(r)
    setEmail(roleDefaults[r])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(role, email, password)
      toast.success('Welcome back!')
      navigate(homePathForRole(role))
    } catch (err) {
      toast.error(getApiError(err, 'Invalid credentials. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  const roleLabel =
    role === 'admin' ? 'Admin' : role === 'employee' ? 'Employee' : 'Client'

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between bg-slate-950 p-12 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-600/40 via-slate-950 to-slate-950" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 font-bold shadow-lg shadow-indigo-500/40">
            TF
          </div>
          <span className="text-xl font-semibold tracking-tight">TaskFlow</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Admin, team &amp; client portals
          </h1>
          <p className="mt-4 text-slate-400 text-lg leading-relaxed">
            Manage organization setup, employee Kanban boards, and let clients track and
            contribute to their project tasks.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Admin', value: 'Org' },
              { label: 'Employee', value: 'Team' },
              { label: 'Client', value: 'Portal' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-slate-500">
          © {new Date().getFullYear()} TaskFlow. Built with React + Laravel.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white font-bold">
              TF
            </div>
            <span className="font-semibold text-lg">TaskFlow</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Choose your portal and enter your credentials
          </p>

          <div className="mt-6 grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
            {(
              [
                { key: 'admin' as const, icon: Shield, label: 'Admin' },
                { key: 'employee' as const, icon: User, label: 'Employee' },
                { key: 'client' as const, icon: Briefcase, label: 'Client' },
              ] as const
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => switchRole(key)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs sm:text-sm font-medium transition-all',
                  role === key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in as {roleLabel}
            </Button>
          </form>

          
        </div>
      </div>
    </div>
  )
}
