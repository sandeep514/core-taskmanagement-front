import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
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

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  required,
  minLength,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  placeholder?: string
  required?: boolean
  minLength?: number
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          minLength={minLength}
          className="pr-10"
          required={required}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
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
        <PasswordField
          id="current_password"
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          required
        />
      )}

      {forced && (
        <input type="hidden" name="current_password" value={currentPassword} />
      )}

      <PasswordField
        id="new_password"
        label="New password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder="At least 6 characters"
        minLength={6}
        required
      />

      <PasswordField
        id="password_confirmation"
        label="Confirm new password"
        value={passwordConfirmation}
        onChange={setPasswordConfirmation}
        autoComplete="new-password"
        minLength={6}
        required
      />

      <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  )
}
