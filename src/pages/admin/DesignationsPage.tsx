import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  createDesignation,
  fetchDesignations,
  toggleDesignationStatus,
  updateDesignation,
} from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import type { Designation, EntityStatus } from '@/types'
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
import { EntityList } from '@/components/ui/entity-list'
import { EntityActions } from '@/components/ui/entity-actions'
import { BadgeCheck } from 'lucide-react'

const empty = { designation: '', description: '', status: 'active' as EntityStatus }

export function DesignationsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['designations'], queryFn: fetchDesignations })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Designation | null>(null)
  const [form, setForm] = useState(empty)

  const save = useMutation({
    mutationFn: async () => {
      if (editing) return updateDesignation(editing.id, form)
      return createDesignation(form)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['designations'] })
      toast.success(editing ? 'Designation updated' : 'Designation created')
      setOpen(false)
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const toggle = useMutation({
    mutationFn: toggleDesignationStatus,
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['designations'] })
      toast.success(
        item.status === 'active' ? 'Designation activated' : 'Designation deactivated',
      )
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  const openEdit = (item: Designation) => {
    setEditing(item)
    setForm({
      designation: item.designation,
      description: item.description || '',
      status: item.status,
    })
    setOpen(true)
  }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Designations"
        description="Job titles and roles for employees"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Designation
          </Button>
        }
      />

      {!data?.length ? (
        <EmptyState
          icon={BadgeCheck}
          title="No designations yet"
          description="Create job titles like Software Engineer, Designer, etc."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Designation
            </Button>
          }
        />
      ) : (
        <EntityList
          items={data}
          viewKey="designations:view"
          noun="designations"
          searchText={(d) => `${d.designation} ${d.description ?? ''}`}
          primary={{
            header: 'Designation',
            cell: (d) => (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-1.5">
                  <BadgeCheck className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="font-medium text-foreground">{d.designation}</span>
              </div>
            ),
          }}
          columns={[
            {
              header: 'Description',
              hideBelow: 'md',
              cell: (d) => (
                <span className="block max-w-md truncate" title={d.description ?? undefined}>
                  {d.description || '—'}
                </span>
              ),
            },
          ]}
          renderActions={(d) => (
            <EntityActions
              name={d.designation}
              status={d.status}
              onEdit={() => openEdit(d)}
              onToggle={() => toggle.mutate(d.id)}
            />
          )}
          renderCard={(d) => (
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-50 p-2.5">
                      <BadgeCheck className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{d.designation}</p>
                      <Badge variant={d.status === 'active' ? 'success' : 'muted'} className="mt-1">
                        {d.status}
                      </Badge>
                    </div>
                  </div>
                  <EntityActions
                    name={d.designation}
                    status={d.status}
                    onEdit={() => openEdit(d)}
                    onToggle={() => toggle.mutate(d.id)}
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                  {d.description || 'No description'}
                </p>
              </CardContent>
            </Card>
          )}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Designation' : 'Add Designation'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
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
              disabled={!form.designation.trim() || save.isPending}
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
