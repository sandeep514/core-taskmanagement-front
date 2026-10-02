import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Power } from 'lucide-react'
import { toast } from 'sonner'
import type { Task, TaskStatus } from '@/types'
import { TASK_STATUSES } from '@/types'
import { bulkDeactivateTasks, updateTaskStatus } from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import { canChangeTaskStatus } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { KanbanColumn } from './KanbanColumn'
import { TaskCardContent } from './TaskCard'
import {
  loadKanbanColumnSorts,
  resolveColumnSort,
  saveKanbanColumnSorts,
  sortTasksForKanban,
  type KanbanColumnSorts,
  type KanbanSort,
} from '@/components/tasks/TaskBoardFilters'

interface KanbanBoardProps {
  projectId: number
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

const COLUMN_IDS = new Set(TASK_STATUSES.map((s) => s.value))

function isColumnId(id: UniqueIdentifier): id is TaskStatus {
  return COLUMN_IDS.has(String(id) as TaskStatus)
}

function toTaskId(id: UniqueIdentifier): number {
  return typeof id === 'number' ? id : Number(id)
}

/** Newest added / moved cards first (updated_at, then id). */
function compareKanbanRecency(a: Task, b: Task): number {
  const tb = Date.parse(b.updated_at) || 0
  const ta = Date.parse(a.updated_at) || 0
  if (tb !== ta) return tb - ta
  return b.id - a.id
}

function sortKanbanTasks(tasks: Task[], sort: KanbanSort): Task[] {
  if (sort === 'recent') return [...tasks].sort(compareKanbanRecency)
  return sortTasksForKanban(tasks, sort)
}

/**
 * Default (`auto`) order: To Do by ID ascending (oldest first),
 * every other column by ID descending (newest first).
 */
function sortColumnTasks(tasks: Task[], status: TaskStatus, sort: KanbanSort): Task[] {
  if (sort !== 'auto') return sortKanbanTasks(tasks, sort)
  const list = [...tasks]
  if (status === 'todo') return list.sort((a, b) => a.id - b.id)
  return list.sort((a, b) => b.id - a.id)
}

export function KanbanBoard({ projectId, tasks, onTaskClick }: KanbanBoardProps) {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [items, setItems] = useState<Task[]>(() => sortTasksForKanban(tasks, 'id-asc'))

  /** Per-column sort overrides (persisted). Absent = Auto rule. */
  const [columnSorts, setColumnSorts] = useState<KanbanColumnSorts>(() => loadKanbanColumnSorts())

  const handleColumnSortChange = (status: TaskStatus, sort: KanbanSort) => {
    setColumnSorts((prev) => {
      const next = { ...prev, [status]: sort }
      saveKanbanColumnSorts(next)
      return next
    })
  }

  // Keep a ref so drag handlers always read the latest board state
  const itemsRef = useRef(items)
  itemsRef.current = items

  const canMoveTask = (task: Task | undefined | null, toStatus?: TaskStatus) =>
    !!task && canChangeTaskStatus(task, user, toStatus)

  // Sync from server when not mid-drag
  const isDraggingRef = useRef(false)
  useEffect(() => {
    if (!isDraggingRef.current) {
      setItems(sortTasksForKanban(tasks, 'id-asc'))
    }
  }, [tasks])

  const columns = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      discussion: [],
      in_progress: [],
      dev_done: [],
      testing: [],
      client_review: [],
      done: [],
    }
    for (const t of items) {
      if (map[t.status]) map[t.status].push(t)
    }
    for (const status of Object.keys(map) as TaskStatus[]) {
      map[status] = sortColumnTasks(map[status], status, resolveColumnSort(status, columnSorts))
    }
    return map
  }, [items, columnSorts])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Allow click (open modal) without starting a drag
      activationConstraint: { distance: 8 },
    }),
  )

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      updateTaskStatus(taskId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
    },
    onError: (err) => {
      toast.error(getApiError(err, 'Failed to update task status'))
      setItems(sortKanbanTasks(tasks, 'id-asc'))
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
    },
  })

  // ── Bulk deactivate (To Do column only) ────────────────────────────────
  const [selectedTodoIds, setSelectedTodoIds] = useState<number[]>([])
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)

  // Prune selection when board data changes.
  useEffect(() => {
    setSelectedTodoIds((prev) => prev.filter((id) => tasks.some((t) => t.id === id && t.status === 'todo')))
  }, [tasks])

  const toggleTodoSelect = (taskId: number) => {
    setSelectedTodoIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    )
  }

  const toggleAllTodo = (todoTasks: Task[]) => {
    const ids = todoTasks.map((t) => t.id)
    setSelectedTodoIds((prev) => (ids.every((id) => prev.includes(id)) ? [] : ids))
  }

  const bulkDeactivateMutation = useMutation({
    mutationFn: (ids: number[]) => bulkDeactivateTasks(ids),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
      setSelectedTodoIds([])
      setBulkConfirmOpen(false)
      if (res.count > 0) {
        toast.success(`Deactivated ${res.count} task${res.count === 1 ? '' : 's'}`)
      } else {
        toast.error(res.skipped[0]?.reason ?? 'Nothing deactivated.')
      }
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to deactivate tasks')),
  })

  function findContainer(id: UniqueIdentifier): TaskStatus | null {
    if (isColumnId(id)) return id

    const taskId = toTaskId(id)
    const task = itemsRef.current.find((t) => t.id === taskId)
    return task?.status ?? null
  }

  function handleDragStart(event: DragStartEvent) {
    const taskId = toTaskId(event.active.id)
    const task = itemsRef.current.find((t) => t.id === taskId) ?? null
    if (!canMoveTask(task)) {
      toast.error('You cannot change the status of this task.')
      return
    }
    isDraggingRef.current = true
    setActiveTask(task)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = toTaskId(active.id)
    const activeTaskItem = itemsRef.current.find((t) => t.id === activeId)
    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return
    }

    // Clients (non-assignees) may only move between client_review and done
    if (!canMoveTask(activeTaskItem, overContainer)) return

    setItems((prev) => {
      const activeIndex = prev.findIndex((t) => t.id === activeId)
      if (activeIndex === -1) return prev

      const now = new Date().toISOString()
      const next = prev.map((t) =>
        t.id === activeId ? { ...t, status: overContainer, updated_at: now } : t,
      )
      itemsRef.current = next
      return next
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false
    setActiveTask(null)
    commitStatusIfChanged(toTaskId(event.active.id))
  }

  function handleDragCancel() {
    isDraggingRef.current = false
    setActiveTask(null)
    setItems(sortKanbanTasks(tasks, 'id-asc'))
  }

  function commitStatusIfChanged(taskId: number) {
    const original = tasks.find((t) => t.id === taskId)
    const current = itemsRef.current.find((t) => t.id === taskId)

    if (original && current && original.status !== current.status) {
      if (!canMoveTask(original, current.status)) {
        setItems(sortKanbanTasks(tasks, 'id-asc'))
        toast.error(
          user?.role === 'client'
            ? 'Clients can only move tasks between Client Review and Done (unless assigned).'
            : 'Only an assigned user can change the status of this task.',
        )
        return
      }
      statusMutation.mutate({ taskId, status: current.status })
      toast.success(
        `Moved to ${TASK_STATUSES.find((s) => s.value === current.status)?.label}`,
      )
      return
    }

    // Dragged back to the original column — restore server order
    if (original && current && original.updated_at !== current.updated_at) {
      setItems(sortKanbanTasks(tasks, 'id-asc'))
    }
  }

  return (
    <>
      {selectedTodoIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5">
          <span className="text-sm font-medium text-amber-900">
            {selectedTodoIds.length} To Do task{selectedTodoIds.length === 1 ? '' : 's'} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setSelectedTodoIds([])}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 gap-1.5"
              disabled={bulkDeactivateMutation.isPending}
              onClick={() => setBulkConfirmOpen(true)}
            >
              <Power className="h-3.5 w-3.5" />
              Deactivate
            </Button>
          </div>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
          {TASK_STATUSES.map((col) => (
            <KanbanColumn
              key={col.value}
              status={col.value}
              tasks={columns[col.value]}
              onTaskClick={onTaskClick}
              canMoveTask={canMoveTask}
              sort={resolveColumnSort(col.value, columnSorts)}
              onSortChange={handleColumnSortChange}
              selectedIds={col.value === 'todo' ? selectedTodoIds : undefined}
              onToggleSelect={col.value === 'todo' ? toggleTodoSelect : undefined}
              onToggleAll={
                col.value === 'todo' ? () => toggleAllTodo(columns.todo) : undefined
              }
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeTask ? (
            <div className="w-[260px]">
              <TaskCardContent task={activeTask} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Deactivate {selectedTodoIds.length} To Do task{selectedTodoIds.length === 1 ? '' : 's'}?
            </DialogTitle>
          </DialogHeader>
          <p className="py-1 text-sm text-muted-foreground">
            This will hide the selected To Do tasks from the board. This cannot be undone from
            the board — an admin can re-activate them.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkConfirmOpen(false)}
              disabled={bulkDeactivateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={selectedTodoIds.length === 0 || bulkDeactivateMutation.isPending}
              onClick={() => bulkDeactivateMutation.mutate(selectedTodoIds)}
            >
              {bulkDeactivateMutation.isPending
                ? 'Deactivating…'
                : `Deactivate ${selectedTodoIds.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
