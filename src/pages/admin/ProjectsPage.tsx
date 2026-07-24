import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Columns3, FolderKanban, Pencil, Plus, Power, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  createProject,
  fetchClients,
  fetchDepartments,
  fetchEmployees,
  fetchProjects,
  toggleProjectStatus,
  updateProject,
} from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import type { Project, ProjectFormData } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { MultiSelect } from '@/components/ui/multi-select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/utils'

const emptyForm: ProjectFormData = {
  project_name: '',
  description: '',
  start_on: '',
  safe_end_on: '',
  deadline: '',
  client_id: '',
  can_client_add_tasks: false,
  can_client_see_tasks: true,
  department_ids: [],
  employee_ids: [],
}

export function ProjectsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: fetchClients })
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments })
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectFormData>(emptyForm)

  const save = useMutation({
    mutationFn: async () => {
      if (editing) return updateProject(editing.id, form)
      return createProject(form)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success(editing ? 'Project updated' : 'Project created')
      setOpen(false)
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const toggle = useMutation({
    mutationFn: toggleProjectStatus,
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success(
        item.status === 'active' ? 'Project activated' : 'Project deactivated',
      )
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (item: Project) => {
    setEditing(item)
    setForm({
      project_name: item.project_name,
      description: item.description || '',
      start_on: item.start_on || '',
      safe_end_on: item.safe_end_on || '',
      deadline: item.deadline || '',
      client_id: item.client_id,
      can_client_add_tasks: item.can_client_add_tasks,
      can_client_see_tasks: item.can_client_see_tasks,
      department_ids: item.departments?.map((d) => d.id) ?? [],
      employee_ids: item.employees?.map((e) => e.id) ?? [],
    })
    setOpen(true)
  }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Create projects, assign clients, departments, and employees"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        }
      />

      {!data?.length ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project and assign team members to get started."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg truncate">{item.project_name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {item.client?.name ?? 'No client'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={item.status === 'active' ? 'Deactivate' : 'Activate'}
                      className={
                        item.status === 'active'
                          ? 'text-amber-600 hover:text-amber-700'
                          : 'text-emerald-600 hover:text-emerald-700'
                      }
                      onClick={() => toggle.mutate(item.id)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2">
                  <Badge variant={item.status === 'active' ? 'success' : 'muted'}>
                    {item.status}
                  </Badge>
                </div>

                {item.description && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1">
                    <Calendar className="h-3 w-3" />
                    Deadline {formatDate(item.deadline)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1">
                    <Users className="h-3 w-3" />
                    {item.employees?.length ?? 0} members
                  </span>
                  <Badge variant="secondary">{item.tasks_count ?? 0} tasks</Badge>
                </div>

                {!!item.departments?.length && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.departments.map((d) => (
                      <Badge key={d.id} variant="outline">
                        {d.department}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-border">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to={`/admin/projects/${item.id}`}>
                      <Columns3 className="h-4 w-4" />
                      Open Kanban Board
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Project' : 'New Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto px-1 -mx-1">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={form.project_name}
                onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                placeholder="e.g. Portal Redesign"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={form.client_id === '' ? undefined : String(form.client_id)}
                onValueChange={(v) => setForm({ ...form, client_id: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {(clients ?? [])
                    .filter((c) => c.status === 'active' || c.id === form.client_id)
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                        {c.status !== 'active' ? ' (inactive)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Start On</Label>
                <Input
                  type="date"
                  value={form.start_on}
                  onChange={(e) => setForm({ ...form, start_on: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Safe End</Label>
                <Input
                  type="date"
                  value={form.safe_end_on}
                  onChange={(e) => setForm({ ...form, safe_end_on: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Departments</Label>
              <MultiSelect
                options={(departments ?? []).map((d) => ({
                  value: d.id,
                  label: d.department,
                }))}
                value={form.department_ids}
                onChange={(department_ids) => setForm({ ...form, department_ids })}
                placeholder="Select departments"
              />
            </div>
            <div className="space-y-2">
              <Label>Employees</Label>
              <MultiSelect
                options={(employees ?? [])
                  .filter((e) => e.status === 'active')
                  .map((e) => ({ value: e.id, label: e.name }))}
                value={form.employee_ids}
                onChange={(employee_ids) => setForm({ ...form, employee_ids })}
                placeholder="Assign employees"
              />
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={form.can_client_see_tasks}
                  onCheckedChange={(c) =>
                    setForm({ ...form, can_client_see_tasks: c === true })
                  }
                />
                Client can see tasks
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={form.can_client_add_tasks}
                  onCheckedChange={(c) =>
                    setForm({ ...form, can_client_add_tasks: c === true })
                  }
                />
                Client can add tasks
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={
                !form.project_name.trim() || form.client_id === '' || save.isPending
              }
            >
              {save.isPending ? 'Saving…' : 'Save Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
