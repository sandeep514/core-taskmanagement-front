import * as XLSX from 'xlsx'
import type { Task } from '@/types'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '@/types'
import {
  formatDate,
  formatDateTime,
  formatTaskCreatedAt,
  formatTaskCreator,
} from '@/lib/utils'

export type ExportColumnKey =
  | 'id'
  | 'title'
  | 'details'
  | 'project'
  | 'status'
  | 'priority'
  | 'task_type'
  | 'assignees'
  | 'client_assignee'
  | 'created_by'
  | 'created_at'
  | 'task_created_on'
  | 'estimate_start_date'
  | 'estimate_end_date'
  | 'deadline'
  | 'estimate_hours'
  | 'actual_complete_on'
  | 'attachments_count'
  | 'comments_count'
  | 'updated_at'

export interface ExportColumnDef {
  key: ExportColumnKey
  label: string
  /** When true, selected by default in the column picker. */
  defaultSelected?: boolean
}

/** All available export columns with human-readable labels. */
export const EXPORT_COLUMNS: ExportColumnDef[] = [
  { key: 'id', label: 'Task ID', defaultSelected: true },
  { key: 'title', label: 'Title', defaultSelected: true },
  { key: 'details', label: 'Details / Description', defaultSelected: true },
  { key: 'project', label: 'Project', defaultSelected: true },
  { key: 'status', label: 'Status', defaultSelected: true },
  { key: 'priority', label: 'Priority', defaultSelected: true },
  { key: 'task_type', label: 'Task Type', defaultSelected: true },
  { key: 'assignees', label: 'Assignees (Employees)', defaultSelected: true },
  { key: 'client_assignee', label: 'Client Assignee', defaultSelected: true },
  { key: 'created_by', label: 'Created By', defaultSelected: true },
  { key: 'created_at', label: 'Created At', defaultSelected: true },
  { key: 'task_created_on', label: 'Task Created On', defaultSelected: false },
  { key: 'estimate_start_date', label: 'Estimate Start Date', defaultSelected: true },
  { key: 'estimate_end_date', label: 'Estimate End Date', defaultSelected: true },
  { key: 'deadline', label: 'Deadline', defaultSelected: true },
  { key: 'estimate_hours', label: 'Estimate (Hours)', defaultSelected: true },
  { key: 'actual_complete_on', label: 'Completed On', defaultSelected: true },
  { key: 'attachments_count', label: 'Attachments', defaultSelected: false },
  { key: 'comments_count', label: 'Comments', defaultSelected: false },
  { key: 'updated_at', label: 'Last Updated', defaultSelected: false },
]

export function defaultSelectedColumnKeys(): ExportColumnKey[] {
  return EXPORT_COLUMNS.filter((c) => c.defaultSelected !== false).map((c) => c.key)
}

function statusLabel(value: string | null | undefined): string {
  return TASK_STATUSES.find((s) => s.value === value)?.label ?? value ?? ''
}

function priorityLabel(value: string | null | undefined): string {
  return TASK_PRIORITIES.find((p) => p.value === value)?.label ?? value ?? ''
}

function typeLabel(value: string | null | undefined): string {
  return TASK_TYPES.find((t) => t.value === value)?.label ?? value ?? 'General'
}

function assigneesText(task: Task): string {
  const list =
    task.assignees && task.assignees.length > 0
      ? task.assignees
      : task.assignee
        ? [task.assignee]
        : []
  if (!list.length) return ''
  return list.map((a) => a.name).join(', ')
}

function cellValue(task: Task, key: ExportColumnKey): string | number {
  switch (key) {
    case 'id':
      return task.id
    case 'title':
      return task.title ?? ''
    case 'details':
      return task.details ?? ''
    case 'project':
      return task.project?.project_name ?? `Project #${task.project_id}`
    case 'status':
      return statusLabel(task.status)
    case 'priority':
      return priorityLabel(task.priority)
    case 'task_type':
      return typeLabel(task.task_type)
    case 'assignees':
      return assigneesText(task)
    case 'client_assignee':
      return task.client_assignee?.name ?? ''
    case 'created_by':
      return formatTaskCreator(task)
    case 'created_at':
      return formatTaskCreatedAt(task)
    case 'task_created_on':
      return formatDate(task.task_created_on)
    case 'estimate_start_date':
      return formatDate(task.estimate_start_date)
    case 'estimate_end_date':
      return formatDate(task.estimate_end_date)
    case 'deadline':
      return formatDate(task.deadline)
    case 'estimate_hours':
      return task.estimate_hours ?? ''
    case 'actual_complete_on':
      return formatDate(task.actual_complete_on)
    case 'attachments_count':
      return task.attachments_count ?? task.attachments?.length ?? 0
    case 'comments_count':
      return task.comments_count ?? task.comments?.length ?? 0
    case 'updated_at':
      return formatDateTime(task.updated_at)
    default:
      return ''
  }
}

export interface ExportTasksOptions {
  tasks: Task[]
  columns: ExportColumnKey[]
  /** File name without extension. */
  fileName?: string
  sheetName?: string
}

/**
 * Build and download an .xlsx workbook for the given tasks and selected columns.
 */
export function exportTasksToExcel({
  tasks,
  columns,
  fileName = 'tasks-export',
  sheetName = 'Tasks',
}: ExportTasksOptions): void {
  if (!columns.length) {
    throw new Error('Select at least one column to export.')
  }
  if (!tasks.length) {
    throw new Error('No tasks to export.')
  }

  const colDefs = columns
    .map((key) => EXPORT_COLUMNS.find((c) => c.key === key))
    .filter((c): c is ExportColumnDef => Boolean(c))

  const rows = tasks.map((task) => {
    const row: Record<string, string | number> = {}
    for (const col of colDefs) {
      row[col.label] = cellValue(task, col.key)
    }
    return row
  })

  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Approximate column widths from header + sample content
  const colWidths = colDefs.map((col) => {
    let max = col.label.length
    for (const row of rows.slice(0, 50)) {
      const val = String(row[col.label] ?? '')
      if (val.length > max) max = Math.min(val.length, 60)
    }
    return { wch: Math.max(10, Math.min(max + 2, 50)) }
  })
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))

  const safeName = fileName.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'tasks-export'
  XLSX.writeFile(workbook, `${safeName}.xlsx`)
}
