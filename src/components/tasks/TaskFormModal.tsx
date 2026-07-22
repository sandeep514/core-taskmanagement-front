import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createTask, fetchProjectMembers, updateTask } from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import type { Task, TaskFormData, TaskPriority, TaskStatus, TaskType } from '@/types'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '@/types'
import { Button } from '@/components/ui/button'
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

interface TaskFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  task?: Task | null
  defaultStatus?: TaskStatus
}

const empty = (status: TaskStatus = 'todo'): TaskFormData => ({
  title: '',
  details: '',
  deadline: '',
  assigned_to: '',
  priority: 'medium',
  task_type: 'general',
  status,
})

export function TaskFormModal({
  open,
  onOpenChange,
  projectId,
  task,
  defaultStatus = 'todo',
}: TaskFormModalProps) {
  const qc = useQueryClient()
  const { data: employees } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: open && !!projectId,
  })
  const [form, setForm] = useState<TaskFormData>(empty(defaultStatus))

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        details: task.details || '',
        deadline: task.deadline || '',
        assigned_to: task.assigned_to ?? '',
        priority: task.priority,
        task_type: task.task_type ?? 'general',
        status: task.status,
      })
    } else {
      setForm(empty(defaultStatus))
    }
  }, [task, defaultStatus, open])

  const save = useMutation({
    mutationFn: async () => {
      if (task) return updateTask(task.id, form)
      return createTask(projectId, form)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      toast.success(task ? 'Task updated' : 'Task created')
      onOpenChange(false)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to save task')),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What needs to be done?"
            />
          </div>
          <div className="space-y-2">
            <Label>Details</Label>
            <Textarea
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              placeholder="Description, acceptance criteria…"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select
                value={form.task_type}
                onValueChange={(v) => setForm({ ...form, task_type: v as TaskType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={form.assigned_to === '' ? 'none' : String(form.assigned_to)}
                onValueChange={(v) =>
                  setForm({ ...form, assigned_to: v === 'none' ? '' : Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(employees ?? [])
                    .filter((e) => e.status === 'active')
                    .map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!form.title.trim() || save.isPending}
          >
            {save.isPending ? 'Saving…' : task ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
