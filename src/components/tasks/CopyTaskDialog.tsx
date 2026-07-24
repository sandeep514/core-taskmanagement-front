import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { copyTask, fetchCopyTargetProjects } from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import type { Task } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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

interface CopyTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  /** Project the task currently belongs to (for default selection & cache invalidation). */
  sourceProjectId: number
  onCopied?: (task: Task) => void
}

export function CopyTaskDialog({
  open,
  onOpenChange,
  task,
  sourceProjectId,
  onCopied,
}: CopyTaskDialogProps) {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const [targetProjectId, setTargetProjectId] = useState<string>(String(sourceProjectId))
  const [includeAttachments, setIncludeAttachments] = useState(true)

  const { data: projects, isLoading } = useQuery({
    queryKey: ['copy-target-projects'],
    queryFn: fetchCopyTargetProjects,
    enabled: open,
  })

  const activeProjects = useMemo(() => {
    let list = (projects ?? []).filter((p) => p.status === 'active')
    // Clients may only create tasks on projects that allow it.
    if (role === 'client') {
      list = list.filter((p) => p.can_client_add_tasks)
    }
    return list
  }, [projects, role])

  useEffect(() => {
    if (open) {
      setTargetProjectId(String(sourceProjectId))
      setIncludeAttachments(true)
    }
  }, [open, sourceProjectId, task?.id])

  const mutation = useMutation({
    mutationFn: () =>
      copyTask(task!.id, Number(targetProjectId), {
        include_attachments: includeAttachments,
      }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['project-tasks', sourceProjectId] })
      qc.invalidateQueries({ queryKey: ['project-tasks', created.project_id] })
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
      const same = created.project_id === sourceProjectId
      toast.success(same ? 'Task copied in this project' : 'Task copied to selected project')
      onOpenChange(false)
      onCopied?.(created)
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to copy task')),
  })

  const sameProject = Number(targetProjectId) === sourceProjectId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Copy task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {task && (
            <p className="text-sm text-muted-foreground">
              Duplicate <span className="font-medium text-foreground">{task.title}</span> into a
              project you have access to. Comments are not copied; status starts as To Do.
            </p>
          )}

          <div className="space-y-2">
            <Label>Target project</Label>
            <Select
              value={targetProjectId}
              onValueChange={setTargetProjectId}
              disabled={isLoading || activeProjects.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Loading…' : 'Select project'} />
              </SelectTrigger>
              <SelectContent>
                {activeProjects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.project_name}
                    {p.id === sourceProjectId ? ' (this project)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sameProject && (
              <p className="text-xs text-muted-foreground">
                Same project: title will get a “(copy)” suffix.
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={includeAttachments}
              onCheckedChange={(v) => setIncludeAttachments(v === true)}
            />
            Include attachments
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!task || !targetProjectId || mutation.isPending || activeProjects.length === 0}
          >
            {mutation.isPending ? 'Copying…' : 'Copy task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
