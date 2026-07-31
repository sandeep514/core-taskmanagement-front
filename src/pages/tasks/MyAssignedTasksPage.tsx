import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, ClipboardList, ExternalLink, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { fetchCopyTargetProjects, fetchMyAssignedTasks, updateTaskStatus } from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import type { Task, TaskStatus } from '@/types'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '@/types'
import {
  allowedTaskStatusesForUser,
  canChangeTaskStatus,
  cn,
  formatDate,
  formatTaskCreatedAt,
  formatTaskCreator,
  isClientAssignedTask,
  isOverdue,
} from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { PageLoader } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { matchesTaskSearch } from '@/components/tasks/TaskBoardFilters'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { ExportTasksButton } from '@/components/tasks/ExportTasksDialog'
import { useProjectsTasksRealtime } from '@/hooks/useProjectTasksRealtime'

export function MyAssignedTasksPage() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role
  const projectsBase = role === 'client' ? '/client' : '/employee'
  const qc = useQueryClient()

  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)

  // Create-from-My-Tasks: pick project first
  const [pickProjectOpen, setPickProjectOpen] = useState(false)
  const [newTaskProjectId, setNewTaskProjectId] = useState<string>('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-assigned-tasks'],
    queryFn: fetchMyAssignedTasks,
  })

  const { data: allProjects, isLoading: loadingProjects } = useQuery({
    queryKey: ['copy-target-projects'],
    queryFn: fetchCopyTargetProjects,
    enabled: pickProjectOpen,
  })

  const creatableProjects = useMemo(() => {
    let list = (allProjects ?? []).filter((p) => p.status === 'active')
    if (role === 'client') {
      list = list.filter((p) => p.can_client_add_tasks)
    }
    return list.sort((a, b) => a.project_name.localeCompare(b.project_name))
  }, [allProjects, role])

  useEffect(() => {
    if (!pickProjectOpen) return
    if (creatableProjects.length === 0) {
      setNewTaskProjectId('')
      return
    }
    // Prefer currently filtered project if available
    if (
      projectFilter !== 'all' &&
      creatableProjects.some((p) => String(p.id) === projectFilter)
    ) {
      setNewTaskProjectId(projectFilter)
      return
    }
    if (!newTaskProjectId || !creatableProjects.some((p) => String(p.id) === newTaskProjectId)) {
      setNewTaskProjectId(String(creatableProjects[0].id))
    }
  }, [pickProjectOpen, creatableProjects, projectFilter, newTaskProjectId])

  const projectOptions = useMemo(() => {
    const map = new Map<number, string>()
    for (const task of data ?? []) {
      if (!map.has(task.project_id)) {
        map.set(
          task.project_id,
          task.project?.project_name ?? `Project #${task.project_id}`,
        )
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data])

  // Live updates for every project that has a task on this list
  useProjectsTasksRealtime(projectOptions.map((p) => p.id))

  const filtered = useMemo(() => {
    return (data ?? []).filter((task) => {
      if (projectFilter !== 'all' && task.project_id !== Number(projectFilter)) return false
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
      if (taskTypeFilter !== 'all' && (task.task_type ?? 'general') !== taskTypeFilter) return false
      if (statusFilter !== 'all' && task.status !== statusFilter) return false
      if (!matchesTaskSearch(task, search)) return false
      return true
    })
  }, [data, projectFilter, priorityFilter, taskTypeFilter, statusFilter, search])

  const stats = useMemo(() => {
    const list = data ?? []
    return {
      total: list.length,
      open: list.filter((t) => t.status !== 'done').length,
      overdue: list.filter((t) => isOverdue(t.deadline, t.status)).length,
      urgent: list.filter((t) => t.priority === 'urgent' && t.status !== 'done').length,
    }
  }, [data])

  const hasActiveFilters =
    projectFilter !== 'all' ||
    priorityFilter !== 'all' ||
    taskTypeFilter !== 'all' ||
    statusFilter !== 'all' ||
    Boolean(search.trim())

  const clearFilters = () => {
    setProjectFilter('all')
    setPriorityFilter('all')
    setTaskTypeFilter('all')
    setStatusFilter('all')
    setSearch('')
  }

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      updateTaskStatus(taskId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
      toast.success('Status updated')
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to update status')),
  })

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

  const openCreate = () => {
    setEditingTask(null)
    setPickProjectOpen(true)
  }

  const confirmCreateProject = () => {
    const id = Number(newTaskProjectId)
    if (!id) {
      toast.error('Select a project first.')
      return
    }
    setPickProjectOpen(false)
    setActiveProjectId(id)
    setEditingTask(null)
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
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Export is for staff only — never show to clients */}
            {(role === 'employee' || role === 'admin') && (
              <ExportTasksButton
                tasks={filtered}
                fileName="my-assigned-tasks"
                contextLabel="My Tasks"
              />
            )}
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add new task
            </Button>
          </div>
        }
      />

      <div className="mb-5 space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by task #, title, or description…"
            className="h-9 pl-9 pr-8"
          />
          {search.length > 0 && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5 min-w-[180px]">
            <Label className="text-xs text-muted-foreground">Project</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projectOptions.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 min-w-[140px]">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 min-w-[150px]">
            <Label className="text-xs text-muted-foreground">Task type</Label>
            <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All task types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All task types</SelectItem>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {filtered.length}
            {hasActiveFilters ? ` of ${stats.total}` : ''} shown
          </Badge>
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
            hasActiveFilters
              ? 'No tasks match these filters.'
              : 'You have no tasks assigned to you right now.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add new task
              </Button>
            )
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="w-16 px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Task</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Created by</th>
                    <th className="px-4 py-3 font-medium">Created at</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Deadline</th>
                    <th className="px-4 py-3 font-medium text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => {
                    const priority = TASK_PRIORITIES.find((p) => p.value === task.priority)
                    const overdue = isOverdue(task.deadline, task.status)
                    const clientAssigned = isClientAssignedTask(task)
                    const statusBusy =
                      statusMutation.isPending &&
                      statusMutation.variables?.taskId === task.id

                    return (
                      <tr
                        key={task.id}
                        className={cn(
                          'border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer',
                          clientAssigned && 'bg-violet-50/70 hover:bg-violet-50',
                        )}
                        onClick={() => openDetail(task)}
                      >
                        <td className="px-4 py-3 text-muted-foreground tabular-nums font-medium">
                          #{task.id}
                        </td>
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
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="line-clamp-1" title={formatTaskCreator(task)}>
                            {formatTaskCreator(task)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                          {formatTaskCreatedAt(task)}
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
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {canChangeTaskStatus(task, user) ? (
                            <Select
                              value={task.status}
                              disabled={statusBusy}
                              onValueChange={(value) => {
                                if (value === task.status) return
                                if (!canChangeTaskStatus(task, user, value)) {
                                  toast.error(
                                    'Clients can only set Client Review or Done on this task.',
                                  )
                                  return
                                }
                                statusMutation.mutate({
                                  taskId: task.id,
                                  status: value as TaskStatus,
                                })
                              }}
                            >
                              <SelectTrigger
                                className={cn(
                                  'h-8 w-[150px] border text-xs font-medium',
                                  TASK_STATUSES.find((s) => s.value === task.status)?.color,
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(allowedTaskStatusesForUser(task, user) === null
                                  ? TASK_STATUSES
                                  : TASK_STATUSES.filter((s) =>
                                      (allowedTaskStatusesForUser(task, user) ?? []).includes(
                                        s.value,
                                      ),
                                    )
                                ).map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span
                              className={cn(
                                'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                                TASK_STATUSES.find((s) => s.value === task.status)?.color,
                              )}
                            >
                              {TASK_STATUSES.find((s) => s.value === task.status)?.label}
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

      <Dialog open={pickProjectOpen} onOpenChange={setPickProjectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add new task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Choose the project this task belongs to.
            </p>
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select
                value={newTaskProjectId}
                onValueChange={setNewTaskProjectId}
                disabled={loadingProjects || creatableProjects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingProjects ? 'Loading projects…' : 'Select a project'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {creatableProjects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!loadingProjects && creatableProjects.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {role === 'client'
                    ? 'No projects allow you to add tasks right now.'
                    : 'You are not assigned to any active projects yet.'}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickProjectOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmCreateProject}
              disabled={!newTaskProjectId || loadingProjects}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
