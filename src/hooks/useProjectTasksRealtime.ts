import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { getEcho } from '@/lib/echo'
import { useAuthStore } from '@/stores/authStore'
import type { Task } from '@/types'

export type TaskChangedPayload = {
  event: string
  task: Task
  actor?: { id: number; name?: string | null; role: string } | null
}

function mergeTaskIntoList(list: Task[] | undefined, payload: TaskChangedPayload): Task[] | undefined {
  if (!list) return list

  const { event, task } = payload
  const shouldRemove = event === 'deactivated' || task.is_active === false

  if (shouldRemove) {
    return list.filter((t) => t.id !== task.id)
  }

  const idx = list.findIndex((t) => t.id === task.id)
  if (idx === -1) {
    return [...list, task]
  }

  const next = [...list]
  next[idx] = { ...next[idx], ...task }
  return next
}

function applyTaskChanged(
  qc: QueryClient,
  payload: TaskChangedPayload,
  role?: string | null,
  userId?: number | null,
) {
  const projectId = payload.task.project_id
  if (!projectId) return

  // Clients have server-side visibility rules (show_team_tasks, etc.).
  // Refetch so the API is the source of truth.
  if (role === 'client') {
    void qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
    void qc.invalidateQueries({ queryKey: ['task', payload.task.id] })
    void qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] })
    return
  }

  qc.setQueryData<Task[]>(['project-tasks', projectId], (old) =>
    mergeTaskIntoList(old, payload),
  )

  // Keep open task detail in sync (comments, status, etc.)
  qc.setQueryData<Task>(['task', payload.task.id], (old) => {
    if (!old) {
      if (payload.event === 'deactivated' || payload.task.is_active === false) {
        return old
      }
      return payload.task
    }
    if (payload.event === 'deactivated' || payload.task.is_active === false) {
      return { ...old, ...payload.task, is_active: false }
    }
    return { ...old, ...payload.task }
  })

  // My assigned tasks (employee): only keep tasks assigned to current user
  qc.setQueryData<Task[]>(['my-assigned-tasks'], (old) => {
    if (!old) return old
    const merged = mergeTaskIntoList(old, payload)
    if (!merged || userId == null) return merged
    return merged.filter((t) => {
      const ids =
        t.assigned_to_ids?.length
          ? t.assigned_to_ids
          : t.assignees?.map((a) => a.id) ??
            (t.assigned_to ? [t.assigned_to] : [])
      return ids.includes(userId)
    })
  })
}

/**
 * Subscribe to live task updates for a project board.
 * Requires Laravel Reverb running and VITE_REVERB_* env vars.
 */
export function useProjectTasksRealtime(projectId: number | null | undefined) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const qc = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || !token || !projectId || Number.isNaN(projectId)) {
      return
    }

    const echo = getEcho(token)
    if (!echo) {
      return
    }

    const channelName = `project.${projectId}`
    const channel = echo.private(channelName)

    const handler = (payload: TaskChangedPayload) => {
      if (!payload?.task?.id) return
      applyTaskChanged(qc, payload, user?.role, user?.id)
    }

    channel.listen('.task.changed', handler)

    return () => {
      try {
        channel.stopListening('.task.changed', handler)
        echo.leave(channelName)
      } catch {
        // ignore
      }
    }
  }, [projectId, token, isAuthenticated, qc, user?.role, user?.id])
}

/**
 * Subscribe to multiple project channels (e.g. My Tasks across projects).
 */
export function useProjectsTasksRealtime(projectIds: number[]) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const qc = useQueryClient()

  const key = projectIds.slice().sort((a, b) => a - b).join(',')

  useEffect(() => {
    if (!isAuthenticated || !token || projectIds.length === 0) {
      return
    }

    const echo = getEcho(token)
    if (!echo) {
      return
    }

    const cleanups: Array<() => void> = []

    for (const projectId of projectIds) {
      if (!projectId || Number.isNaN(projectId)) continue
      const channelName = `project.${projectId}`
      const channel = echo.private(channelName)
      const handler = (payload: TaskChangedPayload) => {
        if (!payload?.task?.id) return
        applyTaskChanged(qc, payload, user?.role, user?.id)
      }
      channel.listen('.task.changed', handler)
      cleanups.push(() => {
        try {
          channel.stopListening('.task.changed', handler)
          echo.leave(channelName)
        } catch {
          // ignore
        }
      })
    }

    return () => {
      cleanups.forEach((fn) => fn())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key tracks project id set
  }, [key, token, isAuthenticated, qc, user?.role, user?.id])
}
