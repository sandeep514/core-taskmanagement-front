import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, ClipboardList, ExternalLink } from 'lucide-react'
import { fetchMyAssignedTasks } from '@/lib/api'
import type { Task } from '@/types'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/types'
import { cn, formatDate, isClientAssignedTask, isOverdue } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'

type StatusFilter = 'open' | 'all' | 'done'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
  { value: 'all', label: 'All' },
]

export function MyAssignedTasksPage() {
  const role = useAuthStore((s) => s.user?.role)
  const projectsBase = role === 'client' ? '/client' : '/employee'
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-assigned-tasks'],
    queryFn: fetchMyAssignedTasks,
  })

  const filtered = useMemo(() => {
    const list = data ?? []
    if (statusFilter === 'open') return list.filter((t) => t.status !== 'done')
    if (statusFilter === 'done') return list.filter((t) => t.status === 'done')
    return list
  }, [data, statusFilter])

  const stats = useMemo(() => {
    const list = data ?? []
    return {
      total: list.length,
      open: list.filter((t) => t.status !== 'done').length,
      overdue: list.filter((t) => isOverdue(t.deadline, t.status)).length,
      urgent: list.filter((t) => t.priority === 'urgent' && t.status !== 'done').length,
    }
  }, [data])

  const openDetail = (task: Task) => {
    setSelectedTaskId(task.id)
    setActiveProjectId(task.project_id)
    setDetailOpen(true)
  }

  const openEdit = (task: Task) => {
    setDetailOpen(false)
    setEditingTask(task)
    setActiveProjectId(task.project_id)
    setFormOpen(true)
  }

  if (isLoading) return <PageLoader />

  if (isError) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Could not load your assigned tasks.</p>
        <Button variant="link" className="mt-2" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="My Tasks"
        description="Tasks assigned to you across all projects, ordered by priority and deadline."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                statusFilter === f.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{stats.open} open</Badge>
          {stats.urgent > 0 && (
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{stats.urgent} urgent</Badge>
          )}
          {stats.overdue > 0 && (
            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
              {stats.overdue} overdue
            </Badge>
          )}
        </div>
      </div>

      {!filtered.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No assigned tasks"
          description={
            statusFilter === 'open'
              ? 'You have no open tasks assigned to you right now.'
              : 'No tasks match this filter.'
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Task</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Deadline</th>
                    <th className="px-4 py-3 font-medium text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => {
                    const priority = TASK_PRIORITIES.find((p) => p.value === task.priority)
                    const status = TASK_STATUSES.find((s) => s.value === task.status)
                    const overdue = isOverdue(task.deadline, task.status)
                    const clientAssigned = isClientAssignedTask(task)

                    return (
                      <tr
                        key={task.id}
                        className={cn(
                          'border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer',
                          clientAssigned && 'bg-violet-50/70 hover:bg-violet-50',
                        )}
                        onClick={() => openDetail(task)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            {clientAssigned && (
                              <span className="mt-0.5 shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
                                Client
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{task.title}</p>
                              {task.details && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                  {task.details}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`${projectsBase}/projects/${task.project_id}`}
                            className="text-foreground hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {task.project?.project_name ?? `Project #${task.project_id}`}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {priority && (
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                                priority.color,
                              )}
                            >
                              {priority.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {status && (
                            <span
                              className={cn(
                                'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                                status.color,
                              )}
                            >
                              {status.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5',
                              overdue && 'font-medium text-red-600',
                            )}
                          >
                            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                            {formatDate(task.deadline)}
                            {overdue && <span className="text-xs">Overdue</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link to={`${projectsBase}/projects/${task.project_id}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                              Board
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeProjectId != null && (
        <>
          <TaskDetailModal
            open={detailOpen}
            onOpenChange={setDetailOpen}
            taskId={selectedTaskId}
            projectId={activeProjectId}
            onEdit={openEdit}
          />
          <TaskFormModal
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open)
              if (!open) setEditingTask(null)
            }}
            projectId={activeProjectId}
            task={editingTask}
          />
        </>
      )}
    </div>
  )
}
