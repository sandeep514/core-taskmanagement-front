import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, CircleDot, FolderKanban, ListTodo, Timer, Users } from 'lucide-react'
import { fetchMyAssignedTasks, fetchMyProjects } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/utils'

export function MyProjectsPage() {
  const { user } = useAuthStore()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-projects'],
    queryFn: fetchMyProjects,
  })

  const { data: myTasks } = useQuery({
    queryKey: ['my-assigned-tasks'],
    queryFn: fetchMyAssignedTasks,
  })

  /** My open workload: to-do + in-progress counts of the logged-in employee. */
  const workload = useMemo(() => {
    const list = myTasks ?? []
    let todo = 0
    let inProgress = 0
    const byProject = new Map<number, { todo: number; inProgress: number }>()
    for (const t of list) {
      const entry = byProject.get(t.project_id) ?? { todo: 0, inProgress: 0 }
      if (t.status === 'todo') {
        todo += 1
        entry.todo += 1
      } else if (t.status === 'in_progress') {
        inProgress += 1
        entry.inProgress += 1
      }
      byProject.set(t.project_id, entry)
    }
    return { todo, inProgress, byProject }
  }, [myTasks])

  if (isLoading) return <PageLoader />

  if (isError) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Could not load projects"
        description="Check that the API is running and you are signed in as an employee."
        action={
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() => refetch()}
          >
            Retry
          </button>
        }
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="My Projects"
        description={`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}. Open a project to manage tasks.`}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:max-w-2xl">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-slate-100 p-2.5">
              <CircleDot className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none tabular-nums">{workload.todo}</p>
              <p className="mt-1 text-sm text-muted-foreground">My To Do tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-blue-50 p-2.5">
              <Timer className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none tabular-nums">{workload.inProgress}</p>
              <p className="mt-1 text-sm text-muted-foreground">My In Progress tasks</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!data?.length ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects assigned"
          description="When an admin assigns you to a project, it will show up here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((project) => (
            <Link key={project.id} to={`/employee/projects/${project.id}`}>
              <Card className="h-full hover:shadow-lg hover:border-indigo-200 transition-all group overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {project.project_name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {project.client?.name ?? 'Client'}
                      </p>
                    </div>
                    <div className="rounded-full bg-secondary p-2 group-hover:bg-accent transition-colors">
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>

                  {project.description && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <ListTodo className="h-3 w-3" />
                      {project.tasks_count ?? 0} tasks
                    </Badge>
                    {(() => {
                      const mine = workload.byProject.get(project.id)
                      if (!mine || (mine.todo === 0 && mine.inProgress === 0)) return null
                      return (
                        <>
                          <Badge variant="outline" className="gap-1 font-normal">
                            <CircleDot className="h-3 w-3 text-slate-500" />
                            My To Do: {mine.todo}
                          </Badge>
                          <Badge variant="outline" className="gap-1 font-normal">
                            <Timer className="h-3 w-3 text-blue-500" />
                            My In Progress: {mine.inProgress}
                          </Badge>
                        </>
                      )
                    })()}
                    <Badge variant="outline" className="gap-1 font-normal">
                      <Users className="h-3 w-3" />
                      {project.employees?.length ?? 0}
                    </Badge>
                    <Badge variant="outline" className="gap-1 font-normal">
                      <Calendar className="h-3 w-3" />
                      {formatDate(project.deadline)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
