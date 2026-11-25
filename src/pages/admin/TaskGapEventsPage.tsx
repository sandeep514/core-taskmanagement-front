import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  createTaskGapEvent,
  deleteTaskGapEvent,
  fetchTaskGapEvents,
  updateTaskGapEvent,
} from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import { TASK_GAP_REASONS, type TaskGapEvent, type TaskGapReason } from '@/types'
import { formatDate, todayDateString } from '@/lib/utils'
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

function reasonLabel(reason: TaskGapReason): string {
  return TASK_GAP_REASONS.find((item) => item.value === reason)?.label ?? reason
}

function dateRangeLabel(event: Pick<TaskGapEvent, 'from_date' | 'to_date'>): string {
  const from = event.from_date.slice(0, 10)
  const to = event.to_date.slice(0, 10)
  if (from === to) return formatDate(from)
  return `${formatDate(from)} – ${formatDate(to)}`
}

const emptyForm = () => ({
  reason: 'festival_holiday' as TaskGapReason,
  title: '',
  from_date: todayDateString(),
  to_date: todayDateString(),
  notes: '',
})

export function TaskGapEventsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['task-gap-events'],
    queryFn: () => fetchTaskGapEvents(),
  })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TaskGapEvent | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [pendingDelete, setPendingDelete] = useState<TaskGapEvent | null>(null)

  const rangeInvalid = !form.from_date || !form.to_date || form.from_date > form.to_date

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        reason: form.reason,
        title: form.title.trim(),
        from_date: form.from_date,
        to_date: form.to_date,
        notes: form.notes.trim() || null,
      }
      if (editing) return updateTaskGapEvent(editing.id, payload)
      return createTaskGapEvent(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-gap-events'] })
      toast.success(editing ? 'Event updated' : 'Event added')
      setOpen(false)
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteTaskGapEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-gap-events'] })
      toast.success('Event deleted')
      setPendingDelete(null)
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setOpen(true)
  }

  const openEdit = (event: TaskGapEvent) => {
    setEditing(event)
    setForm({
      reason: event.reason,
      title: event.title,
      from_date: event.from_date.slice(0, 10),
      to_date: event.to_date.slice(0, 10),
      notes: event.notes ?? '',
    })
    setOpen(true)
  }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="No-Task Events"
        description="Record a server issue, festival holiday, or other event. The name shows on the report for those dates. Employees who work that day can still add tasks."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add event
          </Button>
        }
      />

      {!data?.length ? (
        <EmptyState
          icon={CalendarOff}
          title="No events yet"
          description="Add a server issue, festival holiday, or another reason tasks were not added."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add event
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Dates</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                    <th className="px-4 py-3 font-medium">Event</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((event) => (
                    <tr key={event.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap">{dateRangeLabel(event)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{reasonLabel(event.reason)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{event.title}</p>
                        {event.created_by_name && (
                          <p className="text-xs text-muted-foreground">Added by {event.created_by_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                        {event.notes || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(event)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setPendingDelete(event)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit event' : 'Add event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select
                value={form.reason}
                onValueChange={(value) => setForm({ ...form, reason: value as TaskGapReason })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_GAP_REASONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Diwali, Production server down"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  type="date"
                  value={form.from_date}
                  max={form.to_date || undefined}
                  onChange={(e) => setForm({ ...form, from_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  type="date"
                  value={form.to_date}
                  min={form.from_date || undefined}
                  onChange={(e) => setForm({ ...form, to_date: e.target.value })}
                />
              </div>
            </div>
            {rangeInvalid && (
              <p className="text-xs text-red-600">From date must be on or before To date.</p>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={!form.title.trim() || rangeInvalid || save.isPending}
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingDelete != null} onOpenChange={(next) => !next && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this event?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {pendingDelete
              ? `${pendingDelete.title} (${dateRangeLabel(pendingDelete)}) will be removed.`
              : ''}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending || !pendingDelete}
              onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
