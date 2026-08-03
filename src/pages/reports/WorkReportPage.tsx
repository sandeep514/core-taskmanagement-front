import { useMemo, useState, type ComponentType } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FolderKanban,
  Search,
  Users,
} from 'lucide-react'
import { fetchWorkReport } from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/authStore'
import { TASK_PRIORITIES } from '@/types'
import { cn, formatDate, todayDateString } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'

function firstDayOfMonth(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export function WorkReportPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const isEmployee = user?.role === 'employee'

  const [from, setFrom] = useState(() => firstDayOfMonth())
  const [to, setTo] = useState(() => todayDateString())
  const [employeeId, setEmployeeId] = useState<string>(() =>
    isEmployee && user?.id ? String(user.id) : 'all',
  )
  const [applied, setApplied] = useState(() => ({
    from: firstDayOfMonth(),
    to: todayDateString(),
    employee_id: (isEmployee && user?.id ? user.id : null) as number | null,
  }))

  const { data, isLoading, isFetching, isError, refetch, error } = useQuery({
    queryKey: [
      'work-report',
      user?.role,
      applied.from,
      applied.to,
      applied.employee_id,
    ],
    queryFn: () =>
      fetchWorkReport({
        from: applied.from,
        to: applied.to,
        employee_id: applied.employee_id,
        role: user?.role,
      }),
    enabled: Boolean(user && applied.from && applied.to),
  })

  const employees = data?.employees ?? []

  const applyFilters = () => {
    if (!from || !to) return
    if (from > to) return
    setApplied({
      from,
      to,
      employee_id: employeeId === 'all' ? null : Number(employeeId),
    })
  }

  const periodLabel = useMemo(() => {
    return `${formatDate(applied.from)} – ${formatDate(applied.to)}`
  }, [applied.from, applied.to])

  return (
    <div>
      <PageHeader
        title="Work Report"
        description="Tasks marked Done in the selected period, filtered by employee."
      />

      <Card className="mb-5">
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 min-w-[150px]">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 min-w-[150px]">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 min-w-[200px] flex-1 max-w-xs">
              <Label className="text-xs text-muted-foreground">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isAdmin ? 'All employees' : 'All teammates'}
                  </SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name}
                      {isEmployee && user?.id === e.id ? ' (you)' : ''}
                    </SelectItem>
                  ))}
                  {/* Before first load, ensure current employee is selectable */}
                  {isEmployee &&
                    user?.id &&
                    !employees.some((e) => e.id === user.id) && (
                      <SelectItem value={String(user.id)}>
                        {user.name} (you)
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={applyFilters}
              disabled={!from || !to || from > to || isFetching}
            >
              <Search className="h-4 w-4" />
              {isFetching ? 'Loading…' : 'Run report'}
            </Button>
          </div>
          {from > to && (
            <p className="mt-2 text-xs text-red-600">From date must be on or before To date.</p>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="font-medium">Could not load work report</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {getApiError(
              error,
              'Check that the Laravel API is running and includes GET /api/employee/work-report (or /api/admin/work-report).',
            )}
          </p>
          <Button variant="link" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : !data ? null : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <CalendarRange className="h-4 w-4" />
            <span>
              Period <span className="font-medium text-foreground">{periodLabel}</span>
            </span>
            {data.employee_id != null && (
              <>
                <span>·</span>
                <span>
                  Employee{' '}
                  <span className="font-medium text-foreground">
                    {employees.find((e) => e.id === data.employee_id)?.name ??
                      `#${data.employee_id}`}
                  </span>
                </span>
              </>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <SummaryCard
              icon={CheckCircle2}
              label="Tasks done"
              value={data.summary.tasks_done}
              color="bg-emerald-50 text-emerald-700"
            />
            <SummaryCard
              icon={Clock3}
              label="Estimate hours"
              value={data.summary.estimate_hours_total}
              color="bg-sky-50 text-sky-700"
              suffix="h"
            />
            <SummaryCard
              icon={Users}
              label="Employees"
              value={data.summary.employees_count}
              color="bg-violet-50 text-violet-700"
            />
            <SummaryCard
              icon={FolderKanban}
              label="Projects"
              value={data.summary.projects_count}
              color="bg-indigo-50 text-indigo-700"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">By employee</CardTitle>
              </CardHeader>
              <CardContent>
                {data.by_employee.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No completions in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="py-2 pr-2 font-medium">Employee</th>
                          <th className="py-2 px-2 font-medium text-right">Done</th>
                          <th className="py-2 pl-2 font-medium text-right">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.by_employee.map((row) => (
                          <tr key={row.employee_id} className="border-b border-border last:border-0">
                            <td className="py-2.5 pr-2 font-medium">{row.employee_name}</td>
                            <td className="py-2.5 px-2 text-right tabular-nums">
                              {row.tasks_done}
                            </td>
                            <td className="py-2.5 pl-2 text-right tabular-nums text-muted-foreground">
                              {row.estimate_hours}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">By project</CardTitle>
              </CardHeader>
              <CardContent>
                {data.by_project.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No completions in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="py-2 pr-2 font-medium">Project</th>
                          <th className="py-2 px-2 font-medium text-right">Done</th>
                          <th className="py-2 pl-2 font-medium text-right">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.by_project.map((row) => (
                          <tr key={row.project_id} className="border-b border-border last:border-0">
                            <td className="py-2.5 pr-2 font-medium">{row.project_name}</td>
                            <td className="py-2.5 px-2 text-right tabular-nums">
                              {row.tasks_done}
                            </td>
                            <td className="py-2.5 pl-2 text-right tabular-nums text-muted-foreground">
                              {row.estimate_hours}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Completed tasks
                <Badge variant="secondary">{data.tasks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.tasks.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={ClipboardCheck}
                    title="No tasks done"
                    description="No tasks were marked Done in this period for the selected filters."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 font-medium">ID</th>
                        <th className="px-4 py-3 font-medium">Task</th>
                        <th className="px-4 py-3 font-medium">Project</th>
                        <th className="px-4 py-3 font-medium">Assignees</th>
                        <th className="px-4 py-3 font-medium">Priority</th>
                        <th className="px-4 py-3 font-medium">Completed</th>
                        <th className="px-4 py-3 font-medium text-right">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tasks.map((task) => {
                        const priority = TASK_PRIORITIES.find((p) => p.value === task.priority)
                        return (
                          <tr
                            key={task.id}
                            className="border-b border-border last:border-0 hover:bg-muted/30"
                          >
                            <td className="px-4 py-3 text-muted-foreground tabular-nums">
                              #{task.id}
                            </td>
                            <td className="px-4 py-3 font-medium max-w-[240px]">
                              <span className="line-clamp-2">{task.title}</span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {task.project_name}
                            </td>
                            <td className="px-4 py-3">
                              {task.assignees.length
                                ? task.assignees.map((a) => a.name).join(', ')
                                : '—'}
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
                            <td className="px-4 py-3 whitespace-nowrap">
                              {formatDate(task.actual_complete_on)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                              {task.estimate_hours ?? '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  suffix,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number
  color: string
  suffix?: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight">
            {value}
            {suffix ? (
              <span className="text-base font-semibold text-muted-foreground ml-0.5">{suffix}</span>
            ) : null}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
