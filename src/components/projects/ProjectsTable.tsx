import { cn, formatDate } from '@/lib/utils'
import type { Project } from '@/types'
import { Badge } from '@/components/ui/badge'
import { StatusDot } from '@/components/ui/status-dot'
import { ProjectRowActions } from './ProjectRowActions'

export interface ProjectListProps {
  projects: Project[]
  boardHref: (p: Project) => string
  onEdit: (p: Project) => void
  onToggle: (p: Project) => void
}

const isOverdue = (p: Project) =>
  p.status === 'active' && !!p.deadline && new Date(p.deadline) < new Date(new Date().toDateString())

function Deadline({ project }: { project: Project }) {
  if (!project.deadline) return <span>—</span>
  const overdue = isOverdue(project)
  return (
    <span className={cn('whitespace-nowrap', overdue && 'text-red-600 font-medium')}>
      {formatDate(project.deadline)}
      {overdue && <span className="ml-1.5 text-xs">(overdue)</span>}
    </span>
  )
}

export function ProjectsTable({ projects, boardHref, onEdit, onToggle }: ProjectListProps) {
  return (
    <>
      <table className="hidden md:table w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[10%]" />
          <col className="w-[14%]" />
          <col className="w-[8%]" />
          <col className="w-[7%]" />
          <col />
          <col className="w-[10rem] lg:w-[13rem]" />
        </colgroup>
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr className="border-b border-border">
            <th scope="col" className="px-4 py-2 text-left font-medium">Project</th>
            <th scope="col" className="px-4 py-2 text-left font-medium">Status</th>
            <th scope="col" className="px-4 py-2 text-left font-medium">Deadline</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Members</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Tasks</th>
            <th scope="col" className="px-4 py-2 text-left font-medium">Departments</th>
            <th scope="col" className="px-4 py-2"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((p) => (
            <tr
              key={p.id}
              className={cn(
                'transition-colors hover:bg-muted/40 focus-within:bg-muted/40',
                p.status !== 'active' && 'text-muted-foreground',
              )}
            >
              <td className="px-4 py-2.5">
                <span className="block font-medium text-foreground truncate" title={p.project_name}>
                  {p.project_name}
                </span>
              </td>
              <td className="px-4 py-2.5"><StatusDot status={p.status} /></td>
              <td className="px-4 py-2.5"><Deadline project={p} /></td>
              <td className="px-4 py-2.5 text-right tabular-nums">{p.employees?.length ?? 0}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{p.tasks_count ?? 0}</td>
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {p.departments?.length
                    ? p.departments.map((d) => (
                        <Badge key={d.id} variant="outline" className="font-normal">{d.department}</Badge>
                      ))
                    : '—'}
                </div>
              </td>
              <td className="px-4 py-1.5">
                <ProjectRowActions project={p} boardHref={boardHref(p)} onEdit={onEdit} onToggle={onToggle} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="md:hidden divide-y divide-border">
        {projects.map((p) => (
          <li key={p.id} className="px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className={cn('truncate font-medium', p.status !== 'active' && 'text-muted-foreground')}>
                {p.project_name}
              </p>
              <StatusDot status={p.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              <Deadline project={p} /> · {p.employees?.length ?? 0} members · {p.tasks_count ?? 0} tasks
            </p>
            <ProjectRowActions project={p} boardHref={boardHref(p)} onEdit={onEdit} onToggle={onToggle} />
          </li>
        ))}
      </ul>
    </>
  )
}
