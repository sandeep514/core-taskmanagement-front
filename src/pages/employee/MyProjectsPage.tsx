import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, FolderKanban, ListTodo, Users } from 'lucide-react'
import { fetchMyProjects } from '@/lib/api'
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
