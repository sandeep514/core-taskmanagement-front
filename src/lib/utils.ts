import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { allowedTopDates, canMarkTopTask, isTopOnDate } from '@/types'

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

/** Compact duration for an estimate stored in minutes, e.g. 90 → "1h 30m". */
export function formatEstimateDuration(minutes: number | null | undefined): string {
  const total = Math.round(Number(minutes) || 0)
  if (total <= 0) return '0m'
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
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

/** Display label for task assignees (employees, EAs, and/or client). */
export function formatTaskAssignees(task: {
  assignees?: { id: number; name: string }[] | null
  assignee?: { id: number; name: string } | null
  eas?: { id: number; name: string }[] | null
  assigned_to_ea_ids?: number[] | null
  client_assignee?: { id: number; name: string } | null
}): string {
  if (task.client_assignee) return `Client · ${task.client_assignee.name}`
  const list =
    task.assignees && task.assignees.length > 0
      ? task.assignees
      : task.assignee
        ? [task.assignee]
        : []
  if (list.length) {
    if (list.length === 1) return list[0].name
    if (list.length === 2) return `${list[0].name} + ${list[1].name}`
    return `${list[0].name} +${list.length - 1}`
  }
  const eaList = task.eas ?? []
  if (eaList.length === 1) return `EA · ${eaList[0].name}`
  if (eaList.length === 2) return `EA · ${eaList[0].name} + ${eaList[1].name}`
  if (eaList.length > 2) return `EA · ${eaList[0].name} +${eaList.length - 1}`
  if ((task.assigned_to_ea_ids?.length ?? 0) > 0) return 'EA · assigned'
  return 'Unassigned'
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
  if (task.created_by_type === 'ea') return 'EA'
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

export function taskEaAssigneeIds(task: {
  assigned_to_ea_ids?: number[] | null
  eas?: { id: number }[] | null
}): number[] {
  if (task.assigned_to_ea_ids?.length) return task.assigned_to_ea_ids
  if (task.eas?.length) return task.eas.map((a) => a.id)
  return []
}

export function isTaskAssignedToUser(
  task: {
    assigned_to_ids?: number[] | null
    assignees?: { id: number }[] | null
    assigned_to?: number | null
    assigned_to_client?: number | null
    assigned_to_ea_ids?: number[] | null
    eas?: { id: number }[] | null
  },
  userId: number,
  role?: string,
): boolean {
  if (role === 'client') return task.assigned_to_client === userId
  if (role === 'ea') return taskEaAssigneeIds(task).includes(userId)
  return taskAssigneeIds(task).includes(userId)
}

/** True when the auth user created the task (EA's own created tasks are movable by her). */
export function isOwnCreatedTask(
  task: {
    created_by?: number | null
    created_by_type?: string | null
  } | null | undefined,
  user: { id: number; role?: string } | null | undefined,
): boolean {
  if (!user || !task) return false
  if (task.created_by == null || !task.created_by_type) return false
  return task.created_by_type === user.role && Number(task.created_by) === Number(user.id)
}

/** True when nobody holds the task: no employees, client, or EAs. */
export function isTaskUnassigned(task: {
  assigned_to_ids?: number[] | null
  assignees?: { id: number }[] | null
  assigned_to?: number | null
  assigned_to_client?: number | null
  client_assignee?: { id: number } | null
  assigned_to_ea_ids?: number[] | null
  eas?: { id: number }[] | null
}): boolean {
  if (task.assigned_to_client != null || task.client_assignee != null) return false
  if (taskAssigneeIds(task).length > 0) return false
  if (taskEaAssigneeIds(task).length > 0) return false
  return true
}

/** True for the EA role (admin-level read + create, never edit/delete). */
export function isEaUser(user: { role?: string } | null | undefined): boolean {
  return user?.role === 'ea'
}

/**
 * True when the user may edit / delete / toggle previous entries.
 * EA sees the same pages as admin but every write to a previous entry is
 * blocked (backend enforces this too) — only creating new records is allowed.
 */
export function canManageRecords(
  user: { id: number; role?: string } | null | undefined,
): boolean {
  if (!user?.role) return false
  return user.role === 'admin' || user.role === 'hr'
}

/**
 * Anyone with project access may move task status (API enforces membership).
 * EA may move only her own tasks: assigned to her or created by her.
 */
export function canChangeTaskStatus(
  _task: {
    assigned_to_ids?: number[] | null
    assignees?: { id: number }[] | null
    assigned_to?: number | null
    assigned_to_client?: number | null
    assigned_to_ea_ids?: number[] | null
    eas?: { id: number }[] | null
    created_by?: number | null
    created_by_type?: string | null
    status?: string | null
  },
  user: { id: number; role?: string } | null | undefined,
  _newStatus?: string | null,
): boolean {
  if (!user) return false
  if (user.role === 'ea') {
    return (
      isTaskAssignedToUser(_task, user.id, user.role) || isOwnCreatedTask(_task, user)
    )
  }
  return (
    user.role === 'admin' ||
    user.role === 'hr' ||
    user.role === 'employee' ||
    user.role === 'client'
  )
}

/** Status options a user may pick (null = all statuses). EA: only own tasks. */
export function allowedTaskStatusesForUser(
  _task: {
    assigned_to_ids?: number[] | null
    assignees?: { id: number }[] | null
    assigned_to?: number | null
    assigned_to_client?: number | null
    assigned_to_ea_ids?: number[] | null
    eas?: { id: number }[] | null
    created_by?: number | null
    created_by_type?: string | null
    status?: string | null
  },
  user: { id: number; role?: string } | null | undefined,
): string[] | null {
  if (!user) return []
  if (user.role === 'ea') {
    return isTaskAssignedToUser(_task, user.id, user.role) || isOwnCreatedTask(_task, user)
      ? null
      : []
  }
  if (
    user.role === 'admin' ||
    user.role === 'hr' ||
    user.role === 'employee' ||
    user.role === 'client'
  ) {
    return null
  }
  return []
}

/** True when the auth user is the original creator of the task. */
export function isTaskCreator(
  task: {
    created_by?: number | null
    created_by_type?: string | null
  } | null | undefined,
  user: { id: number; role?: string } | null | undefined,
): boolean {
  if (!user || !task) return false
  if (task.created_by == null || !task.created_by_type) return false
  return (
    task.created_by_type === user.role && Number(task.created_by) === Number(user.id)
  )
}

/**
 * Estimate end date from start + minutes using 8-hour (480-minute) workdays.
 * Up to 480 min → same day, 960 min → next day, etc.
 */
export function computeEstimateEndDate(
  startDate: string,
  minutes: number,
): string | null {
  const d = parseDate(startDate)
  if (!d || !Number.isFinite(minutes) || minutes <= 0) return null
  const workDays = Math.max(1, Math.ceil(minutes / 480))
  d.setDate(d.getDate() + workDays - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Local calendar date as YYYY-MM-DD. */
export function todayDateString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
 * Soft-delete attachment: any authenticated portal user who can open the task
 * (same people who can upload). API enforces project access + required remark.
 * EA never deletes previous entries.
 */
export function canDeleteTaskAttachment(
  _task: {
    created_by?: number | null
    created_by_type?: string | null
  } | null | undefined,
  user: {
    id: number
    role?: string
  } | null | undefined,
): boolean {
  if (!user?.role) return false
  if (user.role === 'ea') return false
  return (
    user.role === 'admin' ||
    user.role === 'hr' ||
    user.role === 'employee' ||
    user.role === 'client'
  )
}

/**
 * Full field edits (title, assignees, etc.).
 * Admin/HR org-wide; creator always; project managers on assigned projects.
 * EA never edits previous entries (create-only role).
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
  if (user.role === 'ea') return false
  // Admin and HR may manage any task (assign, edit, handle clients).
  if (user.role === 'admin' || user.role === 'hr') return true
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

/**
 * Whether the current user may toggle the Top star on this task:
 * only their own assigned tasks (admin / HR may toggle any task).
 * Tasks marked for today or the last working date stay toggleable so the
 * mark can be removed / re-marked; tasks with older history stay locked.
 * EA never marks Top tasks (create-only role, no assigned tasks).
 */
export function canToggleTopTask(
  task: {
    status?: string | null
    is_top_task?: boolean | null
    top_task_date?: string | null
    assigned_to_ids?: number[] | null
    assignees?: { id: number }[] | null
    assigned_to?: number | null
    assigned_to_client?: number | null
    client_assignee?: { id: number } | null
  },
  user: { id: number; role?: string } | null | undefined,
): boolean {
  if (!user) return false
  if (user.role === 'ea') return false
  const raw = task.top_task_date ? String(task.top_task_date).slice(0, 10) : ''
  const [today, lastDate] = allowedTopDates()
  // History on any other day locks the task forever.
  if (raw !== '' && raw !== today && raw !== lastDate) return false
  const topToday = isTopOnDate(task, today)
  const topLast = isTopOnDate(task, lastDate)
  if (!canMarkTopTask(task) && !topToday && !topLast) return false
  if (user.role === 'admin' || user.role === 'hr') return true
  return isTaskAssignedToUser(task, user.id, user.role)
}

/**
 * Whether the user may mark this task for an explicit Top date (today or the
 * last working date). Same-date re-mark after unmark stays allowed; any other
 * history locks the task. EA never marks Top tasks.
 */
export function canMarkTopForDate(
  task: {
    status?: string | null
    is_top_task?: boolean | null
    top_task_date?: string | null
    assigned_to_ids?: number[] | null
    assignees?: { id: number }[] | null
    assigned_to?: number | null
    assigned_to_client?: number | null
    client_assignee?: { id: number } | null
  },
  user: { id: number; role?: string } | null | undefined,
  date: string,
): boolean {
  if (!user) return false
  if (user.role === 'ea') return false
  const raw = task.top_task_date ? String(task.top_task_date).slice(0, 10) : ''
  if (raw !== '' && raw !== date) return false
  if (isTopOnDate(task, date)) return true // already marked → unmark allowed
  if (!canMarkTopTask(task)) return false
  if (user.role === 'admin' || user.role === 'hr') return true
  return isTaskAssignedToUser(task, user.id, user.role)
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
