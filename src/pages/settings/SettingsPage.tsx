import { KeyRound, Smartphone, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
  )
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const installed = isStandaloneApp()
  const ios = isIosDevice()

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Settings"
        description="Manage your account security and profile details."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-muted-foreground" />
            Profile
          </CardTitle>
          <CardDescription>Signed-in account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-border pb-3">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium text-right">{user?.name}</span>
          </div>
          <div className="flex justify-between gap-4 border-b border-border pb-3">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-right">{user?.email}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium capitalize text-right">{user?.role}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            Install app (PWA)
          </CardTitle>
          <CardDescription>
            Use TaskFlow like a native app on your phone or tablet.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          {installed ? (
            <p className="text-foreground font-medium">
              You’re using the installed app on this device.
            </p>
          ) : ios ? (
            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
              <li>Open this site in Safari (not Chrome or in-app browsers).</li>
              <li>
                Tap the Share button, then <span className="font-medium text-foreground">Add to Home Screen</span>.
              </li>
              <li>
                Tap <span className="font-medium text-foreground">Add</span>. TaskFlow opens full screen from your Home Screen.
              </li>
            </ol>
          ) : (
            <p className="leading-relaxed">
              On Android Chrome, use the browser menu → <span className="font-medium text-foreground">Install app</span>{' '}
              (or Accept install when prompted). On desktop Chrome/Edge, use the install icon in the address bar.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Change password
          </CardTitle>
          <CardDescription>
            Update the password you use to sign in. Use something other than the
            temporary default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
