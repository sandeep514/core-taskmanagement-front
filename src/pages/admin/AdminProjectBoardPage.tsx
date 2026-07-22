import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import { fetchProject, fetchProjectTasks } from '@/lib/api'
import type { Task } from '@/types'
import { PageLoader } from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { formatDate } from '@/lib/utils'

export function AdminProjectBoardPage() {
  const { projectId } = useParams()
  const id = Number(projectId)

  const {
    data: project,
    isLoading: loadingProject,
    isError,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
    enabled: !!id,
  })

  const { data: tasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => fetchProjectTasks(id),
    enabled: !!id,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  if (loadingProject || loadingTasks) return <PageLoader />

  if (isError || !project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/admin/projects">Back to projects</Link>
        </Button>
      </div>
    )
  }

  const openDetail = (task: Task) => {
    setSelectedTaskId(task.id)
    setDetailOpen(true)
  }

  const openCreate = () => {
    setEditingTask(null)
    setFormOpen(true)
  }

  const openEdit = (task: Task) => {
    setDetailOpen(false)
    setEditingTask(task)
    setFormOpen(true)
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/admin/projects"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            All Projects
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{project.project_name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{project.client?.name ?? 'No client'}</span>
            <span>·</span>
            <span>Deadline {formatDate(project.deadline)}</span>
            <Badge variant="secondary">{tasks?.length ?? 0} tasks</Badge>
            {project.employees && project.employees.length > 0 && (
              <Badge variant="outline">{project.employees.length} members</Badge>
            )}
          </div>
          {project.description && (
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <KanbanBoard projectId={id} tasks={tasks ?? []} onTaskClick={openDetail} />

      <TaskFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        projectId={id}
        task={editingTask}
      />

      <TaskDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        taskId={selectedTaskId}
        projectId={id}
        onEdit={openEdit}
      />
    </div>
  )
}
