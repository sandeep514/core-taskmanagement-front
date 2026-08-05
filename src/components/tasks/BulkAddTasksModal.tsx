import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListPlus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  bulkCreateTasks,
  fetchProject,
  fetchProjectMembers,
  parseBulkTaskTitles,
} from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import type { TaskPriority, TaskType } from '@/types'
import { TASK_PRIORITIES, TASK_TYPES } from '@/types'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'

const MAX_TITLES = 50

interface BulkAddTasksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
}

export function BulkAddTasksModal({
  open,
  onOpenChange,
  projectId,
}: BulkAddTasksModalProps) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [taskType, setTaskType] = useState<TaskType>('general')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [assignedToIds, setAssignedToIds] = useState<number[]>([])
  const [assignedToClient, setAssignedToClient] = useState<number | ''>('')

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

  const titles = useMemo(() => parseBulkTaskTitles(text, MAX_TITLES), [text])
  const rawLineCount = useMemo(
    () =>
      text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean).length,
    [text],
  )
  const overLimit = rawLineCount > MAX_TITLES

  useEffect(() => {
    if (!open) return
    setText('')
    setTaskType('general')
    setPriority('medium')
    setAssignedToIds([])
    setAssignedToClient('')
  }, [open, projectId])

  // Default single project member
  useEffect(() => {
    if (!open) return
    const active = (employees ?? []).filter((e) => e.status !== 'inactive')
    if (active.length !== 1) return
    setAssignedToIds((ids) => (ids.length === 0 && assignedToClient === '' ? [active[0].id] : ids))
  }, [open, employees, assignedToClient])

  const activeEmployees = (employees ?? []).filter((e) => e.status !== 'inactive')
  const isUnassigned = assignedToIds.length === 0 && assignedToClient === ''

  const clearAssignees = () => {
    setAssignedToIds([])
    setAssignedToClient('')
  }

  const assignClient = (clientId: number) => {
    setAssignedToIds([])
    setAssignedToClient((prev) => (prev === clientId ? '' : clientId))
  }

  const toggleEmployee = (employeeId: number) => {
    setAssignedToClient('')
    setAssignedToIds((ids) =>
      ids.includes(employeeId)
        ? ids.filter((id) => id !== employeeId)
        : [...ids, employeeId],
    )
  }

  const save = useMutation({
    mutationFn: async () => {
      if (titles.length === 0) {
        throw new Error('Add at least one task title (one per line).')
      }
      if (overLimit) {
        throw new Error(`Maximum ${MAX_TITLES} tasks per batch.`)
      }
      return bulkCreateTasks(projectId, {
        titles,
        task_type: taskType,
        priority,
        assigned_to_ids: assignedToIds,
        assigned_to_client: assignedToClient === '' ? null : Number(assignedToClient),
      })
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
      toast.success(
        created.length === 1
          ? 'Created 1 task'
          : `Created ${created.length} tasks`,
      )
      onOpenChange(false)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to create tasks')),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Bulk add tasks
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            Paste or type one task title per line. All tasks use the same type, priority, and
            assignees for this project.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="bulk-tasks">Tasks</Label>
              <Badge variant={overLimit ? 'danger' : 'secondary'}>
                {titles.length} task{titles.length === 1 ? '' : 's'}
                {overLimit ? ` (max ${MAX_TITLES})` : ''}
              </Badge>
            </div>
            <Textarea
              id="bulk-tasks"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'Design login page\nFix payment webhook\nUpdate client invoice PDF'}
              className="min-h-[160px] font-mono text-sm"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Bullets and numbers (e.g. <code>- item</code>, <code>1. item</code>) are cleaned
              automatically. Max {MAX_TITLES} titles.
            </p>
          </div>

          {titles.length > 0 && (
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <ListPlus className="h-3.5 w-3.5" />
                Preview
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm max-h-28 overflow-y-auto">
                {titles.map((t) => (
                  <li key={t} className="truncate" title={t}>
                    {t}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Task type</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
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
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
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

          <div className="space-y-2">
            <Label>Assignees</Label>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Project team only. Multiple employees → one task each per title.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={clearAssignees}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs transition-colors',
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
                    'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                    assignedToClient === project.client.id
                      ? 'border-violet-500 bg-violet-50 text-violet-800 font-medium'
                      : 'border-border text-muted-foreground hover:bg-secondary',
                  )}
                >
                  Client · {project.client.name}
                </button>
              )}
            </div>
            {activeEmployees.length > 0 ? (
              <div className="max-h-[140px] overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {activeEmployees.map((e) => {
                  const checked = assignedToIds.includes(e.id)
                  return (
                    <label
                      key={e.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-sm hover:bg-muted/40',
                        checked && 'bg-primary/5',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-border"
                        checked={checked}
                        onChange={() => toggleEmployee(e.id)}
                      />
                      <span className="font-medium truncate">{e.name}</span>
                      {e.designation?.designation && (
                        <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                          {e.designation.designation}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3">
                No team members on this project yet. Tasks can still be created unassigned.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={titles.length === 0 || overLimit || save.isPending}
          >
            <Sparkles className="h-4 w-4" />
            {save.isPending
              ? 'Creating…'
              : titles.length === 0
                ? 'Add tasks'
                : `Create ${titles.length} task${titles.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
