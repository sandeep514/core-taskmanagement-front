import { Pencil, Power } from 'lucide-react'
import type { EntityStatus } from '@/types'
import { Button } from '@/components/ui/button'

interface Props {
  /** Used in accessible labels, e.g. "Edit Engineering". */
  name: string
  status: EntityStatus
  onEdit: () => void
  onToggle: () => void
  disabled?: boolean
}

export function EntityActions({ name, status, onEdit, onToggle, disabled }: Props) {
  const active = status === 'active'
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label={`Edit ${name}`} title="Edit" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`${active ? 'Deactivate' : 'Activate'} ${name}`}
        title={active ? 'Deactivate' : 'Activate'}
        disabled={disabled}
        className={
          active
            ? 'text-amber-600 hover:text-amber-700'
            : 'text-emerald-600 hover:text-emerald-700'
        }
        onClick={onToggle}
      >
        <Power className="h-4 w-4" />
      </Button>
    </div>
  )
}
