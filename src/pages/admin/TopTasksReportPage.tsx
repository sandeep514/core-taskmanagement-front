import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, CircleAlert, Star, UserRoundX } from 'lucide-react'
import {
  fetchEmployees,
  fetchProjects,
  fetchTopTasksCompliance,
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
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'done' | 'pending' | 'none'>('all')

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

  const { data: compliance } = useQuery({
    queryKey: ['top-tasks-compliance', date, projectFilter],
    queryFn: () =>
      fetchTopTasksCompliance({
        date: date || undefined,
        project_id: projectFilter !== 'all' ? Number(projectFilter) : null,
      }),
  })

  const complianceRows = useMemo(() => {
    let list = compliance?.employees ?? []
    if (employeeFilter !== 'all') {
      list = list.filter((e) => e.id === Number(employeeFilter))
    }
    if (complianceFilter === 'done') list = list.filter((e) => e.is_done)
    else if (complianceFilter === 'pending') list = list.filter((e) => !e.is_done)
    else if (complianceFilter === 'none') list = list.filter((e) => !e.has_marked)
    return list
  }, [compliance, employeeFilter, complianceFilter])

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
        {compliance?.summary && (
          <>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1.5 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {compliance.summary.done}/{compliance.summary.total} marked 3+
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1.5 px-3 py-1">
              <CircleAlert className="h-3.5 w-3.5" />
              {compliance.summary.pending} pending
            </Badge>
            {compliance.summary.marked_none > 0 && (
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1.5 px-3 py-1">
                <UserRoundX className="h-3.5 w-3.5" />
                {compliance.summary.marked_none} marked none
              </Badge>
            )}
          </>
        )}
      </div>

      {/* ── Who marked / who did not (per employee) ─────────────────────── */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Top 3 compliance by employee</h2>
              <p className="text-xs text-muted-foreground">
                Who marked their Top tasks for {compliance?.date ? formatDate(compliance.date) : 'the selected date'} — min {compliance?.min_required ?? 3} across all projects.
              </p>
            </div>
            <Select value={complianceFilter} onValueChange={(v) => setComplianceFilter(v as typeof complianceFilter)}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                <SelectItem value="done">Done (3+)</SelectItem>
                <SelectItem value="pending">Pending (&lt; 3)</SelectItem>
                <SelectItem value="none">Marked none (0)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!complianceRows.length ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No employees match this filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Marked</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Top tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceRows.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[e.designation, e.department].filter(Boolean).join(' · ') || e.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="tabular-nums font-semibold">
                          {e.marked_count}/{compliance?.min_required ?? 3}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {e.is_done ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Done
                          </span>
                        ) : e.has_marked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            <CircleAlert className="h-3 w-3" />
                            Missing {e.missing}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                            <UserRoundX className="h-3 w-3" />
                            Not marked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {e.tasks.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {e.tasks.map((t) => (
                              <li key={t.id} className="text-xs">
                                <span className="font-medium text-foreground">#{t.id}</span>{' '}
                                <span className="text-muted-foreground">{t.title}</span>
                                {t.project_name && (
                                  <span className="text-muted-foreground"> · {t.project_name}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Marked tasks detail
      </h2>

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
