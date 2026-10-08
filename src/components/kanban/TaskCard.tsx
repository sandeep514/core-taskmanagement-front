import { forwardRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Briefcase, Calendar, Clock, Lock, MessageSquare, Paperclip, Star, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import type { Task } from '@/types'
import { TASK_PRIORITIES, TASK_TYPES, isTopToday, wasMarkedTopBefore } from '@/types'
import { toggleTaskTop } from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import {
  cn,
  formatDate,
  formatTaskAssignees,
  formatTaskCreatedAt,
  formatTaskCreator,
  canToggleTopTask,
  initials,
  isClientAssignedTask,
  isOverdue,
} from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ProgressBar } from '@/components/ui/progress-bar'
import { useAuthStore } from '@/stores/authStore'

/** Star button to mark / unmark a task as Top for today. Stops card-open + drag. */
export function TopStarButton({ task, size = 'sm' }: { task: Task; size?: 'sm' | 'xs' }) {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const top = isTopToday(task)
  const markedBefore = wasMarkedTopBefore(task)
  // Never offer Top-marking on unassigned / todo / discussion tasks, and only
  // on the viewer's own assigned tasks (admin / HR exempt). Tasks marked on a
  // previous day keep a locked star showing when they were marked.
  if (!canToggleTopTask(task, user)) {
    if (!markedBefore) return null
    const markedLabel = `Marked as Top on ${formatDate(task.top_task_date)}`
    return (
      <span
        title={markedLabel}
        aria-label={markedLabel}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'shrink-0 rounded-md p-1 text-amber-400 cursor-default',
          size === 'xs' ? 'h-6 w-6 flex items-center justify-center' : 'h-7 w-7 flex items-center justify-center',
        )}
      >
        <Star className={size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4'} fill="currentColor" />
      </span>
    )
  }
  const mutation = useMutation({
    mutationFn: () => toggleTaskTop(task.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks'] })
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
      qc.invalidateQueries({ queryKey: ['task'] })
    },
    onError: (err) => toast.error(getApiError(err, 'Could not update Top task')),
  })

  return (
    <button
      type="button"
      title={top ? 'Remove from Top tasks for today' : 'Mark as Top task for today'}
      aria-label={top ? 'Remove from Top tasks for today' : 'Mark as Top task for today'}
      aria-pressed={top}
      disabled={mutation.isPending}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        mutation.mutate()
      }}
      className={cn(
        'shrink-0 rounded-md p-1 transition-colors',
        size === 'xs' ? 'h-6 w-6 flex items-center justify-center' : 'h-7 w-7 flex items-center justify-center',
        top
          ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
          : 'text-slate-300 hover:bg-slate-100 hover:text-amber-500',
        mutation.isPending && 'opacity-50',
      )}
    >
      <Star className={size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4'} fill={top ? 'currentColor' : 'none'} />
    </button>
  )
}
interface TaskCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  task: Task
  isDragging?: boolean
  isOverlay?: boolean
  dragDisabled?: boolean
}

/** Presentational card — safe for DragOverlay (no useSortable). */
export const TaskCardContent = forwardRef<HTMLDivElement, TaskCardContentProps>(
  function TaskCardContent(
    { task, className, isDragging, isOverlay, dragDisabled, style, ...props },
    ref,
  ) {
    const priority = TASK_PRIORITIES.find((p) => p.value === task.priority)
    const taskType = TASK_TYPES.find((t) => t.value === (task.task_type ?? 'general'))
    const overdue = isOverdue(task.deadline, task.status)
    const clientAssigned = isClientAssignedTask(task)
    const topToday = isTopToday(task)

    return (
      <div
        ref={ref}
        style={style}
        className={cn(
          'rounded-xl border border-border bg-card p-3 shadow-sm select-none touch-none',
          isDragging && !isOverlay && 'opacity-30',
          isOverlay && 'shadow-xl ring-2 ring-primary/20 rotate-1 cursor-grabbing',
          !isOverlay &&
            !isDragging &&
            (dragDisabled
              ? 'hover:shadow-md cursor-pointer'
              : 'hover:shadow-md cursor-grab active:cursor-grabbing'),
          overdue && 'border-l-4 border-l-red-500',
          !overdue && topToday && 'border-amber-300 ring-1 ring-amber-200',
          clientAssigned && !overdue && 'border-l-4 border-l-violet-500',
          clientAssigned && 'bg-violet-50/80 border-violet-200 ring-1 ring-violet-100',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-1.5">
          <p className="text-sm font-medium leading-snug line-clamp-2 flex-1 min-w-0">
            {task.title}
          </p>
          <span className="flex shrink-0 items-center gap-1">
            {!isOverlay && <TopStarButton task={task} size="xs" />}
            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
              #{task.id}
            </span>
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {topToday && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              <Star className="h-3 w-3" fill="currentColor" />
              Top 3
            </span>
          )}
          {task.is_internal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
              <Lock className="h-3 w-3" />
              Internal
            </span>
          )}
          {clientAssigned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
              <Briefcase className="h-3 w-3" />
              Client
            </span>
          )}
          {taskType && taskType.value !== 'general' && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                taskType.color,
              )}
            >
              {taskType.label}
            </span>
          )}
          {priority && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                priority.color,
              )}
            >
              {priority.label}
            </span>
          )}
          {task.deadline && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]',
                overdue ? 'bg-red-50 text-red-700 font-medium' : 'bg-slate-50 text-slate-600',
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.deadline)}
            </span>
          )}
          {task.estimate_minutes != null && task.estimate_minutes !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
              <Clock className="h-3 w-3" />
              {task.estimate_minutes}m
            </span>
          )}
        </div>

        {(task.subtasks_total ?? 0) > 0 && (
          <div className="mt-2.5">
            <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
              <span>
                Subtasks {task.subtasks_done ?? 0}/{task.subtasks_total}
              </span>
              <span className="tabular-nums">{task.progress_percent ?? 0}%</span>
            </div>
            <ProgressBar value={task.progress_percent ?? 0} size="sm" />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {(task.assignees && task.assignees.length > 0) ||
            task.assignee ||
            task.client_assignee ? (
              <>
                <div className="flex -space-x-1.5 shrink-0">
                  {task.client_assignee ? (
                    <Avatar className="h-6 w-6 ring-2 ring-card">
                      <AvatarFallback className="text-[9px] bg-violet-100 text-violet-700">
                        {initials(task.client_assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    (task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : [])
                      .slice(0, 3)
                      .map((person) => (
                        <Avatar key={person.id} className="h-6 w-6 ring-2 ring-card">
                          <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700">
                            {initials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[110px]">
                  {formatTaskAssignees(task)}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground shrink-0">
            {(task.attachments_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px]">
                <Paperclip className="h-3 w-3" />
                {task.attachments_count}
              </span>
            )}
            {(task.comments_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px]">
                <MessageSquare className="h-3 w-3" />
                {task.comments_count}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-0.5 min-w-0 text-[11px] text-muted-foreground">
          {formatTaskCreator(task) !== '—' ? (
            <div className="flex items-center gap-1 min-w-0">
              <UserRound className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate" title={formatTaskCreator(task)}>
                By {formatTaskCreator(task)}
              </span>
            </div>
          ) : null}
          {task.created_at || task.task_created_on ? (
            <div className="flex items-center gap-1 min-w-0 pl-0.5">
              <span className="truncate" title={formatTaskCreatedAt(task)}>
                Created {formatTaskCreatedAt(task)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    )
  },
)

interface TaskCardProps {
  task: Task
  onClick: () => void
  dragDisabled?: boolean
}

export function TaskCard({ task, onClick, dragDisabled = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: dragDisabled,
    data: {
      type: 'task',
      task,
      status: task.status,
    },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <TaskCardContent
      ref={setNodeRef}
      task={task}
      style={style}
      isDragging={isDragging}
      dragDisabled={dragDisabled}
      onClick={onClick}
      {...attributes}
      {...(dragDisabled ? {} : listeners)}
    />
  )
}
