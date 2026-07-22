import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, Eye, EyeOff, FolderKanban, ListTodo, PlusCircle } from 'lucide-react'
import { fetchMyProjects } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/utils'

export function ClientProjectsPage() {
  const { user } = useAuthStore()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['client-projects'],
    queryFn: fetchMyProjects,
  })

  if (isLoading) return <PageLoader />

  if (isError) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Could not load projects"
        description="Check that the API is running and you are signed in as a client."
        action={
          <button type="button" className="text-sm text-primary underline" onClick={() => refetch()}>
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
        description={`Welcome, ${user?.name ?? 'Client'}. View and manage tasks on your projects.`}
      />

      {!data?.length ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="When your team assigns projects to your company, they will appear here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((project) => {
            const canSee = project.can_client_see_tasks
            const canAdd = project.can_client_add_tasks

            return (
              <Link
                key={project.id}
                to={canSee ? `/client/projects/${project.id}` : '#'}
                onClick={(e) => {
                  if (!canSee) e.preventDefault()
                }}
                className={!canSee ? 'cursor-not-allowed opacity-75' : undefined}
              >
                <Card className="h-full hover:shadow-lg hover:border-violet-200 transition-all group overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg group-hover:text-violet-700 transition-colors line-clamp-1">
                          {project.project_name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {project.client?.name ?? user?.name}
                        </p>
                      </div>
                      {canSee && (
                        <div className="rounded-full bg-secondary p-2 group-hover:bg-violet-50 transition-colors">
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-700" />
                        </div>
                      )}
                    </div>

                    {project.description && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {canSee ? (
                        <Badge variant="success" className="gap-1 font-normal">
                          <Eye className="h-3 w-3" />
                          Can view tasks
                        </Badge>
                      ) : (
                        <Badge variant="muted" className="gap-1 font-normal">
                          <EyeOff className="h-3 w-3" />
                          Tasks hidden
                        </Badge>
                      )}
                      {canAdd && (
                        <Badge variant="secondary" className="gap-1 font-normal">
                          <PlusCircle className="h-3 w-3" />
                          Can add tasks
                        </Badge>
                      )}
                      {canSee && (
                        <Badge variant="outline" className="gap-1 font-normal">
                          <ListTodo className="h-3 w-3" />
                          {project.tasks_count ?? 0}
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1 font-normal">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.deadline)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
