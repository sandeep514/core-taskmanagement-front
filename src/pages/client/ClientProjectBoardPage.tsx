import { useMemo, useState } from 'react'
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
import {
  TaskBoardFilters,
  filterTasksByPriorityAndType,
  type PriorityFilter,
  type TaskTypeFilter,
} from '@/components/tasks/TaskBoardFilters'
import { formatDate } from '@/lib/utils'

export function ClientProjectBoardPage() {
  const { projectId } = useParams()
  const id = Number(projectId)

  const {
    data: project,
    isLoading: loadingProject,
    isError: projectError,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
    enabled: !!id,
  })

  const canSee = project?.can_client_see_tasks ?? false
  const canAdd = project?.can_client_add_tasks ?? false

  const { data: tasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => fetchProjectTasks(id),
    enabled: !!id && canSee,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [taskTypeFilter, setTaskTypeFilter] = useState<TaskTypeFilter>('all')

  const filteredTasks = useMemo(
    () => filterTasksByPriorityAndType(tasks ?? [], priorityFilter, taskTypeFilter),
    [tasks, priorityFilter, taskTypeFilter],
  )

  if (loadingProject) return <PageLoader />

  if (projectError || !project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found or access denied.</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/client">Back to projects</Link>
        </Button>
      </div>
    )
  }

  if (!canSee) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <h1 className="text-xl font-semibold">{project.project_name}</h1>
        <p className="mt-3 text-muted-foreground text-sm">
          Task visibility is disabled for this project. Contact your account manager if you need
          access.
        </p>
        <Button asChild variant="link" className="mt-4">
          <Link to="/client">Back to projects</Link>
        </Button>
      </div>
    )
  }

  if (loadingTasks) return <PageLoader />

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
            to="/client"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            My Projects
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{project.project_name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Deadline {formatDate(project.deadline)}</span>
            <Badge variant="secondary">
              {priorityFilter !== 'all' || taskTypeFilter !== 'all'
                ? `${filteredTasks.length} of ${tasks?.length ?? 0} tasks`
                : `${tasks?.length ?? 0} tasks`}
            </Badge>
            {canAdd && <Badge variant="outline">You can add tasks</Badge>}
          </div>
          {project.description && (
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TaskBoardFilters
            priority={priorityFilter}
            taskType={taskTypeFilter}
            onPriorityChange={setPriorityFilter}
            onTaskTypeChange={setTaskTypeFilter}
          />
          {canAdd && (
            <Button onClick={openCreate} className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          )}
        </div>
      </div>

      <KanbanBoard projectId={id} tasks={filteredTasks} onTaskClick={openDetail} />

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
