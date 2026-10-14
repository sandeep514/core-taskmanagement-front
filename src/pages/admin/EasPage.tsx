import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Power, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { createEa, fetchEas, toggleEaStatus, updateEa } from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import type { EaUser, EntityStatus } from '@/types'
import { canManageRecords } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
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
import { EntityList } from '@/components/ui/entity-list'
import { EntityActions } from '@/components/ui/entity-actions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { initials } from '@/lib/utils'

const empty = {
  name: '',
  email: '',
  password: '',
  status: 'active' as EntityStatus,
}

/**
 * EA accounts: managed by admin + HR. EA callers see the list read-only
 * (the API blocks every EA write to a previous entry).
 */
export function EasPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManage = canManageRecords(user)
  const { data, isLoading } = useQuery({ queryKey: ['eas'], queryFn: fetchEas })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<EaUser | null>(null)
  const [form, setForm] = useState(empty)

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        email: form.email,
        status: form.status,
        ...(form.password ? { password: form.password } : {}),
      }
      if (editing) return updateEa(editing.id, payload)
      return createEa(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eas'] })
      toast.success(editing ? 'EA account updated' : 'EA account created')
      setOpen(false)
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const toggle = useMutation({
    mutationFn: toggleEaStatus,
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['eas'] })
      toast.success(item.status === 'active' ? 'EA activated' : 'EA deactivated')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  const openEdit = (item: EaUser) => {
    setEditing(item)
    setForm({
      name: item.name,
      email: item.email,
      password: '',
      status: item.status,
    })
    setOpen(true)
  }

  if (isLoading) return <PageLoader />

  const items = data ?? []

  return (
    <div>
      <PageHeader
        title="EA Accounts"
        description={
          canManage
            ? 'Create and manage EA portal users (admin-level view + create access, no edits)'
            : 'EA portal users — read-only for the EA role'
        }
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add EA
            </Button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No EA accounts"
          description={
            canManage
              ? 'Add an EA user so they can sign in to the EA portal.'
              : 'No EA accounts yet.'
          }
          action={
            canManage ? (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add EA
              </Button>
            ) : undefined
          }
        />
      ) : (
        <EntityList
          items={items}
          viewKey="eas:view"
          noun="EA accounts"
          searchText={(h) => `${h.name} ${h.email}`}
          primary={{
            header: 'EA',
            cell: (h) => (
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-violet-600 text-white text-[10px]">
                    {initials(h.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground truncate">{h.name}</span>
              </div>
            ),
          }}
          columns={[{ header: 'Email', cell: (h) => <span className="block truncate max-w-xs">{h.email}</span> }]}
          renderActions={
            canManage
              ? (h) => (
                  <EntityActions
                    name={h.name}
                    status={h.status}
                    disabled={toggle.isPending}
                    onEdit={() => openEdit(h)}
                    onToggle={() => toggle.mutate(h.id)}
                  />
                )
              : () => null
          }
          renderCard={(h) => (
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-violet-600 text-white">{initials(h.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{h.name}</p>
                      <Badge variant={h.status === 'active' ? 'default' : 'secondary'}>{h.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{h.email}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(h)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggle.mutate(h.id)}
                      disabled={toggle.isPending}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {h.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          cardGridClassName="gap-3 sm:grid-cols-2 xl:grid-cols-3"
        />
      )}

      {canManage && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit EA Account' : 'New EA Account'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{editing ? 'New password (optional)' : 'Password'}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? 'Leave blank to keep' : 'Default: 123456 if empty'}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as EntityStatus }))}
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
                disabled={save.isPending || !form.name.trim() || !form.email.trim()}
              >
                {save.isPending ? 'Saving…' : editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
