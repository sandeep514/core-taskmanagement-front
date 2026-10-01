import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Star } from 'lucide-react'
import {
  fetchEmployees,
  fetchProjects,
  fetchTopTasksReport,
  portalUiBase,
} from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { Task } from '@/types'
import { TASK_PRIORITIES, TASK_STATUSES, todayKey } from '@/types'
import {
  cn,
  formatDate,
  formatTaskAssignees,
} from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageLoader } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { ExportTasksButton } from '@/components/tasks/ExportTasksDialog'

export function TopTasksReportPage() {
  const user = useAuthStore((s) => s.user)
  const basePath = portalUiBase(user?.role)

  const [date, setDate] = useState(todayKey())
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')

  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)

  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })

  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'top-tasks-report',
      date,
      employeeFilter,
      projectFilter,
    ],
    queryFn: () =>
      fetchTopTasksReport({
        date: date || undefined,
        employee_id: employeeFilter !== 'all' ? Number(employeeFilter) : null,
        project_id: projectFilter !== 'all' ? Number(projectFilter) : null,
      }),
  })

  const rows = report?.data ?? []

  const summary = useMemo(() => {
    const empIds = new Set<number>()
    const projIds = new Set<number>()
    for (const t of rows) {
      for (const a of t.assignees ?? []) empIds.add(a.id)
      if (t.assignee) empIds.add(t.assignee.id)
      projIds.add(t.project_id)
    }
    return { tasks: rows.length, employees: empIds.size, projects: projIds.size }
  }, [rows])

  const hasActiveFilters = employeeFilter !== 'all' || projectFilter !== 'all'
  const clearFilters = () => {
    setEmployeeFilter('all')
    setProjectFilter('all')
  }

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
        <p className="text-muted-foreground">Could not load the Top tasks report.</p>
        <Button variant="link" className="mt-2" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Top Tasks Report"
        description="Every task employees marked as a Top task for the selected date."
        actions={
          <ExportTasksButton
            tasks={rows}
            fileName={`top-tasks-${report?.date ?? date}`}
            contextLabel={`Top Tasks ${report?.date ?? date}`}
          />
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input
            type="date"
            value={date}
            max={todayKey()}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-[180px]"
          />
        </div>

        <div className="space-y-1.5 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Employee</Label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {(employees ?? [])
                .filter((e) => e.status === 'active')
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Project</Label>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {(projects ?? [])
                .filter((p) => p.status === 'active')
                .sort((a, b) => a.project_name.localeCompare(b.project_name))
                .map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.project_name}
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

      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary" className="gap-1.5 px-3 py-1">
          <Star className="h-3.5 w-3.5 text-amber-600" fill="currentColor" />
          {summary.tasks} top {summary.tasks === 1 ? 'task' : 'tasks'}
          {report?.date ? ` · ${formatDate(report.date)}` : ''}
        </Badge>
        <Badge variant="secondary">{summary.employees} employees</Badge>
        <Badge variant="secondary">{summary.projects} projects</Badge>
      </div>

      {!rows.length ? (
        <EmptyState
          icon={CalendarDays}
          title="No Top tasks for this date"
          description={
            hasActiveFilters
              ? 'No marked tasks match these filters.'
              : 'Nobody marked a Top task for this date yet.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
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
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Marked</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((task) => {
                    const priority = TASK_PRIORITIES.find((p) => p.value === task.priority)
                    const status = TASK_STATUSES.find((s) => s.value === task.status)
                    return (
                      <tr
                        key={task.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => openDetail(task)}
                      >
                        <td className="px-4 py-3 text-muted-foreground tabular-nums font-medium">
                          #{task.id}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{task.title}</p>
                          {task.details && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {task.details}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="line-clamp-1" title={formatTaskAssignees(task)}>
                            {formatTaskAssignees(task)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`${basePath}/projects/${task.project_id}`}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {task.project?.project_name ?? `Project #${task.project_id}`}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {status && (
                            <span
                              className={cn(
                                'inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold',
                                status.color,
                              )}
                            >
                              {status.label}
                            </span>
                          )}
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
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                          {formatDate(task.top_task_date)}
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
