import axios from 'axios'
import type {
  AuthUser,
  Client,
  DashboardStats,
  Department,
  Designation,
  Employee,
  LoginResponse,
  PersonalTodo,
  Project,
  ProjectFormData,
  Task,
  TaskFormData,
  TaskStatus,
  TodoFilter,
  UserRole,
} from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

/** Current portal role for task/project endpoint prefixes */
function portalBase(role?: UserRole | null): 'admin' | 'employee' | 'client' {
  if (role === 'admin' || role === 'employee' || role === 'client') return role
  try {
    const raw = localStorage.getItem('taskflow_user')
    if (raw) {
      const user = JSON.parse(raw) as AuthUser
      if (user.role === 'admin' || user.role === 'employee' || user.role === 'client') {
        return user.role
      }
    }
  } catch {
    // ignore
  }
  return 'employee'
}

export function homePathForRole(role: UserRole): string {
  if (role === 'admin') return '/admin'
  if (role === 'client') return '/client'
  return '/employee'
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('taskflow_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Let the browser set multipart boundary
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers && 'Content-Type' in config.headers) {
      delete config.headers['Content-Type']
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('taskflow_token')
      localStorage.removeItem('taskflow_user')
      // Clear zustand persist blob so protected routes don't stay "logged in"
      localStorage.removeItem('taskflow-auth')
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

function emptyToNull(value: string | number | null | undefined): string | number | null {
  if (value === '' || value === undefined) return null
  return value
}

function normalizeTaskPayload(payload: Partial<TaskFormData>) {
  const estimate =
    payload.estimate_hours === '' || payload.estimate_hours === undefined
      ? null
      : Number(payload.estimate_hours)

  return {
    title: payload.title,
    details: emptyToNull(payload.details ?? '') as string | null,
    deadline: emptyToNull(payload.deadline ?? '') as string | null,
    estimate_hours:
      estimate === null || Number.isNaN(estimate) ? null : estimate,
    assigned_to_ids: Array.isArray(payload.assigned_to_ids)
      ? payload.assigned_to_ids.map(Number)
      : [],
    assigned_to_client:
      payload.assigned_to_client === '' || payload.assigned_to_client === undefined
        ? null
        : Number(payload.assigned_to_client),
    priority: payload.priority,
    task_type: payload.task_type,
    status: payload.status,
  }
}

function normalizeProjectPayload(payload: ProjectFormData) {
  return {
    project_name: payload.project_name,
    description: emptyToNull(payload.description) as string | null,
    start_on: emptyToNull(payload.start_on) as string | null,
    safe_end_on: emptyToNull(payload.safe_end_on) as string | null,
    deadline: emptyToNull(payload.deadline) as string | null,
    client_id: Number(payload.client_id),
    can_client_add_tasks: Boolean(payload.can_client_add_tasks),
    can_client_see_tasks: Boolean(payload.can_client_see_tasks),
    department_ids: payload.department_ids ?? [],
    employee_ids: payload.employee_ids ?? [],
  }
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function loginAdmin(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/admin/login', { email, password })
  return data
}

export async function loginEmployee(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/employee/login', { email, password })
  return data
}

export async function loginClient(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/client/login', { email, password })
  return data
}

export async function logout(): Promise<void> {
  await api.post('/logout')
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/me')
  return data
}

export async function changePassword(payload: {
  current_password: string
  password: string
  password_confirmation: string
}): Promise<{ message: string; user: AuthUser }> {
  const { data } = await api.post<{ message: string; user: AuthUser }>(
    '/change-password',
    payload,
  )
  return data
}

// ─── Admin: Designations ────────────────────────────────────────────────────

export async function fetchDesignations(): Promise<Designation[]> {
  const { data } = await api.get<Designation[]>('/admin/designations')
  return data
}

export async function createDesignation(payload: Partial<Designation>): Promise<Designation> {
  const { data } = await api.post<Designation>('/admin/designations', {
    designation: payload.designation,
    description: emptyToNull(payload.description ?? '') as string | null,
    status: payload.status ?? 'active',
  })
  return data
}

export async function updateDesignation(
  id: number,
  payload: Partial<Designation>,
): Promise<Designation> {
  const { data } = await api.put<Designation>(`/admin/designations/${id}`, {
    designation: payload.designation,
    description: emptyToNull(payload.description ?? '') as string | null,
    status: payload.status,
  })
  return data
}

/** Deactivate designation (soft). */
export async function deactivateDesignation(id: number): Promise<Designation> {
  const { data } = await api.delete<Designation>(`/admin/designations/${id}`)
  return data
}

export async function activateDesignation(id: number): Promise<Designation> {
  const { data } = await api.post<Designation>(`/admin/designations/${id}/activate`)
  return data
}

export async function toggleDesignationStatus(id: number): Promise<Designation> {
  const { data } = await api.post<Designation>(`/admin/designations/${id}/toggle-status`)
  return data
}

// ─── Admin: Departments ─────────────────────────────────────────────────────

export async function fetchDepartments(): Promise<Department[]> {
  const { data } = await api.get<Department[]>('/admin/departments')
  return data
}

export async function createDepartment(payload: Partial<Department>): Promise<Department> {
  const { data } = await api.post<Department>('/admin/departments', {
    department: payload.department,
    description: emptyToNull(payload.description ?? '') as string | null,
    status: payload.status ?? 'active',
  })
  return data
}

export async function updateDepartment(
  id: number,
  payload: Partial<Department>,
): Promise<Department> {
  const { data } = await api.put<Department>(`/admin/departments/${id}`, {
    department: payload.department,
    description: emptyToNull(payload.description ?? '') as string | null,
    status: payload.status,
  })
  return data
}

export async function deactivateDepartment(id: number): Promise<Department> {
  const { data } = await api.delete<Department>(`/admin/departments/${id}`)
  return data
}

export async function activateDepartment(id: number): Promise<Department> {
  const { data } = await api.post<Department>(`/admin/departments/${id}/activate`)
  return data
}

export async function toggleDepartmentStatus(id: number): Promise<Department> {
  const { data } = await api.post<Department>(`/admin/departments/${id}/toggle-status`)
  return data
}

// ─── Admin: Clients ─────────────────────────────────────────────────────────

export async function fetchClients(): Promise<Client[]> {
  const { data } = await api.get<Client[]>('/admin/clients')
  return data
}

export async function createClient(
  payload: Partial<Client> & { password?: string },
): Promise<Client> {
  const { data } = await api.post<Client>('/admin/clients', {
    name: payload.name,
    email: payload.email,
    mobile: emptyToNull(payload.mobile ?? '') as string | null,
    login_email: emptyToNull(payload.login_email ?? '') as string | null,
    password: payload.password || undefined,
    status: payload.status ?? 'active',
    show_team_tasks: payload.show_team_tasks ?? false,
  })
  return data
}

export async function updateClient(
  id: number,
  payload: Partial<Client> & { password?: string },
): Promise<Client> {
  const body: Record<string, unknown> = {
    name: payload.name,
    email: payload.email,
    mobile: emptyToNull(payload.mobile ?? '') as string | null,
    login_email: emptyToNull(payload.login_email ?? '') as string | null,
    status: payload.status,
    show_team_tasks: payload.show_team_tasks ?? false,
  }
  if (payload.password) body.password = payload.password
  const { data } = await api.put<Client>(`/admin/clients/${id}`, body)
  return data
}

export async function deactivateClient(id: number): Promise<Client> {
  const { data } = await api.delete<Client>(`/admin/clients/${id}`)
  return data
}

export async function activateClient(id: number): Promise<Client> {
  const { data } = await api.post<Client>(`/admin/clients/${id}/activate`)
  return data
}

export async function toggleClientStatus(id: number): Promise<Client> {
  const { data } = await api.post<Client>(`/admin/clients/${id}/toggle-status`)
  return data
}

// ─── Admin: Employees ───────────────────────────────────────────────────────

export async function fetchEmployees(): Promise<Employee[]> {
  const { data } = await api.get<Employee[]>('/admin/employees')
  return data
}

export async function createEmployee(
  payload: Partial<Employee> & { password?: string },
): Promise<Employee> {
  const { data } = await api.post<Employee>('/admin/employees', {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    department_id: payload.department_id ?? null,
    designation_id: payload.designation_id ?? null,
    status: payload.status ?? 'active',
  })
  return data
}

export async function updateEmployee(
  id: number,
  payload: Partial<Employee> & { password?: string },
): Promise<Employee> {
  const body: Record<string, unknown> = {
    name: payload.name,
    email: payload.email,
    department_id: payload.department_id ?? null,
    designation_id: payload.designation_id ?? null,
    status: payload.status,
  }
  if (payload.password) body.password = payload.password
  const { data } = await api.put<Employee>(`/admin/employees/${id}`, body)
  return data
}

export async function deactivateEmployee(id: number): Promise<Employee> {
  const { data } = await api.delete<Employee>(`/admin/employees/${id}`)
  return data
}

export async function activateEmployee(id: number): Promise<Employee> {
  const { data } = await api.post<Employee>(`/admin/employees/${id}/activate`)
  return data
}

export async function toggleEmployeeStatus(id: number): Promise<Employee> {
  const { data } = await api.post<Employee>(`/admin/employees/${id}/toggle-status`)
  return data
}

// ─── Admin: Projects ────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await api.get<Project[]>('/admin/projects')
  return data
}

export async function fetchProject(id: number): Promise<Project> {
  const base = portalBase()
  if (base === 'admin') {
    const { data } = await api.get<Project>(`/admin/projects/${id}`)
    return data
  }
  if (base === 'client') {
    const { data } = await api.get<Project>(`/client/projects/${id}`)
    return data
  }
  const { data } = await api.get<Project>(`/employee/projects/${id}`)
  return data
}

export async function createProject(payload: ProjectFormData): Promise<Project> {
  const { data } = await api.post<Project>('/admin/projects', normalizeProjectPayload(payload))
  return data
}

export async function updateProject(id: number, payload: ProjectFormData): Promise<Project> {
  const { data } = await api.put<Project>(
    `/admin/projects/${id}`,
    normalizeProjectPayload(payload),
  )
  return data
}

export async function deactivateProject(id: number): Promise<Project> {
  const { data } = await api.delete<Project>(`/admin/projects/${id}`)
  return data
}

export async function activateProject(id: number): Promise<Project> {
  const { data } = await api.post<Project>(`/admin/projects/${id}/activate`)
  return data
}

export async function toggleProjectStatus(id: number): Promise<Project> {
  const { data } = await api.post<Project>(`/admin/projects/${id}/toggle-status`)
  return data
}

export async function syncProjectEmployees(
  projectId: number,
  employeeIds: number[],
): Promise<Project> {
  const { data } = await api.post<Project>(`/admin/projects/${projectId}/sync-employees`, {
    employee_ids: employeeIds,
  })
  return data
}

export async function fetchAdminDashboard(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/admin/dashboard')
  return data
}

// ─── Project members (assignees) ────────────────────────────────────────────

export async function fetchProjectMembers(projectId: number): Promise<Employee[]> {
  const base = portalBase()
  if (base === 'admin') {
    const project = await fetchProject(projectId)
    return (project.employees ?? []).filter((e) => e.status === 'active')
  }
  if (base === 'client') {
    const { data } = await api.get<Employee[]>(`/client/projects/${projectId}/members`)
    return data
  }
  const { data } = await api.get<Employee[]>(`/employee/projects/${projectId}/members`)
  return data
}

// ─── Employee / Client projects ─────────────────────────────────────────────

export async function fetchMyProjects(): Promise<Project[]> {
  const base = portalBase()
  if (base === 'client') {
    const { data } = await api.get<Project[]>('/client/my-projects')
    return data
  }
  const { data } = await api.get<Project[]>('/employee/my-projects')
  return data
}

// ─── Tasks (admin or employee portal) ───────────────────────────────────────

export async function fetchProjectTasks(projectId: number): Promise<Task[]> {
  const base = portalBase()
  const { data } = await api.get<Task[]>(`/${base}/projects/${projectId}/tasks`)
  return data
}

/** Tasks assigned to the current employee/client across all projects. */
export async function fetchMyAssignedTasks(): Promise<Task[]> {
  const base = portalBase()
  if (base === 'admin') {
    return []
  }
  const { data } = await api.get<Task[]>(`/${base}/my-tasks`)
  return data
}

export async function fetchTask(taskId: number): Promise<Task> {
  const { data } = await api.get<Task>(`/${portalBase()}/tasks/${taskId}`)
  return data
}

/**
 * Create task(s). When multiple employees are assigned, the API creates
 * one task per person and returns `{ tasks, count }`.
 */
export async function createTask(projectId: number, payload: TaskFormData): Promise<Task[]> {
  const { data } = await api.post<Task | Task[] | { tasks: Task[]; count: number }>(
    `/${portalBase()}/tasks`,
    {
      ...normalizeTaskPayload(payload),
      project_id: projectId,
    },
  )
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'tasks' in data && Array.isArray(data.tasks)) {
    return data.tasks
  }
  return [data as Task]
}

export async function updateTask(
  taskId: number,
  payload: Partial<TaskFormData>,
): Promise<Task> {
  const { data } = await api.put<Task>(
    `/${portalBase()}/tasks/${taskId}`,
    normalizeTaskPayload(payload),
  )
  return data
}

export async function updateTaskStatus(taskId: number, status: TaskStatus): Promise<Task> {
  const { data } = await api.patch<Task>(`/${portalBase()}/tasks/${taskId}/status`, { status })
  return data
}

/** Soft-deactivate task (hidden from Kanban). */
export async function deactivateTask(taskId: number): Promise<Task> {
  const { data } = await api.delete<Task>(`/${portalBase()}/tasks/${taskId}`)
  return data
}

export async function activateTask(taskId: number): Promise<Task> {
  const { data } = await api.post<Task>(`/${portalBase()}/tasks/${taskId}/activate`)
  return data
}

export async function addTaskComment(taskId: number, comment: string): Promise<void> {
  await api.post(`/${portalBase()}/tasks/${taskId}/comments`, { comment })
}

export async function addTaskAttachment(taskId: number, file: File): Promise<void> {
  const form = new FormData()
  form.append('file', file)
  await api.post(`/${portalBase()}/tasks/${taskId}/attachments`, form)
}

/** Copy a task into the same project or another accessible project. */
export async function copyTask(
  taskId: number,
  projectId: number,
  options?: { include_attachments?: boolean },
): Promise<Task> {
  const { data } = await api.post<Task>(`/${portalBase()}/tasks/${taskId}/copy`, {
    project_id: projectId,
    include_attachments: options?.include_attachments ?? true,
  })
  return data
}

/** Projects the current user can copy tasks into (role-aware). */
export async function fetchCopyTargetProjects(): Promise<Project[]> {
  const base = portalBase()
  if (base === 'admin') {
    return fetchProjects()
  }
  return fetchMyProjects()
}

// ─── Personal todos (admin + employee) ──────────────────────────────────────

export async function fetchTodos(filter: TodoFilter = 'all'): Promise<PersonalTodo[]> {
  const { data } = await api.get<PersonalTodo[]>('/todos', {
    params: filter === 'all' ? undefined : { filter },
  })
  return data
}

export async function createTodo(payload: {
  title: string
  notes?: string | null
}): Promise<PersonalTodo> {
  const { data } = await api.post<PersonalTodo>('/todos', {
    title: payload.title,
    notes: payload.notes || null,
  })
  return data
}

export async function updateTodo(
  id: number,
  payload: { title?: string; notes?: string | null; is_completed?: boolean },
): Promise<PersonalTodo> {
  const { data } = await api.put<PersonalTodo>(`/todos/${id}`, {
    ...payload,
    notes: payload.notes === undefined ? undefined : payload.notes || null,
  })
  return data
}

export async function toggleTodo(id: number): Promise<PersonalTodo> {
  const { data } = await api.patch<PersonalTodo>(`/todos/${id}/toggle`)
  return data
}

export async function completeTodo(id: number): Promise<PersonalTodo> {
  const { data } = await api.patch<PersonalTodo>(`/todos/${id}/complete`)
  return data
}

export async function incompleteTodo(id: number): Promise<PersonalTodo> {
  const { data } = await api.patch<PersonalTodo>(`/todos/${id}/incomplete`)
  return data
}

/** Soft-deactivate personal todo */
export async function deactivateTodo(id: number): Promise<PersonalTodo> {
  const { data } = await api.delete<PersonalTodo>(`/todos/${id}`)
  return data
}

export { API_URL }
export default api

/** Absolute public URL for a file stored on Laravel's public disk. */
export function storageUrl(filePath: string): string {
  const origin = API_URL.replace(/\/api\/?$/, '')
  return `${origin}/storage/${filePath.replace(/^\//, '')}`
}

export function attachmentUrl(attachment: {
  url?: string | null
  file_path: string
}): string {
  // Prefer file_path + API origin so a mismatched APP_URL on the server doesn't break clients.
  if (attachment.file_path) {
    return storageUrl(attachment.file_path)
  }
  if (attachment.url) {
    if (attachment.url.startsWith('http://') || attachment.url.startsWith('https://')) {
      return attachment.url
    }
    const origin = API_URL.replace(/\/api\/?$/, '')
    return `${origin}${attachment.url.startsWith('/') ? '' : '/'}${attachment.url}`
  }
  return ''
}
