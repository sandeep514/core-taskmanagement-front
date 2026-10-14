import { useState } from 'react'
import { CalendarDays, History } from 'lucide-react'
import type { Task } from '@/types'
import { TOP_TASKS_DAILY_MIN } from '@/types'
import { formatDate } from '@/lib/utils'
import type { MyTopStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface TopDateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  status: MyTopStatus | null | undefined
  defaultDate?: string | null
  pending?: boolean
  onConfirm: (date: string) => void
}

/**
 * Date choice shown when marking a Top-3 task: Today always, plus the last
 * working date (e.g. Saturday when today is Monday) — but the last date is
 * only shown while its Top-3 set is still incomplete (< min required).
 */
export function TopDateDialog({
  open,
  onOpenChange,
  task,
  status,
  defaultDate,
  pending,
  onConfirm,
}: TopDateDialogProps) {
  const today = status?.today ?? ''
  const lastDate = status?.last_date ?? ''
  const min = status?.min_required ?? TOP_TASKS_DAILY_MIN
  const todayCount = status?.today_count ?? 0
  const lastCount = status?.last_count ?? 0
  // Last date is offered only when its 3-task set is not yet complete.
  const showLast = Boolean(lastDate && lastDate !== today && lastCount < min)

  const [picked, setPicked] = useState<string | null>(null)
  const selected = picked ?? defaultDate ?? today

  const pick = (date: string) => setPicked(date)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPicked(null)
        onOpenChange(next)
      }}
    >
      <DialogContent
        className="max-w-md"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Mark Top 3 — choose date</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <p className="text-sm text-muted-foreground">
            {task ? (
              <>
                Mark <span className="font-medium text-foreground">#{task.id} {task.title}</span> as a
                Top task for:
              </>
            ) : (
              'Choose which day this Top mark counts for:'
            )}
          </p>

          <div className="space-y-2">
            {showLast && (
              <button
                type="button"
                onClick={() => pick(lastDate)}
                aria-pressed={selected === lastDate}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                  selected === lastDate
                    ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-300'
                    : 'border-border hover:border-amber-300 hover:bg-amber-50/50',
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <History className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    Last date — {formatDate(lastDate)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Missed yesterday? Backfill here · {lastCount}/{min} marked
                  </span>
                </span>
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    selected === lastDate ? 'border-amber-500' : 'border-slate-300',
                  )}
                >
                  {selected === lastDate && <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => pick(today)}
              aria-pressed={selected === today}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                selected === today
                  ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-300'
                  : 'border-border hover:border-amber-300 hover:bg-amber-50/50',
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <CalendarDays className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  Today — {today ? formatDate(today) : 'today'}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Counts toward today's Top 3 · {todayCount}/{min} marked
                </span>
              </span>
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                  selected === today ? 'border-amber-500' : 'border-slate-300',
                )}
              >
                {selected === today && <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />}
              </span>
            </button>
          </div>

          {!showLast && lastDate && lastDate !== today && (
            <p className="text-xs text-muted-foreground">
              Last date ({formatDate(lastDate)}) already has {lastCount}/{min} Top tasks — only
              today can be marked.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(selected || today)}
            disabled={pending || !selected}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {pending ? 'Marking…' : `Mark for ${selected === lastDate ? 'last date' : 'today'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
