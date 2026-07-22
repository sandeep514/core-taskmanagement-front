import { Check, ChevronsUpDown, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from './badge'
import { Button } from './button'

export interface MultiSelectOption {
  value: number
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: number[]
  onChange: (value: number[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggle = (id: number) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  const selected = options.filter((o) => value.includes(o.value))

  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between h-auto min-h-10 py-2 font-normal"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex flex-wrap gap-1 flex-1 text-left">
          {selected.length === 0 && (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {selected.map((s) => (
            <Badge key={s.value} variant="secondary" className="gap-1 pr-1">
              {s.label}
              <span
                role="button"
                className="rounded-full hover:bg-slate-300 p-0.5"
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(s.value)
                }}
              >
                <X className="h-3 w-3" />
              </span>
            </Badge>
          ))}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-56 overflow-y-auto p-1">
            {options.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No options</p>
            )}
            {options.map((opt) => {
              const checked = value.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent text-left',
                    checked && 'bg-accent/60',
                  )}
                  onClick={() => toggle(opt.value)}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border',
                      checked ? 'bg-primary border-primary text-white' : 'border-input',
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
