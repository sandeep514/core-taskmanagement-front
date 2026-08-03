import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  ClipboardList,
  FolderKanban,
  ListTodo,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { cn, initials } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { ForceChangePasswordModal } from '@/components/auth/ForceChangePasswordModal'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const employeeNav = [
  { to: '/employee', label: 'My Projects', shortLabel: 'Projects', icon: FolderKanban, end: true },
  { to: '/employee/tasks', label: 'My Tasks', shortLabel: 'Tasks', icon: ClipboardList },
  { to: '/employee/todos', label: 'My Todos', shortLabel: 'Todos', icon: ListTodo },
  { to: '/employee/work-report', label: 'Work Report', shortLabel: 'Report', icon: BarChart3 },
  { to: '/employee/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
] as const

export function EmployeeLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
              TF
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-none">TaskFlow</p>
              <p className="text-[11px] text-muted-foreground">Employee Portal</p>
            </div>
          </div>

          {/* Scrollable nav so Work Report is never clipped off-screen */}
          <nav className="hidden md:flex items-center gap-0.5 ml-2 min-w-0 flex-1 overflow-x-auto scrollbar-thin py-1">
            {employeeNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
                <span className="lg:hidden">{item.shortLabel}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
            </div>
            <Avatar>
              <AvatarFallback>{initials(user?.name || 'E')}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-card p-4 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="font-semibold">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {employeeNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium mb-1',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-secondary',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1600px] p-4 lg:p-6">
        <Outlet />
      </main>

      <ForceChangePasswordModal />
    </div>
  )
}
