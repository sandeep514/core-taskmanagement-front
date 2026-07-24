import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse API dates (`Y-m-d` or ISO) safely for display. */
export function parseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null
  if (date instanceof Date) return Number.isNaN(date.getTime()) ? null : date
  // Treat date-only strings as local calendar days (avoid UTC shift)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(date: string | Date | null | undefined, fallback = '—') {
  const d = parseDate(date)
  if (!d) return fallback
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Display label for task assignees (employees and/or client). */
export function formatTaskAssignees(task: {
  assignees?: { id: number; name: string }[] | null
  assignee?: { id: number; name: string } | null
  client_assignee?: { id: number; name: string } | null
}): string {
  if (task.client_assignee) return `Client · ${task.client_assignee.name}`
  const list =
    task.assignees && task.assignees.length > 0
      ? task.assignees
      : task.assignee
        ? [task.assignee]
        : []
  if (!list.length) return 'Unassigned'
  if (list.length === 1) return list[0].name
  if (list.length === 2) return `${list[0].name} + ${list[1].name}`
  return `${list[0].name} +${list.length - 1}`
}

export function taskAssigneeIds(task: {
  assigned_to_ids?: number[] | null
  assignees?: { id: number }[] | null
  assigned_to?: number | null
}): number[] {
  if (task.assigned_to_ids?.length) return task.assigned_to_ids
  if (task.assignees?.length) return task.assignees.map((a) => a.id)
  if (task.assigned_to) return [task.assigned_to]
  return []
}

export function isTaskAssignedToUser(
  task: {
    assigned_to_ids?: number[] | null
    assignees?: { id: number }[] | null
    assigned_to?: number | null
    assigned_to_client?: number | null
  },
  userId: number,
  role?: string,
): boolean {
  if (role === 'client') return task.assigned_to_client === userId
  return taskAssigneeIds(task).includes(userId)
}

const CLIENT_REVIEW_STATUSES = ['client_review', 'done'] as const

/**
 * Who may change task status:
 * - Admin: always
 * - Employee: only if they are an assignee
 * - Client: if assigned (any status), OR when status is client_review / done
 *   (then only between those two)
 */
export function canChangeTaskStatus(
  task: {
    assigned_to_ids?: number[] | null
    assignees?: { id: number }[] | null
    assigned_to?: number | null
    assigned_to_client?: number | null
    status?: string | null
  },
  user: { id: number; role?: string } | null | undefined,
  newStatus?: string | null,
): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.role === 'employee') {
    return isTaskAssignedToUser(task, user.id, user.role)
  }
  if (user.role === 'client') {
    if (isTaskAssignedToUser(task, user.id, 'client')) return true
    const current = task.status ?? ''
    if (!CLIENT_REVIEW_STATUSES.includes(current as (typeof CLIENT_REVIEW_STATUSES)[number])) {
      return false
    }
    if (
      newStatus != null &&
      !CLIENT_REVIEW_STATUSES.includes(newStatus as (typeof CLIENT_REVIEW_STATUSES)[number])
    ) {
      return false
    }
    return true
  }
  return false
}

/** Status options a user may pick for this task (null = all statuses). */
export function allowedTaskStatusesForUser(
  task: {
    assigned_to_ids?: number[] | null
    assignees?: { id: number }[] | null
    assigned_to?: number | null
    assigned_to_client?: number | null
    status?: string | null
  },
  user: { id: number; role?: string } | null | undefined,
): string[] | null {
  if (!user) return []
  if (user.role === 'admin') return null
  if (user.role === 'employee') {
    return isTaskAssignedToUser(task, user.id, 'employee') ? null : []
  }
  if (user.role === 'client') {
    if (isTaskAssignedToUser(task, user.id, 'client')) return null
    if (
      CLIENT_REVIEW_STATUSES.includes(
        (task.status ?? '') as (typeof CLIENT_REVIEW_STATUSES)[number],
      )
    ) {
      return [...CLIENT_REVIEW_STATUSES]
    }
    return []
  }
  return []
}

/** True when the task is assigned to the project client (not an employee). */
export function isClientAssignedTask(task: {
  assigned_to_client?: number | null
  client_assignee?: { id: number } | null
}): boolean {
  return Boolean(task.assigned_to_client || task.client_assignee)
}

export function isOverdue(date: string | null | undefined, status?: string) {
  if (!date || status === 'done') return false
  const d = parseDate(date)
  if (!d) return false
  d.setHours(23, 59, 59, 999)
  return d < new Date()
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
