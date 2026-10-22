import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarRange, FileSpreadsheet, ListTodo, Search, Users } from 'lucide-react'
import { fetchEmployeeTopTasksReport } from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/authStore'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/types'
import type { EmployeeTopTaskItem } from '@/types'
import { cn, formatDate, todayDateString } from '@/lib/utils'
import { exportEmployeeTopTasksExcel } from '@/lib/exportTasksExcel'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

function firstDayOfMonth(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function TaskList({ tasks }: { tasks: EmployeeTopTaskItem[] }) {
  return (
    <ol className="space-y-1.5 list-decimal pl-4">
      {tasks.slice(0, 3).map((task) => {
        const status = TASK_STATUSES.find((s) => s.value === task.status)
        const priority = TASK_PRIORITIES.find((p) => p.value === task.priority)
        return (
          <li key={task.id} className="text-sm">
            <span className="font-medium">{task.title}</span>
            {task.project_name ? (
              <span className="text-muted-foreground"> · {task.project_name}</span>
            ) : null}
            <span className="ml-1.5 inline-flex gap-1 align-middle">
              {status && (
                <span
                  className={cn(
                    'inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold',
                    status.color,
                  )}
                >
                  {status.label}
                </span>
              )}
              {priority && (
                <span
                  className={cn(
                    'inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    priority.color,
                  )}
                >
                  {priority.label}
                </span>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function EmployeeTasksReportPage() {
  const user = useAuthStore((s) => s.user)

  const [from, setFrom] = useState(() => firstDayOfMonth())
  const [to, setTo] = useState(() => todayDateString())
  const [applied, setApplied] = useState(() => ({
    from: firstDayOfMonth(),
    to: todayDateString(),
  }))

  const { data, isLoading, isFetching, isError, refetch, error } = useQuery({
    queryKey: ['employee-top-tasks-report', user?.role, applied.from, applied.to],
    queryFn: () =>
      fetchEmployeeTopTasksReport({
        from: applied.from,
        to: applied.to,
        role: user?.role,
      }),
    enabled: Boolean(user && applied.from && applied.to),
  })

  const applyFilters = () => {
    if (!from || !to || from > to) return
    setApplied({ from, to })
  }

  const periodLabel = useMemo(
    () => `${formatDate(applied.from)} – ${formatDate(applied.to)}`,
    [applied.from, applied.to],
  )

  const handleExport = () => {
    if (!data) return
    exportEmployeeTopTasksExcel({
      from: data.from,
      to: data.to,
      byEmployee: data.by_employee,
      fileName: `employee-top-tasks-${data.from}-to-${data.to}`,
    })
  }

  return (
    <div>
      <PageHeader
        title="Employee Tasks"
        description="Each employee's Top-3 task list per day in the selected period. Export gives one Excel sheet per employee with Date and Top 3 Tasks columns."
        actions={
          <Button
            type="button"
            onClick={handleExport}
            disabled={!data || data.by_employee.length === 0 || isLoading}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        }
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
          <p className="font-medium">Could not load employee tasks report</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {getApiError(
              error,
              'Check that the Laravel API is running and includes GET /api/admin/employee-top-tasks.',
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
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{data.summary.employees_count}</span>{' '}
              employees
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <ListTodo className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{data.summary.top_task_total}</span>{' '}
              top tasks
            </span>
          </div>

          {data.by_employee.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees found.</p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.by_employee.map((employee) => (
                <Card key={employee.employee_id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex flex-wrap items-center gap-2">
                      {employee.employee_name}
                      <Badge variant="secondary">{employee.marked_days} days</Badge>
                      {employee.department ? (
                        <span className="text-xs font-normal text-muted-foreground">
                          {employee.department}
                          {employee.designation ? ` · ${employee.designation}` : ''}
                        </span>
                      ) : employee.designation ? (
                        <span className="text-xs font-normal text-muted-foreground">
                          {employee.designation}
                        </span>
                      ) : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {employee.entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No top tasks marked in this range.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                              <th className="py-2 pr-3 font-medium w-[110px]">Date</th>
                              <th className="py-2 pl-3 font-medium">Top 3 Tasks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employee.entries.map((entry) => (
                              <tr
                                key={entry.date}
                                className="border-b border-border last:border-0 align-top"
                              >
                                <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">
                                  {formatDate(entry.date)}
                                </td>
                                <td className="py-2.5 pl-3">
                                  <TaskList tasks={entry.tasks} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
