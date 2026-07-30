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

/** Date + time for timestamps (created_at, activity, etc.). */
export function formatDateTime(date: string | Date | null | undefined, fallback = '—') {
  const d = parseDate(date)
  if (!d) return fallback
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Prefer API created_at timestamp; fall back to task_created_on date. */
export function formatTaskCreatedAt(task: {
  created_at?: string | null
  task_created_on?: string | null
}): string {
  if (task.created_at) return formatDateTime(task.created_at)
  return formatDate(task.task_created_on)
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

/** Display label for who created the task. */
export function formatTaskCreator(task: {
  created_by_name?: string | null
  created_by_type?: string | null
  creator?: { name?: string | null } | null
}): string {
  if (task.created_by_name?.trim()) return task.created_by_name.trim()
  if (task.creator?.name?.trim()) return task.creator.name.trim()
  if (task.created_by_type === 'admin') return 'Admin'
  if (task.created_by_type === 'client') return 'Client'
  if (task.created_by_type === 'employee') return 'Employee'
  return '—'
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

/**
 * Anyone with project access may move task status (API enforces membership).
 */
export function canChangeTaskStatus(
  _task: {
    assigned_to_ids?: number[] | null
    assignees?: { id: number }[] | null
    assigned_to?: number | null
    assigned_to_client?: number | null
    status?: string | null
  },
  user: { id: number; role?: string } | null | undefined,
  _newStatus?: string | null,
): boolean {
  if (!user) return false
  return user.role === 'admin' || user.role === 'employee' || user.role === 'client'
}

/** Status options a user may pick (null = all statuses). */
export function allowedTaskStatusesForUser(
  _task: {
    assigned_to_ids?: number[] | null
    assignees?: { id: number }[] | null
    assigned_to?: number | null
    assigned_to_client?: number | null
    status?: string | null
  },
  user: { id: number; role?: string } | null | undefined,
): string[] | null {
  if (!user) return []
  if (user.role === 'admin' || user.role === 'employee' || user.role === 'client') {
    return null
  }
  return []
}

/** True when the auth user is a project manager (flag or designation name). */
export function isProjectManagerUser(user: {
  role?: string
  is_project_manager?: boolean
  designation?: string | null
} | null | undefined): boolean {
  if (!user || user.role !== 'employee') return false
  if (user.is_project_manager) return true
  const name = user.designation?.trim().toLowerCase()
  return name === 'project manager'
}

/**
 * Full field edits (title, assignees, etc.).
 * Creator always; project managers may edit all tasks on projects they access.
 */
export function canEditTask(
  task: {
    created_by?: number | null
    created_by_type?: string | null
  } | null | undefined,
  user: {
    id: number
    role?: string
    is_project_manager?: boolean
    designation?: string | null
  } | null | undefined,
): boolean {
  if (!user || !task) return false
  // PMs can edit any task on assigned projects (API also enforces project membership).
  if (isProjectManagerUser(user)) return true
  if (task.created_by == null || !task.created_by_type) return false
  return (
    task.created_by_type === user.role && Number(task.created_by) === Number(user.id)
  )
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
