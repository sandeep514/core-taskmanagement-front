import type { EmployeeTopTasksReportEmployeeRow, Task } from '@/types'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '@/types'
import {
  formatDate,
  formatDateTime,
  formatEstimateDuration,
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
  | 'estimate_minutes'
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
  { key: 'estimate_minutes', label: 'Estimate (Minutes)', defaultSelected: true },
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
    case 'estimate_minutes':
      return task.estimate_minutes ?? ''
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

type SheetCell = string | number | { date: string }

export interface SpreadsheetSheet {
  name: string
  headers: string[]
  rows: Array<Array<SheetCell>>
  /** Rows above the column header, such as the report From / To range. */
  leadingRows?: Array<Array<SheetCell>>
  /** Excel column filter on the header row (includes a from–to filter on dates). */
  autoFilter?: boolean
}

/** Excel forbids certain characters in sheet names, caps length at 31, and requires uniqueness. */
function sanitizeSheetName(raw: string, used: Set<string>): string {
  let name = raw.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31).trim()
  if (!name) name = 'Sheet'
  let candidate = name
  let n = 2
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`
    candidate = name.slice(0, 31 - suffix.length) + suffix
    n += 1
  }
  used.add(candidate.toLowerCase())
  return candidate
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

function columnLetter(index: number): string {
  let n = index
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

function parseSheetDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  // exceljs stores dates from Date#getTime() (UTC). Local midnight in IST is
  // the previous evening UTC, so Saturday was written as Friday. Noon UTC
  // keeps the calendar day, including Saturday.
  return new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1, 12, 0, 0))
}

/** Real .xlsx workbook so sheet tabs (employee names) open in Excel. */
async function downloadXlsx(sheets: SpreadsheetSheet[], fileName: string): Promise<void> {
  const loaded = await import('exceljs')
  const namespaced = loaded as typeof import('exceljs') & { default?: typeof import('exceljs') }
  const ExcelJS = typeof namespaced.Workbook === 'function' ? namespaced : namespaced.default!
  const workbook = new ExcelJS.Workbook()
  const usedNames = new Set<string>()

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sanitizeSheetName(sheet.name, usedNames))
    const leading = sheet.leadingRows ?? []
    for (const cells of leading) {
      const row = worksheet.addRow(cells.map((cell) => (cell && typeof cell === 'object' ? parseSheetDate(cell.date) : cell)))
      row.getCell(1).font = { bold: true }
      cells.forEach((cell, index) => {
        if (cell && typeof cell === 'object') {
          row.getCell(index + 1).numFmt = 'dd-mmm-yyyy'
        }
      })
    }
    if (leading.length) worksheet.addRow([])

    const header = worksheet.addRow(sheet.headers)
    header.font = { bold: true }
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }
    })

    for (const cells of sheet.rows) {
      const row = worksheet.addRow(
        cells.map((cell) => (cell && typeof cell === 'object' ? parseSheetDate(cell.date) : cell)),
      )
      cells.forEach((cell, index) => {
        if (cell && typeof cell === 'object') {
          row.getCell(index + 1).numFmt = 'dd-mmm-yyyy'
        }
      })
    }

    sheet.headers.forEach((label, index) => {
      const width = Math.min(48, Math.max(14, label.length + 6))
      worksheet.getColumn(index + 1).width = label === 'Title' || label === 'Task' ? 42 : width
    })

    if (sheet.autoFilter && sheet.headers.length) {
      const headerRow = leading.length + 2
      const lastRow = Math.max(headerRow, headerRow + sheet.rows.length)
      const lastCol = columnLetter(sheet.headers.length)
      worksheet.autoFilter = `A${headerRow}:${lastCol}${lastRow}`
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const safeName = fileName.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'tasks-export'
  downloadBlob(blob, `${safeName}.xlsx`)
}

export interface ExportTasksOptions {
  tasks: Task[]
  columns: ExportColumnKey[]
  /** File name without extension. */
  fileName?: string
  sheetName?: string
}

function taskEmployeeNames(task: Task): string[] {
  const names = (task.assignees ?? []).map((person) => person.name).filter(Boolean)
  if (names.length) return names
  if (task.assignee?.name) return [task.assignee.name]
  if (task.client_assignee?.name) return [`Client · ${task.client_assignee.name}`]
  return ['Unassigned']
}

function groupedTopTaskRows(tasks: Task[]): SpreadsheetSheet['rows'] {
  const sorted = [...tasks].sort((a, b) => {
    const dateA = String(a.top_task_date ?? '').slice(0, 10)
    const dateB = String(b.top_task_date ?? '').slice(0, 10)
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    const projectA = a.project?.project_name ?? ''
    const projectB = b.project?.project_name ?? ''
    if (projectA !== projectB) return projectA.localeCompare(projectB)
    return a.title.localeCompare(b.title)
  })

  let lastDate = ''
  let lastProject = ''
  return sorted.map((task) => {
    const date = String(task.top_task_date ?? '').slice(0, 10)
    const project = task.project?.project_name ?? `Project #${task.project_id}`
    const showDate = date !== lastDate
    const showProject = showDate || project !== lastProject
    lastDate = date
    lastProject = project
    return [
      showDate && date ? { date } : '',
      showProject ? project : '',
      task.title,
      estimateTimeCell(task.estimate_minutes),
    ]
  })
}

/**
 * Top Tasks report as .xlsx. One sheet per employee (sheet tab and a row
 * inside the sheet). Columns are Date, Project, Title, Time, grouped by
 * date then project.
 */
export async function exportTopTasksReportExcel({
  tasks,
  from,
  to,
  fileName,
}: {
  tasks: Task[]
  from: string
  to: string
  fileName?: string
}): Promise<void> {
  if (!tasks.length) {
    throw new Error('No tasks to export.')
  }

  const byEmployee = new Map<string, Task[]>()
  for (const task of tasks) {
    for (const name of taskEmployeeNames(task)) {
      const list = byEmployee.get(name) ?? []
      list.push(task)
      byEmployee.set(name, list)
    }
  }

  const sheets: SpreadsheetSheet[] = [...byEmployee.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, employeeTasks]) => ({
      name,
      headers: ['Date', 'Project', 'Title', 'Time'],
      rows: groupedTopTaskRows(employeeTasks),
      leadingRows: [
        ['Employee', name],
        ['From', { date: from }],
        ['To', { date: to }],
      ],
      autoFilter: true,
    }))

  await downloadXlsx(sheets, fileName ?? `top-tasks-${from}-to-${to}`)
}

export async function exportTasksToExcel({
  tasks,
  columns,
  fileName = 'tasks-export',
  sheetName = 'Tasks',
}: ExportTasksOptions): Promise<void> {
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

  await downloadXlsx([{ name: sheetName, headers, rows: dataRows, autoFilter: true }], fileName)
}

export interface ExportEmployeeTopTasksOptions {
  from: string
  to: string
  byEmployee: EmployeeTopTasksReportEmployeeRow[]
  /** File name without extension. */
  fileName?: string
}

function estimateTimeCell(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(Number(minutes)) || Number(minutes) <= 0) return ''
  return formatEstimateDuration(minutes)
}

/**
 * One sheet per employee. Each Top task is its own row:
 * Date | Task | Time. The selected From–To range is on the sheet, and the
 * Date column has Excel's filter so the range can be narrowed again.
 * Employees with no marks still get a sheet.
 */
export async function exportEmployeeTopTasksExcel({
  from,
  to,
  byEmployee,
  fileName,
}: ExportEmployeeTopTasksOptions): Promise<void> {
  if (!byEmployee.length) {
    throw new Error('No employees to export.')
  }

  const periodRows = [
    ['From', { date: from }],
    ['To', { date: to }],
  ]

  const sheets: SpreadsheetSheet[] = byEmployee.map((employee) => {
    const headers = ['Date', 'Task', 'Time']
    const rows: SpreadsheetSheet['rows'] = employee.entries.length
      ? employee.entries.flatMap((entry) =>
          entry.tasks.map((task) => [
            { date: entry.date },
            task.project_name ? `${task.title} (${task.project_name})` : task.title,
            estimateTimeCell(task.estimate_minutes),
          ]),
        )
      : [['', 'No top tasks marked in this range', '']]

    return {
      name: employee.employee_name,
      headers,
      rows,
      leadingRows: [['Employee', employee.employee_name], ...periodRows],
      autoFilter: true,
    }
  })

  await downloadXlsx(sheets, fileName ?? `employee-top-tasks-${from}-to-${to}`)
}
