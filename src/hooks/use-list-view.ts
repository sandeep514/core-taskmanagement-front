import { useState } from 'react'

export type ViewMode = 'table' | 'cards'

/** Table/cards preference, remembered per list in localStorage. */
export function useListView(storageKey: string) {
  const [view, setView] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(storageKey) === 'cards' ? 'cards' : 'table'
    } catch {
      return 'table'
    }
  })

  const changeView = (v: ViewMode) => {
    setView(v)
    try {
      localStorage.setItem(storageKey, v)
    } catch {
      /* storage unavailable */
    }
  }

  return [view, changeView] as const
}
