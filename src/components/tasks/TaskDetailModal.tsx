import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Send,
  Power,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  addTaskAttachment,
  addTaskComment,
  attachmentUrl,
  deactivateTask,
  fetchTask,
} from '@/lib/api'
import type { Task } from '@/types'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '@/types'
import { cn, formatDate, formatTaskAssignees, initials, isClientAssignedTask, isOverdue } from '@/lib/utils'
import { getApiError } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageLoader } from '@/components/ui/loading'

interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: number | null
  projectId: number
  onEdit: (task: Task) => void
}

export function TaskDetailModal({
  open,
  onOpenChange,
  taskId,
  projectId,
  onEdit,
}: TaskDetailModalProps) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [comment, setComment] = useState('')

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTask(taskId!),
    enabled: open && !!taskId,
  })

  const commentMutation = useMutation({
    mutationFn: () => addTaskComment(taskId!, comment),
    onSuccess: () => {
      setComment('')
      qc.invalidateQueries({ queryKey: ['task', taskId] })
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
      toast.success('Comment added')
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to add comment')),
  })

  const attachMutation = useMutation({
    mutationFn: (file: File) => addTaskAttachment(taskId!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] })
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
      toast.success('Attachment uploaded')
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to upload file')),
  })

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateTask(taskId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
      toast.success('Task deactivated')
      onOpenChange(false)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to deactivate task')),
  })

  const priority = TASK_PRIORITIES.find((p) => p.value === task?.priority)
  const status = TASK_STATUSES.find((s) => s.value === task?.status)
  const taskType = TASK_TYPES.find((t) => t.value === (task?.task_type ?? 'general'))
  const overdue = task ? isOverdue(task.deadline, task.status) : false
  const clientAssigned = task ? isClientAssignedTask(task) : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {isLoading || !task ? (
          <div className="p-8">
            <PageLoader />
          </div>
        ) : (
          <>
            <DialogHeader
              className={cn(
                'p-6 pb-4',
                clientAssigned && 'bg-violet-50 border-b border-violet-100',
              )}
            >
              <div className="flex items-start justify-between gap-4 pr-6">
                <div className="min-w-0">
                  <DialogTitle className="text-xl leading-snug">{task.title}</DialogTitle>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {clientAssigned && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
                        Assigned to client
                      </span>
                    )}
                    {status && (
                      <span className={cn('rounded-md border px-2 py-0.5 text-xs font-semibold', status.color)}>
                        {status.label}
                      </span>
                    )}
                    {taskType && (
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', taskType.color)}>
                        {taskType.label}
                      </span>
                    )}
                    {priority && (
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', priority.color)}>
                        {priority.label}
                      </span>
                    )}
                    {task.deadline && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                          overdue ? 'bg-red-50 text-red-700 font-medium' : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        {formatDate(task.deadline)}
                        {overdue && ' · Overdue'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onEdit(task)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-700 hover:text-amber-800"
                    onClick={() => {
                      if (confirm('Deactivate this task? It will be hidden from the board.')) {
                        deactivateMutation.mutate()
                      }
                    }}
                  >
                    <Power className="h-3.5 w-3.5" />
                    Deactivate
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 pb-6 space-y-6 max-h-[65vh] overflow-y-auto scrollbar-thin">
              {task.details && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Details
                  </h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.details}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1.5">Assignees</p>
                  {(task.assignees && task.assignees.length > 0) ||
                  task.assignee ||
                  task.client_assignee ? (
                    <div className="space-y-2">
                      {task.client_assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">
                              {initials(task.client_assignee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            Client · {task.client_assignee.name}
                          </span>
                        </div>
                      ) : (
                        (task.assignees?.length
                          ? task.assignees
                          : task.assignee
                            ? [task.assignee]
                            : []
                        ).map((person) => (
                          <div key={person.id} className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px]">
                                {initials(person.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{person.name}</span>
                          </div>
                        ))
                      )}
                      {!task.client_assignee &&
                        (task.assignees?.length ?? 0) > 1 && (
                          <p className="text-xs text-muted-foreground">
                            {formatTaskAssignees(task)}
                          </p>
                        )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1.5">Created</p>
                  <p className="text-sm font-medium">{formatDate(task.task_created_on)}</p>
                </div>
              </div>

              <Separator />

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                    <Badge variant="secondary">{task.attachments?.length ?? 0}</Badge>
                  </h4>
                  <div>
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) attachMutation.mutate(file)
                        e.target.value = ''
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      disabled={attachMutation.isPending}
                    >
                      {attachMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      Upload
                    </Button>
                  </div>
                </div>
                {(task.attachments?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No attachments yet</p>
                ) : (
                  <ul className="space-y-2">
                    {task.attachments?.map((a) => {
                      const href = attachmentUrl(a)
                      return (
                        <li
                          key={a.id}
                          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate flex-1 font-medium text-foreground hover:text-indigo-600 hover:underline"
                            title={a.file_name}
                          >
                            {a.file_name}
                          </a>
                          <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                            {formatDate(a.created_at)}
                          </span>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="View / download"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="sr-only">View</span>
                          </a>
                          <a
                            href={href}
                            download={a.file_name}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="Download"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="sr-only">Download</span>
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <Separator />

              {/* Comments */}
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                  <Badge variant="secondary">{task.comments?.length ?? 0}</Badge>
                </h4>

                <div className="space-y-3 mb-4">
                  {(task.comments?.length ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground">No comments yet</p>
                  )}
                  {task.comments?.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {initials(c.user_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 rounded-lg bg-secondary/60 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{c.user_name || 'User'}</p>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(c.created_at)}
                          </span>
                        </div>
                        <p className="text-sm mt-1 text-foreground/90">{c.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment…"
                    className="min-h-[72px]"
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 self-end"
                    disabled={!comment.trim() || commentMutation.isPending}
                    onClick={() => commentMutation.mutate()}
                  >
                    {commentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
