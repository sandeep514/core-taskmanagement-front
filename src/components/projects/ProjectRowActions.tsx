import { Link } from 'react-router-dom'
import { Columns3, Pencil, Power } from 'lucide-react'
import type { Project } from '@/types'
import { Button } from '@/components/ui/button'

interface Props {
  project: Project
  boardHref: string
  onEdit: (p: Project) => void
  onToggle: (p: Project) => void
}

import { Link } from 'react-router-dom'
import { Columns3, Pencil, Power } from 'lucide-react'
import type { Project } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'

interface Props {
  project: Project
  boardHref: string
  onEdit: (p: Project) => void
  onToggle: (p: Project) => void
}

export function ProjectRowActions({ project, boardHref, onEdit, onToggle }: Props) {
  // EA role is view + create only — board link stays, edit/toggle hide.
  const role = useAuthStore((s) => s.user?.role)
  const readOnly = role === 'ea'
  const active = project.status === 'active'
  return (
    <div className="flex justify-end gap-1">
      <Button asChild variant="outline" size="sm">
        <Link to={boardHref} aria-label={`Open Kanban board for ${project.project_name}`}>
          <Columns3 className="h-4 w-4" />
          <span className="hidden lg:inline">Board</span>
        </Link>
      </Button>
      {!readOnly && (
        <>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${project.project_name}`}
            title="Edit"
            onClick={() => onEdit(project)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${active ? 'Deactivate' : 'Activate'} ${project.project_name}`}
            title={active ? 'Deactivate' : 'Activate'}
            className={
              active
                ? 'text-amber-600 hover:text-amber-700'
                : 'text-emerald-600 hover:text-emerald-700'
            }
            onClick={() => onToggle(project)}
          >
            <Power className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}
