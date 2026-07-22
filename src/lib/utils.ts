import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse API dates (`Y-m-d` or ISO) safely for display. */
export function parseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null
  if (date instanceof Date) return Number.isNaN(date.getTime()) ? null : date
  // Treat date-only strings as local calendar days (avoid UTC shift)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(date: string | Date | null | undefined, fallback = '—') {
  const d = parseDate(date)
  if (!d) return fallback
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function isOverdue(date: string | null | undefined, status?: string) {
  if (!date || status === 'done') return false
  const d = parseDate(date)
  if (!d) return false
  d.setHours(23, 59, 59, 999)
  return d < new Date()
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
