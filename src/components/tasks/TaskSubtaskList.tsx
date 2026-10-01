import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ListChecks, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  addTaskSubtasks,
  deleteTaskSubtask,
  toggleTaskSubtask,
  updateTaskSubtask,
} from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import type { Task, TaskSubtask } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ProgressBar } from '@/components/ui/progress-bar'

interface TaskSubtaskListProps {
  task: Task
  projectId: number
  /** Creator / project manager rights — controls add, rename, delete. */
  canManage: boolean
  /** Anyone with project access can tick items off. */
  canComplete: boolean
}

/** Split a paste of several lines into separate checklist titles. */
function parseTitles(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 50)
}

export function TaskSubtaskList({
  task,
  projectId,
  canManage,
  canComplete,
}: TaskSubtaskListProps) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const subtasks = task.subtasks ?? []
  const total = task.subtasks_total ?? subtasks.length
  const done = task.subtasks_done ?? subtasks.filter((s) => s.is_completed).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  const applyTask = (updated: Task) => {
    qc.setQueryData(['task', task.id], updated)
    qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
    qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
  }

  const addMutation = useMutation({
    mutationFn: (titles: string[]) => addTaskSubtasks(task.id, titles),
    onSuccess: (updated) => {
      applyTask(updated)
      setDraft('')
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to add subtask')),
  })

  const toggleMutation = useMutation({
    mutationFn: (subtaskId: number) => toggleTaskSubtask(task.id, subtaskId),
    onSuccess: applyTask,
    onError: (err) => toast.error(getApiError(err, 'Failed to update subtask')),
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      updateTaskSubtask(task.id, id, { title }),
    onSuccess: (updated) => {
      applyTask(updated)
      setEditingId(null)
      setEditingTitle('')
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to rename subtask')),
  })

  const deleteMutation = useMutation({
    mutationFn: (subtaskId: number) => deleteTaskSubtask(task.id, subtaskId),
    onSuccess: applyTask,
    onError: (err) => toast.error(getApiError(err, 'Failed to delete subtask')),
  })

  const submitDraft = () => {
    const titles = parseTitles(draft)
    if (titles.length === 0) return
    addMutation.mutate(titles)
  }

  const startEdit = (subtask: TaskSubtask) => {
    setEditingId(subtask.id)
    setEditingTitle(subtask.title)
  }

  const submitEdit = () => {
    const title = editingTitle.trim()
    if (!title || editingId == null) return
    renameMutation.mutate({ id: editingId, title })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          Subtasks
          <Badge variant="secondary">
            {done}/{total}
          </Badge>
        </h4>
        {total > 0 && (
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              percent === 100 ? 'text-emerald-600' : 'text-muted-foreground',
            )}
          >
            {percent}%
          </span>
        )}
      </div>

      {total > 0 && <ProgressBar value={percent} />}

      {subtasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canManage
            ? 'Break this task into smaller steps to track progress.'
            : 'No subtasks yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {subtasks.map((subtask) => {
            const isEditing = editingId === subtask.id
            return (
              <li
                key={subtask.id}
                className="flex items-center gap-2.5 px-3 py-2 group"
              >
                <Checkbox
                  checked={subtask.is_completed}
                  disabled={!canComplete || toggleMutation.isPending}
                  onCheckedChange={() => toggleMutation.mutate(subtask.id)}
                />

                {isEditing ? (
                  <>
                    <Input
                      value={editingTitle}
                      autoFocus
                      className="h-8"
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitEdit()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={submitEdit}
                      disabled={renameMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className={cn(
                        'flex-1 text-sm min-w-0 break-words',
                        subtask.is_completed && 'line-through text-muted-foreground',
                      )}
                      title={
                        subtask.completed_by_name
                          ? `Completed by ${subtask.completed_by_name}`
                          : undefined
                      }
                    >
                      {subtask.title}
                    </span>
                    {canManage && (
                      <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => startEdit(subtask)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          onClick={() => deleteMutation.mutate(subtask.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {canManage && (
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder="Add a subtask…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submitDraft()
              }
            }}
          />
          <Button
            onClick={submitDraft}
            disabled={!draft.trim() || addMutation.isPending}
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
