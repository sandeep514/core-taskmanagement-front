import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Mail, Pencil, Phone, Plus, Power } from 'lucide-react'
import { toast } from 'sonner'
import {
  createClient,
  fetchClients,
  toggleClientStatus,
  updateClient,
} from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import type { Client, EntityStatus } from '@/types'
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
import { Checkbox } from '@/components/ui/checkbox'
import { PageLoader } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'

const empty = {
  name: '',
  email: '',
  mobile: '',
  login_email: '',
  password: '',
  status: 'active' as EntityStatus,
  show_team_tasks: false,
}

export function ClientsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['clients'], queryFn: fetchClients })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState(empty)

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        email: form.email,
        mobile: form.mobile || null,
        login_email: form.login_email || null,
        status: form.status,
        show_team_tasks: form.show_team_tasks,
        ...(form.password ? { password: form.password } : {}),
      }
      if (editing) return updateClient(editing.id, payload)
      return createClient(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success(editing ? 'Client updated' : 'Client created')
      setOpen(false)
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const toggle = useMutation({
    mutationFn: toggleClientStatus,
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success(item.status === 'active' ? 'Client activated' : 'Client deactivated')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  const openEdit = (item: Client) => {
    setEditing(item)
    setForm({
      name: item.name,
      email: item.email,
      mobile: item.mobile || '',
      login_email: item.login_email || '',
      password: '',
      status: item.status,
      show_team_tasks: item.show_team_tasks ?? false,
    })
    setOpen(true)
  }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Companies and contacts linked to projects"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        }
      />

      {!data?.length ? (
        <EmptyState
          icon={Briefcase}
          title="No clients yet"
          description="Add clients to assign them to projects."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-base">{item.name}</p>
                    <Badge
                      variant={item.status === 'active' ? 'success' : 'muted'}
                      className="mt-1.5"
                    >
                      {item.status}
                    </Badge>
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
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {item.email}
                  </p>
                  {item.mobile && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      {item.mobile}
                    </p>
                  )}
                  {item.show_team_tasks && (
                    <Badge variant="outline" className="mt-1 font-normal">
                      Can view team tasks
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Client' : 'Add Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Company name"
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
              <Label>Mobile</Label>
              <Input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Login Email</Label>
              <Input
                type="email"
                value={form.login_email}
                onChange={(e) => setForm({ ...form, login_email: e.target.value })}
                placeholder="Optional portal login"
              />
            </div>
            <div className="space-y-2">
              <Label>Password {editing && <span className="text-muted-foreground">(leave blank to keep)</span>}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
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
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40 transition-colors">
              <Checkbox
                className="mt-0.5"
                checked={form.show_team_tasks}
                onCheckedChange={(c) =>
                  setForm({ ...form, show_team_tasks: c === true })
                }
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium leading-none">
                  Show team tasks
                </span>
                <span className="block text-xs text-muted-foreground leading-relaxed">
                  When enabled, this client can see tasks assigned between team members
                  (employee to employee). When disabled, they only see tasks they created
                  and tasks in Client Review.
                </span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={!form.name.trim() || !form.email.trim() || save.isPending}
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
