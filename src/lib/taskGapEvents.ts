import type { TaskGapEvent } from '@/types'

function dayKey(value: string): string {
  return value.slice(0, 10)
}

/** Event titles that cover a calendar day, joined for display. */
export function eventTitlesOnDate(
  events: TaskGapEvent[] | undefined,
  isoDate: string | null | undefined,
): string {
  if (!events?.length || !isoDate) return ''
  const day = dayKey(isoDate)
  const titles = events
    .filter((event) => dayKey(event.from_date) <= day && dayKey(event.to_date) >= day)
    .map((event) => event.title.trim())
    .filter(Boolean)
  return [...new Set(titles)].join(', ')
}

function eachDateKey(from: string, to: string): string[] {
  const [fy, fm, fd] = dayKey(from).split('-').map(Number)
  const [ty, tm, td] = dayKey(to).split('-').map(Number)
  const start = new Date(fy, (fm || 1) - 1, fd || 1)
  const end = new Date(ty, (tm || 1) - 1, td || 1)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return []

  const days: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export interface DatedTaskRow<T> {
  date: string
  eventName: string
  tasks: T[]
}

/**
 * Task dates plus any event or holiday dates in the range.
 * A day with both keeps the tasks and the event name.
 */
export function rowsForTasksAndEvents<T>(
  entries: { date: string; tasks: T[] }[],
  events: TaskGapEvent[] | undefined,
  from: string,
  to: string,
): DatedTaskRow<T>[] {
  const tasksByDate = new Map<string, T[]>()
  for (const entry of entries) {
    const date = dayKey(entry.date)
    tasksByDate.set(date, [...(tasksByDate.get(date) ?? []), ...entry.tasks])
  }

  const dates = new Set(tasksByDate.keys())
  for (const day of eachDateKey(from, to)) {
    if (eventTitlesOnDate(events, day)) dates.add(day)
  }

  return [...dates].sort().map((date) => ({
    date,
    eventName: eventTitlesOnDate(events, date),
    tasks: tasksByDate.get(date) ?? [],
  }))
}
