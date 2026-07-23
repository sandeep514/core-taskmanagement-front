import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { addTaskAttachment, createTask, fetchProject, fetchProjectMembers, updateTask } from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import { cn, taskAssigneeIds } from '@/lib/utils'
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
  assigned_to_ids: [],
  assigned_to_client: '',
  priority: 'medium',
  task_type: 'general',
  status,
})

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TaskFormModal({
  open,
  onOpenChange,
  projectId,
  task,
  defaultStatus = 'todo',
}: TaskFormModalProps) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const { data: employees } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: open && !!projectId,
  })
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
    enabled: open && !!projectId,
  })
  const [form, setForm] = useState<TaskFormData>(empty(defaultStatus))
  const [files, setFiles] = useState<File[]>([])

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        details: task.details || '',
        deadline: task.deadline || '',
        assigned_to_ids: taskAssigneeIds(task),
        assigned_to_client: task.assigned_to_client ?? '',
        priority: task.priority,
        task_type: task.task_type ?? 'general',
        status: task.status,
      })
    } else {
      setForm(empty(defaultStatus))
    }
    setFiles([])
  }, [task, defaultStatus, open])

  const clearAssignees = () => {
    setForm((f) => ({ ...f, assigned_to_ids: [], assigned_to_client: '' }))
  }

  const assignClient = (clientId: number) => {
    setForm((f) => ({
      ...f,
      assigned_to_ids: [],
      assigned_to_client: f.assigned_to_client === clientId ? '' : clientId,
    }))
  }

  const toggleEmployee = (employeeId: number) => {
    setForm((f) => {
      const has = f.assigned_to_ids.includes(employeeId)
      const next = has
        ? f.assigned_to_ids.filter((id) => id !== employeeId)
        : [...f.assigned_to_ids, employeeId]
      return { ...f, assigned_to_ids: next, assigned_to_client: '' }
    })
  }

  const save = useMutation({
    mutationFn: async () => {
      if (task) {
        return updateTask(task.id, form)
      }
      const created = await createTask(projectId, form)
      for (const file of files) {
        await addTaskAttachment(created.id, file)
      }
      return created
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
      toast.success(task ? 'Task updated' : 'Task created')
      onOpenChange(false)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to save task')),
  })

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const next = Array.from(list)
    const tooBig = next.find((f) => f.size > 10 * 1024 * 1024)
    if (tooBig) {
      toast.error(`"${tooBig.name}" exceeds the 10 MB limit.`)
      return
    }
    setFiles((prev) => [...prev, ...next])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const isUnassigned = form.assigned_to_ids.length === 0 && form.assigned_to_client === ''
  const activeEmployees = (employees ?? []).filter((e) => e.status === 'active')

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
              <Label>Deadline</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assignees</Label>
            <p className="text-xs text-muted-foreground">
              Select one or more employees, or the client (not both).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearAssignees}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  isUnassigned
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:bg-secondary',
                )}
              >
                Unassigned
              </button>
              {project?.client && (
                <button
                  type="button"
                  onClick={() => assignClient(project.client!.id)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                    form.assigned_to_client === project.client.id
                      ? 'border-violet-500 bg-violet-50 text-violet-800 font-medium'
                      : 'border-border text-muted-foreground hover:bg-secondary',
                  )}
                >
                  Client · {project.client.name}
                </button>
              )}
            </div>
            {activeEmployees.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {activeEmployees.map((e) => {
                  const checked = form.assigned_to_ids.includes(e.id)
                  return (
                    <label
                      key={e.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40',
                        checked && 'bg-primary/5',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={checked}
                        onChange={() => toggleEmployee(e.id)}
                      />
                      <span className="font-medium">{e.name}</span>
                      {e.designation?.designation && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {e.designation.designation}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {!task && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5" />
                Attachments
              </Label>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                multiple
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" />
                Add files
              </Button>
              <p className="text-xs text-muted-foreground">Optional · max 10 MB per file</p>
              {files.length > 0 && (
                <ul className="space-y-1.5 pt-1">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        onClick={() => removeFile(index)}
                        aria-label="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!form.title.trim() || save.isPending}
          >
            {save.isPending ? 'Saving…' : task ? 'Save changes' : 'Create task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
