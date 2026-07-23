import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { changePassword } from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DEFAULT_PASSWORD = '123456'

interface ChangePasswordFormProps {
  /** When true, current password defaults to the temporary password and can be hidden. */
  forced?: boolean
  onSuccess?: () => void
  submitLabel?: string
}

export function ChangePasswordForm({
  forced = false,
  onSuccess,
  submitLabel = 'Update password',
}: ChangePasswordFormProps) {
  const updateUser = useAuthStore((s) => s.updateUser)
  const [currentPassword, setCurrentPassword] = useState(forced ? DEFAULT_PASSWORD : '')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('New password must be at least 6 characters.')
      return
    }
    if (password === DEFAULT_PASSWORD) {
      toast.error('Please choose a password other than the default temporary password.')
      return
    }
    if (password !== passwordConfirmation) {
      toast.error('New password and confirmation do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await changePassword({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      })
      updateUser({ ...res.user, must_change_password: false })
      toast.success(res.message || 'Password updated successfully.')
      setCurrentPassword('')
      setPassword('')
      setPasswordConfirmation('')
      onSuccess?.()
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update password.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!forced && (
        <div className="space-y-2">
          <Label htmlFor="current_password">Current password</Label>
          <Input
            id="current_password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
      )}

      {forced && (
        <input type="hidden" name="current_password" value={currentPassword} />
      )}

      <div className="space-y-2">
        <Label htmlFor="new_password">New password</Label>
        <Input
          id="new_password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          minLength={6}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password_confirmation">Confirm new password</Label>
        <Input
          id="password_confirmation"
          type="password"
          autoComplete="new-password"
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          minLength={6}
          required
        />
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  )
}
