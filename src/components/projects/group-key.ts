import type { Project } from '@/types'

export function groupKey(p: Project) {
  return p.client ? String(p.client.id) : 'none'
}
