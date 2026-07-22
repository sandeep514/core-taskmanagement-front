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
import { arrayMove } from '@dnd-kit/sortable'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Task, TaskStatus } from '@/types'
import { TASK_STATUSES } from '@/types'
import { updateTaskStatus } from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import { KanbanColumn } from './KanbanColumn'
import { TaskCardContent } from './TaskCard'

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

export function KanbanBoard({ projectId, tasks, onTaskClick }: KanbanBoardProps) {
  const qc = useQueryClient()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [items, setItems] = useState<Task[]>(tasks)

  // Keep a ref so drag handlers always read the latest board state
  const itemsRef = useRef(items)
  itemsRef.current = items

  // Sync from server when not mid-drag
  const isDraggingRef = useRef(false)
  useEffect(() => {
    if (!isDraggingRef.current) {
      setItems(tasks)
    }
  }, [tasks])

  const columns = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      dev_done: [],
      testing: [],
      client_review: [],
      done: [],
    }
    for (const t of items) {
      if (map[t.status]) map[t.status].push(t)
    }
    return map
  }, [items])

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
    },
    onError: (err) => {
      toast.error(getApiError(err, 'Failed to update task status'))
      setItems(tasks)
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
    },
  })

  function findContainer(id: UniqueIdentifier): TaskStatus | null {
    if (isColumnId(id)) return id

    const taskId = toTaskId(id)
    const task = itemsRef.current.find((t) => t.id === taskId)
    return task?.status ?? null
  }

  function handleDragStart(event: DragStartEvent) {
    isDraggingRef.current = true
    const taskId = toTaskId(event.active.id)
    const task = itemsRef.current.find((t) => t.id === taskId) ?? null
    setActiveTask(task)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = toTaskId(active.id)
    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return
    }

    setItems((prev) => {
      const activeIndex = prev.findIndex((t) => t.id === activeId)
      if (activeIndex === -1) return prev

      const activeItem = prev[activeIndex]

      // Place near the item we're hovering (if any)
      if (!isColumnId(over.id)) {
        const without = prev.filter((t) => t.id !== activeId)
        const insertAt = without.findIndex((t) => t.id === toTaskId(over.id))
        without.splice(insertAt >= 0 ? insertAt : without.length, 0, {
          ...activeItem,
          status: overContainer,
        })
        itemsRef.current = without
        return without
      }

      const next = prev.map((t) =>
        t.id === activeId ? { ...t, status: overContainer } : t,
      )
      itemsRef.current = next
      return next
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    isDraggingRef.current = false
    setActiveTask(null)

    if (!over) {
      // Dropped outside — keep optimistic column moves from dragOver
      commitStatusIfChanged(toTaskId(active.id))
      return
    }

    const activeId = toTaskId(active.id)
    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)

    if (!activeContainer || !overContainer) {
      commitStatusIfChanged(activeId)
      return
    }

    // Reorder within the same column
    if (activeContainer === overContainer && !isColumnId(over.id)) {
      const overId = toTaskId(over.id)
      setItems((prev) => {
        const columnTasks = prev.filter((t) => t.status === activeContainer)
        const others = prev.filter((t) => t.status !== activeContainer)
        const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
        const newIndex = columnTasks.findIndex((t) => t.id === overId)
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev
        const next = [...others, ...arrayMove(columnTasks, oldIndex, newIndex)]
        itemsRef.current = next
        return next
      })
    }

    commitStatusIfChanged(activeId)
  }

  function handleDragCancel() {
    isDraggingRef.current = false
    setActiveTask(null)
    setItems(tasks)
  }

  function commitStatusIfChanged(taskId: number) {
    const original = tasks.find((t) => t.id === taskId)
    const current = itemsRef.current.find((t) => t.id === taskId)

    if (original && current && original.status !== current.status) {
      statusMutation.mutate({ taskId, status: current.status })
      toast.success(
        `Moved to ${TASK_STATUSES.find((s) => s.value === current.status)?.label}`,
      )
    }
  }

  return (
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
  )
}
