import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Circle,
  ListTodo,
  Pencil,
  Plus,
  Power,
  StickyNote,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createTodo,
  deactivateTodo,
  fetchTodos,
  toggleTodo,
  updateTodo,
} from '@/lib/api'
import { getApiError } from '@/lib/api-error'
import type { PersonalTodo, TodoFilter } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatDate } from '@/lib/utils'

const filters: { value: TodoFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'completed', label: 'Done' },
]

export function PersonalTodosPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<TodoFilter>('all')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<PersonalTodo | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['personal-todos', filter],
    queryFn: () => fetchTodos(filter),
  })

  const stats = useMemo(() => {
    const list = data ?? []
    return {
      total: list.length,
      open: list.filter((t) => !t.is_completed).length,
      done: list.filter((t) => t.is_completed).length,
    }
  }, [data])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['personal-todos'] })

  const add = useMutation({
    mutationFn: () => createTodo({ title: title.trim(), notes: notes.trim() || null }),
    onSuccess: () => {
      setTitle('')
      setNotes('')
      invalidate()
      toast.success('Todo added')
    },
    onError: (err) => toast.error(getApiError(err, 'Failed to add todo')),
  })

  const toggle = useMutation({
    mutationFn: (id: number) => toggleTodo(id),
    onSuccess: (todo) => {
      invalidate()
      toast.success(todo.is_completed ? 'Marked complete' : 'Marked open')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const saveEdit = useMutation({
    mutationFn: () =>
      updateTodo(editing!.id, {
        title: editTitle.trim(),
        notes: editNotes.trim() || null,
      }),
    onSuccess: () => {
      setEditOpen(false)
      setEditing(null)
      invalidate()
      toast.success('Todo updated')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const remove = useMutation({
    mutationFn: (id: number) => deactivateTodo(id),
    onSuccess: () => {
      invalidate()
      toast.success('Todo removed')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const openEdit = (todo: PersonalTodo) => {
    setEditing(todo)
    setEditTitle(todo.title)
    setEditNotes(todo.notes || '')
    setEditOpen(true)
  }

  if (isLoading) return <PageLoader />

  if (isError) {
    return (
      <EmptyState
        icon={ListTodo}
        title="Could not load todos"
        description="Personal notes are available for admin and employee accounts."
        action={
          <button type="button" className="text-sm text-primary underline" onClick={() => refetch()}>
            Retry
          </button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <PageHeader
        title="My Todos"
        description="Personal notes and reminders — separate from project tasks"
      />

      {/* 50% create | 50% list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 flex-1 min-h-0 lg:items-stretch">
        {/* Left: Create (50%) */}
        <Card className="flex flex-col lg:min-h-[calc(100vh-12rem)]">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Create todo
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Add a personal note or reminder
            </p>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 gap-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="todo-title">Title</Label>
              <Input
                id="todo-title"
                placeholder="What do you need to remember?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && title.trim()) {
                    e.preventDefault()
                    add.mutate()
                  }
                }}
              />
            </div>
            <div className="space-y-2 flex-1 flex flex-col">
              <Label htmlFor="todo-notes">Notes</Label>
              <Textarea
                id="todo-notes"
                placeholder="Optional details…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex-1 min-h-[180px] resize-none"
              />
            </div>
            <Button
              className="w-full h-11"
              onClick={() => add.mutate()}
              disabled={!title.trim() || add.isPending}
            >
              <Plus className="h-4 w-4" />
              {add.isPending ? 'Adding…' : 'Add todo'}
            </Button>
          </CardContent>
        </Card>

        {/* Right: List (50%) */}
        <Card className="flex flex-col lg:min-h-[calc(100vh-12rem)] overflow-hidden">
          <CardHeader className="pb-3 border-b border-border space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-primary" />
                  Your list
                </CardTitle>
                <p className="text-sm text-muted-foreground font-normal mt-1">
                  Click the circle to mark complete
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Badge variant="secondary" className="font-normal">
                  {stats.open} open
                </Badge>
                <Badge variant="success" className="font-normal">
                  {stats.done} done
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {filters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors border',
                    filter === f.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:bg-secondary',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin min-h-0">
            {!data?.length ? (
              <div className="flex h-full min-h-[200px] items-center justify-center">
                <EmptyState
                  icon={StickyNote}
                  title={filter === 'completed' ? 'No completed todos' : 'No todos yet'}
                  description="Use the form on the left to add your first note."
                />
              </div>
            ) : (
              <ul className="space-y-2">
                {data.map((todo) => (
                  <li key={todo.id}>
                    <div
                      className={cn(
                        'rounded-xl border border-border p-3 flex gap-3 items-start transition-colors',
                        todo.is_completed && 'bg-secondary/40 border-dashed',
                      )}
                    >
                      <button
                        type="button"
                        className={cn(
                          'mt-0.5 shrink-0 rounded-full p-0.5 transition-colors',
                          todo.is_completed
                            ? 'text-emerald-600 hover:text-emerald-700'
                            : 'text-slate-400 hover:text-primary',
                        )}
                        title={todo.is_completed ? 'Mark open' : 'Mark complete'}
                        onClick={() => toggle.mutate(todo.id)}
                      >
                        {todo.is_completed ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <Circle className="h-6 w-6" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'font-medium text-sm',
                            todo.is_completed && 'line-through text-muted-foreground',
                          )}
                        >
                          {todo.title}
                        </p>
                        {todo.notes && (
                          <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                            {todo.notes}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                          <Badge
                            variant={todo.is_completed ? 'success' : 'secondary'}
                            className="text-[10px]"
                          >
                            {todo.is_completed ? 'Done' : 'Open'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(todo.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit"
                          onClick={() => openEdit(todo)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-700"
                          title="Remove"
                          onClick={() => {
                            if (confirm('Remove this todo?')) remove.mutate(todo.id)
                          }}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit todo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="min-h-[90px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveEdit.mutate()}
              disabled={!editTitle.trim() || saveEdit.isPending}
            >
              {saveEdit.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
