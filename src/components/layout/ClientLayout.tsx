import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Briefcase, FolderKanban, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn, initials } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export function ClientLayout() {
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
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white text-sm font-bold">
              TF
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-none">TaskFlow</p>
              <p className="text-[11px] text-muted-foreground">Client Portal</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 ml-6">
            <NavLink
              to="/client"
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-violet-50 text-violet-800'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )
              }
            >
              <FolderKanban className="h-4 w-4" />
              My Projects
            </NavLink>
          </nav>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
            </div>
            <Avatar>
              <AvatarFallback className="bg-violet-100 text-violet-800">
                {initials(user?.name || 'C')}
              </AvatarFallback>
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
          <div className="absolute left-0 top-0 h-full w-64 bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <span className="font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Client
              </span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NavLink
              to="/client"
              end
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium bg-violet-50 text-violet-800"
            >
              <FolderKanban className="h-4 w-4" />
              My Projects
            </NavLink>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1600px] p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  )
}
