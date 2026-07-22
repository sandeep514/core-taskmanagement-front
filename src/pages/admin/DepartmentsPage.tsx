import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Pencil, Plus, Power } from 'lucide-react'
import { toast } from 'sonner'
import {
  createDepartment,
  fetchDepartments,
  toggleDepartmentStatus,
  updateDepartment,
} from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import type { Department, EntityStatus } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

const empty = { department: '', description: '', status: 'active' as EntityStatus }

export function DepartmentsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState(empty)

  const save = useMutation({
    mutationFn: async () => {
      if (editing) return updateDepartment(editing.id, form)
      return createDepartment(form)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast.success(editing ? 'Department updated' : 'Department created')
      setOpen(false)
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const toggle = useMutation({
    mutationFn: toggleDepartmentStatus,
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast.success(
        item.status === 'active' ? 'Department activated' : 'Department deactivated',
      )
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  const openEdit = (item: Department) => {
    setEditing(item)
    setForm({
      department: item.department,
      description: item.description || '',
      status: item.status,
    })
    setOpen(true)
  }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Organizational units for team structure"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        }
      />

      {!data?.length ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          description="Create departments like Engineering, Design, QA."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Department
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-50 p-2.5">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.department}</p>
                      <Badge
                        variant={item.status === 'active' ? 'success' : 'muted'}
                        className="mt-1"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
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
                </div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                  {item.description || 'No description'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Department' : 'Add Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. Engineering"
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
              disabled={!form.department.trim() || save.isPending}
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
