export type UserRole = 'admin' | 'employee' | 'client'

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
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: number
  task_id: number
  user_id: number
  user_type: 'admin' | 'employee' | 'client'
  comment: string
  user_name?: string
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
  /** Estimated effort in hours (optional). */
  estimate_hours: number | null
  actual_complete_on: string | null
  /** @deprecated Prefer assigned_to_ids / assignees */
  assigned_to: number | null
  assigned_to_ids?: number[]
  assigned_to_client?: number | null
  created_by: number | null
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
