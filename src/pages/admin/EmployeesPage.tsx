import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Power, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  createEmployee,
  fetchDepartments,
  fetchDesignations,
  fetchEmployees,
  toggleEmployeeStatus,
  updateEmployee,
} from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import type { Employee, EntityStatus } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { initials } from '@/lib/utils'

const empty = {
  name: '',
  email: '',
  password: '',
  department_id: '' as number | '',
  designation_id: '' as number | '',
  status: 'active' as EntityStatus,
}

export function EmployeesPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees })
  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments })
  const { data: designations } = useQuery({
    queryKey: ['designations'],
    queryFn: fetchDesignations,
  })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState(empty)

  const save = useMutation({
    mutationFn: async () => {
      if (!editing && !form.password.trim()) {
        throw new Error('Password is required for new employees')
      }
      const payload = {
        name: form.name,
        email: form.email,
        department_id: form.department_id === '' ? null : Number(form.department_id),
        designation_id: form.designation_id === '' ? null : Number(form.designation_id),
        status: form.status,
        ...(form.password ? { password: form.password } : {}),
      }
      if (editing) return updateEmployee(editing.id, payload)
      return createEmployee(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success(editing ? 'Employee updated' : 'Employee created')
      setOpen(false)
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const toggle = useMutation({
    mutationFn: toggleEmployeeStatus,
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success(
        item.status === 'active' ? 'Employee activated' : 'Employee deactivated',
      )
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  const openEdit = (item: Employee) => {
    setEditing(item)
    setForm({
      name: item.name,
      email: item.email,
      password: '',
      department_id: item.department_id ?? '',
      designation_id: item.designation_id ?? '',
      status: item.status,
    })
    setOpen(true)
  }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Team members who can access projects and tasks"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        }
      />

      {!data?.length ? (
        <EmptyState
          icon={Users}
          title="No employees yet"
          description="Add employees and assign departments & designations."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Department</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Designation</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px]">{initials(item.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {item.department?.department ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {item.designation?.designation ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status === 'active' ? 'success' : 'muted'}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Password {editing && <span className="text-muted-foreground">(optional)</span>}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={form.department_id === '' ? undefined : String(form.department_id)}
                onValueChange={(v) => setForm({ ...form, department_id: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {(departments ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Select
                value={form.designation_id === '' ? undefined : String(form.designation_id)}
                onValueChange={(v) => setForm({ ...form, designation_id: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {(designations ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as EntityStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={
                !form.name.trim() ||
                !form.email.trim() ||
                (!editing && !form.password.trim()) ||
                save.isPending
              }
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
