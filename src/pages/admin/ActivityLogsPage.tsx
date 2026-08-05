import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { fetchActivityLogs, fetchProjects, portalUiBase } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { Link } from 'react-router-dom'

const ACTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'status_changed', label: 'Status moved' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'commented', label: 'Commented' },
  { value: 'attached', label: 'Attached' },
  { value: 'detached', label: 'Detached' },
  { value: 'deactivated', label: 'Deactivated' },
  { value: 'activated', label: 'Activated' },
]

const USER_TYPES = [
  { value: 'default', label: 'Employee + HR (default)' },
  { value: 'employee', label: 'Employee only' },
  { value: 'hr', label: 'HR only' },
  { value: 'admin', label: 'Admin only' },
  { value: 'client', label: 'Client only' },
]

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function typeBadge(type: string | null | undefined) {
  switch (type) {
    case 'hr':
      return 'bg-teal-50 text-teal-700 border-teal-200'
    case 'employee':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'admin':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'client':
      return 'bg-violet-50 text-violet-700 border-violet-200'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

export function ActivityLogsPage() {
  const user = useAuthStore((s) => s.user)
  const basePath = portalUiBase(user?.role)

  const [userType, setUserType] = useState('default')
  const [action, setAction] = useState('all')
  const [projectId, setProjectId] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [applied, setApplied] = useState({
    user_type: '' as '' | 'employee' | 'hr' | 'admin' | 'client',
    action: '',
    project_id: null as number | null,
    from: '',
    to: '',
  })

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['activity-logs', applied, page],
    queryFn: () =>
      fetchActivityLogs({
        user_type: applied.user_type || undefined,
        action: applied.action || undefined,
        project_id: applied.project_id,
        from: applied.from || undefined,
        to: applied.to || undefined,
        page,
        per_page: 40,
      }),
  })

  const applyFilters = () => {
    setPage(1)
    setApplied({
      user_type:
        userType === 'default'
          ? ''
          : (userType as 'employee' | 'hr' | 'admin' | 'client'),
      action: action === 'all' ? '' : action,
      project_id: projectId === 'all' ? null : Number(projectId),
      from,
      to,
    })
  }

  const rows = data?.data ?? []
  const meta = data?.meta

  const projectOptions = useMemo(
    () => (projects ?? []).map((p) => ({ id: p.id, name: p.project_name })),
    [projects],
  )

  return (
    <div>
      <PageHeader
        title="Activity Logs"
        description="Full history of employee and HR actions — create, edit, status moves, and more"
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs">Actor type</Label>
              <Select value={userType} onValueChange={setUserType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue />
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
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={applyFilters} disabled={isFetching}>
              Apply filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="font-medium">Could not load activity logs</p>
          <button
            type="button"
            className="mt-3 text-sm text-primary underline"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Task creates, edits, and status moves by employees and HR will appear here."
        />
      ) : (
        <>
          <div className="space-y-2">
            {rows.map((row) => (
              <Card key={row.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline" className={typeBadge(row.user_type)}>
                        {(row.user_type ?? 'unknown').toUpperCase()}
                      </Badge>
                      <span className="font-medium text-sm">
                        {row.user_name || 'Unknown'}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {row.action.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">{row.message}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {row.project_name && row.project_id && (
                        <Link
                          to={`${basePath}/projects/${row.project_id}`}
                          className="hover:text-primary underline-offset-2 hover:underline"
                        >
                          {row.project_name}
                        </Link>
                      )}
                      {row.task_title && (
                        <span className="truncate max-w-[240px]" title={row.task_title}>
                          Task: {row.task_title}
                        </span>
                      )}
                    </div>
                  </div>
                  <time className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {formatWhen(row.created_at)}
                  </time>
                </CardContent>
              </Card>
            ))}
          </div>

          {meta && meta.last_page > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {meta.current_page} of {meta.last_page} · {meta.total} events
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.last_page || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
