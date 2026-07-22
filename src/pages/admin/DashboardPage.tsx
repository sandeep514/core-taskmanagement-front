import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  CircleDot,
  Columns3,
  FolderKanban,
  ListTodo,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchAdminDashboard, fetchProjects, fetchEmployees } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/loading'
import { formatDate } from '@/lib/utils'

export function DashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchAdminDashboard,
  })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees })

  if (isLoading) return <PageLoader />

  if (isError || !stats) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="font-medium">Could not load dashboard</p>
        <p className="text-sm text-muted-foreground mt-1">
          Check that the Laravel API is running on the configured URL.
        </p>
        <button
          type="button"
          className="mt-4 text-sm text-primary underline"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    )
  }

  const cards = [
    {
      label: 'Projects',
      value: stats.total_projects,
      icon: FolderKanban,
      color: 'bg-indigo-50 text-indigo-600',
      to: '/admin/projects',
    },
    {
      label: 'Employees',
      value: stats.total_employees,
      icon: Users,
      color: 'bg-sky-50 text-sky-600',
      to: '/admin/employees',
    },
    {
      label: 'Clients',
      value: stats.total_clients,
      icon: Briefcase,
      color: 'bg-violet-50 text-violet-600',
      to: '/admin/clients',
    },
    {
      label: 'Total Tasks',
      value: stats.total_tasks,
      icon: ListTodo,
      color: 'bg-emerald-50 text-emerald-600',
      to: '/admin/projects',
    },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your organization and task pipeline"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardContent className="p-5 flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{c.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{c.value}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${c.color}`}>
                  <c.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-xl bg-slate-100 p-3">
              <CircleDot className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.tasks_todo}</p>
              <p className="text-sm text-muted-foreground">To Do</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3">
              <ListTodo className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.tasks_in_progress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-xl bg-emerald-50 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.tasks_done}</p>
              <p className="text-sm text-muted-foreground">Done</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.overdue_tasks > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm">
              <span className="font-semibold text-amber-900">{stats.overdue_tasks} overdue task(s)</span>
              <span className="text-amber-800"> need attention across projects.</span>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(projects ?? []).slice(0, 5).map((p) => (
              <Link
                key={p.id}
                to={`/admin/projects/${p.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/40 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate group-hover:text-primary transition-colors">
                    {p.project_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.client?.name} · Deadline {formatDate(p.deadline)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary">{p.tasks_count ?? 0} tasks</Badge>
                  <Columns3 className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
              </Link>
            ))}
            {(projects ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No projects yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(employees ?? [])
              .filter((e) => e.status === 'active')
              .slice(0, 5)
              .map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {e.designation?.designation ?? '—'} · {e.department?.department ?? '—'}
                    </p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
