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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function cellXml(value: string | number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`
  }
  const text = escapeXml(String(value ?? ''))
  return `<Cell><Data ss:Type="String">${text}</Data></Cell>`
}

/**
 * Build Excel-compatible SpreadsheetML (opens in Excel / LibreOffice / Google Sheets).
 * Zero runtime dependencies — avoids fragile xlsx package installs on deploy servers.
 */
function buildSpreadsheetMl(
  headers: string[],
  rows: Array<Array<string | number>>,
  sheetName: string,
): string {
  const safeSheet = escapeXml(sheetName.slice(0, 31) || 'Tasks')
  const headerRow = `<Row>${headers.map((h) => cellXml(h)).join('')}</Row>`
  const dataRows = rows.map((row) => `<Row>${row.map((c) => cellXml(c)).join('')}</Row>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${safeSheet}">
  <Table>
   ${headerRow.replace(/<Cell>/g, '<Cell ss:StyleID="Header">')}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Delay revoke so the browser can start the download
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export interface ExportTasksOptions {
  tasks: Task[]
  columns: ExportColumnKey[]
  /** File name without extension. */
  fileName?: string
  sheetName?: string
}

/**
 * Build and download an Excel-compatible spreadsheet for the given tasks and columns.
 * Uses SpreadsheetML (.xls) with no external packages.
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

  const headers = colDefs.map((c) => c.label)
  const dataRows = tasks.map((task) => colDefs.map((col) => cellValue(task, col.key)))

  const xml = buildSpreadsheetMl(headers, dataRows, sheetName)
  // UTF-8 BOM helps Excel on Windows detect encoding correctly
  const bom = '\uFEFF'
  const blob = new Blob([bom + xml], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  })

  const safeName = fileName.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'tasks-export'
  downloadBlob(blob, `${safeName}.xls`)
}
