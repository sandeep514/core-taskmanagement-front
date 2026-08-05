export type UserRole = 'admin' | 'hr' | 'employee' | 'client'

export type TaskStatus =
  | 'todo'
  | 'discussion'
  | 'in_progress'
  | 'dev_done'
  | 'testing'
  | 'client_review'
  | 'done'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskType = 'general' | 'support' | 'enhancement'

export type EntityStatus = 'active' | 'inactive'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: UserRole
  /** True when password is still the admin-set default (123456). */
  must_change_password?: boolean
  /** Employee designation name (when role is employee). */
  designation?: string | null
  /** True when employee designation is Project Manager. */
  is_project_manager?: boolean
}

export interface Designation {
  id: number
  designation: string
  description: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface Department {
  id: number
  department: string
  description: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface Client {
  id: number
  name: string
  email: string
  mobile: string | null
  login_email: string | null
  status: EntityStatus
  /** When true, client can see employee-to-employee (team) tasks on their projects. */
  show_team_tasks: boolean
  created_at: string
  updated_at: string
}

export interface Employee {
  id: number
  name: string
  email: string
  department_id: number | null
  designation_id: number | null
  status: EntityStatus
  department?: Department | null
  designation?: Designation | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: number
  project_name: string
  description: string | null
  start_on: string | null
  safe_end_on: string | null
  deadline: string | null
  client_id: number
  can_client_add_tasks: boolean
  can_client_see_tasks: boolean
  status: EntityStatus
  client?: Client
  departments?: Department[]
  employees?: Employee[]
  tasks_count?: number
  created_at: string
  updated_at: string
}

export interface TaskAttachment {
  id: number
  task_id: number
  file_path: string
  file_name: string
  mime_type: string | null
  file_size?: number | null
  /** Public storage URL (from API when available). */
  url?: string | null
  /** Soft-delete reason (only set after delete; active attachments omit this). */
  delete_remark?: string | null
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: number
  task_id: number
  user_id: number
  user_type: 'admin' | 'hr' | 'employee' | 'client'
  comment: string
  user_name?: string
  created_at: string
  updated_at: string
}

export interface TaskActivityLog {
  id: number
  task_id: number
  user_id: number | null
  user_type: 'admin' | 'hr' | 'employee' | 'client' | null
  action: string
  from_value: string | null
  to_value: string | null
  message: string | null
  user_name?: string | null
  meta?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/** Global activity feed row (admin / HR activity logs page). */
export interface ActivityLogEntry {
  id: number
  task_id: number
  task_title?: string | null
  project_id?: number | null
  project_name?: string | null
  user_id: number | null
  user_type: 'admin' | 'hr' | 'employee' | 'client' | null
  user_name?: string | null
  action: string
  from_value: string | null
  to_value: string | null
  message: string | null
  meta?: Record<string, unknown> | null
  created_at: string
}

export interface ActivityLogListResponse {
  data: ActivityLogEntry[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

/** HR portal user managed by admin. */
export interface HrUser {
  id: number
  name: string
  email: string
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface Task {
  id: number
  project_id: number
  title: string
  details: string | null
  task_created_on: string
  deadline: string | null
  /** Estimated work start date (optional). */
  estimate_start_date: string | null
  /** Estimated work end date (optional; often auto from hours). */
  estimate_end_date: string | null
  /** Estimated effort in hours (optional). */
  estimate_hours: number | null
  actual_complete_on: string | null
  /** @deprecated Prefer assigned_to_ids / assignees */
  assigned_to: number | null
  assigned_to_ids?: number[]
  assigned_to_client?: number | null
  created_by: number | null
  /** Who created the task: admin | hr | employee | client */
  created_by_type?: 'admin' | 'hr' | 'employee' | 'client' | null
  /** Resolved display name from API (e.g. "Admin · Jane", "HR · Sam", "Client · Acme") */
  created_by_name?: string | null
  priority: TaskPriority
  task_type: TaskType
  status: TaskStatus
  is_active?: boolean
  /** @deprecated Prefer assignees */
  assignee?: Employee | null
  assignees?: Employee[]
  client_assignee?: Client | null
  creator?: Employee | null
  project?: Pick<Project, 'id' | 'project_name' | 'client_id'> | null
  attachments?: TaskAttachment[]
  comments?: TaskComment[]
  activity_logs?: TaskActivityLog[]
  attachments_count?: number
  comments_count?: number
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total_projects: number
  total_employees: number
  total_clients: number
  total_tasks: number
  tasks_todo: number
  tasks_in_progress: number
  tasks_done: number
  overdue_tasks: number
}

export interface WorkReportTaskRow {
  id: number
  title: string
  project_id: number
  project_name: string
  priority: TaskPriority
  status: TaskStatus
  estimate_hours: number | null
  actual_complete_on: string | null
  assignees: { id: number; name: string }[]
}

export interface WorkReportEmployeeRow {
  employee_id: number
  employee_name: string
  tasks_done: number
  estimate_hours: number
}

export interface WorkReportProjectRow {
  project_id: number
  project_name: string
  tasks_done: number
  estimate_hours: number
}

export interface WorkReport {
  from: string
  to: string
  employee_id: number | null
  summary: {
    tasks_done: number
    estimate_hours_total: number
    employees_count: number
    projects_count: number
  }
  by_employee: WorkReportEmployeeRow[]
  by_project: WorkReportProjectRow[]
  tasks: WorkReportTaskRow[]
  employees: Pick<Employee, 'id' | 'name' | 'email'>[]
  /** Employee portal only — current user's id for default filter. */
  default_employee_id?: number
}

export const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'discussion', label: 'Discussion', color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'dev_done', label: 'Employee Done', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'testing', label: 'Testing', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'client_review', label: 'Client Review', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'done', label: 'Done', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
]

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600' },
  { value: 'medium', label: 'Medium', color: 'bg-sky-100 text-sky-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

export const TASK_TYPES: { value: TaskType; label: string; color: string }[] = [
  { value: 'general', label: 'General', color: 'bg-slate-100 text-slate-700' },
  { value: 'support', label: 'Support', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'enhancement', label: 'Enhancement', color: 'bg-purple-100 text-purple-700' },
]

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface ProjectFormData {
  project_name: string
  description: string
  start_on: string
  safe_end_on: string
  deadline: string
  client_id: number | ''
  can_client_add_tasks: boolean
  can_client_see_tasks: boolean
  department_ids: number[]
  employee_ids: number[]
}

export interface TaskFormData {
  title: string
  details: string
  deadline: string
  /** Estimated start date (YYYY-MM-DD) or empty. */
  estimate_start_date: string
  /** Estimated end date (YYYY-MM-DD) or empty; auto-filled from hours when possible. */
  estimate_end_date: string
  /** Empty string when unset in the form; API receives number | null. */
  estimate_hours: number | ''
  assigned_to_ids: number[]
  assigned_to_client: number | ''
  priority: TaskPriority
  task_type: TaskType
  status: TaskStatus
}

export interface PersonalTodo {
  id: number
  user_id: number
  user_type: 'admin' | 'employee'
  title: string
  notes: string | null
  is_completed: boolean
  completed_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type TodoFilter = 'all' | 'open' | 'completed'
