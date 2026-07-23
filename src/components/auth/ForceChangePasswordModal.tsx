import { useEffect } from 'react'
import { ShieldAlert } from 'lucide-react'
import { fetchMe } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Blocking modal when the account still uses the admin-set default password. */
export function ForceChangePasswordModal() {
  const mustChange = useAuthStore((s) => s.user?.must_change_password === true)
  const updateUser = useAuthStore((s) => s.updateUser)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    ;(async () => {
      try {
        const me = await fetchMe()
        if (!cancelled) updateUser(me)
      } catch {
        // ignore — layout will handle auth errors via interceptor
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, updateUser])

  return (
    <Dialog open={mustChange} onOpenChange={() => {}}>
      <DialogContent
        hideCloseButton
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Change your password</DialogTitle>
          <DialogDescription className="text-center">
            Your account is still using the temporary password set by admin. You must
            choose a new password before continuing.
          </DialogDescription>
        </DialogHeader>

        <ChangePasswordForm forced submitLabel="Set new password" />
      </DialogContent>
    </Dialog>
  )
}
