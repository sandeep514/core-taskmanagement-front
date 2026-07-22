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
import { formatDate, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

type TaskScopeFilter = 'mine' | 'all'

const taskScopeFilters: { value: TaskScopeFilter; label: string }[] = [
  { value: 'mine', label: 'My Tasks' },
  { value: 'all', label: 'All Tasks' },
]

export function ProjectBoardPage() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const user = useAuthStore((s) => s.user)
  const [taskFilter, setTaskFilter] = useState<TaskScopeFilter>('all')

  const {
    data: project,
    isLoading: loadingProjects,
    isError: projectError,
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

  const filteredTasks = useMemo(() => {
    const list = tasks ?? []
    if (taskFilter !== 'mine' || !user?.id) return list
    return list.filter((t) => t.assigned_to === user.id)
  }, [tasks, taskFilter, user?.id])

  if (loadingProjects || loadingTasks) return <PageLoader />

  if (projectError || !project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found or you are not assigned.</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/employee">Back to projects</Link>
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

  const totalCount = tasks?.length ?? 0
  const visibleCount = filteredTasks.length

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/employee"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            My Projects
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{project.project_name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{project.client?.name}</span>
            <span>·</span>
            <span>Deadline {formatDate(project.deadline)}</span>
            <Badge variant="secondary">
              {taskFilter === 'mine'
                ? `${visibleCount} of ${totalCount} tasks`
                : `${totalCount} tasks`}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            {taskScopeFilters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setTaskFilter(f.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  taskFilter === f.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
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
