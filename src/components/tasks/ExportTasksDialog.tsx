import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import type { Task } from '@/types'
import {
  defaultSelectedColumnKeys,
  exportTasksToExcel,
  EXPORT_COLUMNS,
  type ExportColumnKey,
} from '@/lib/exportTasksExcel'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
interface ExportTasksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: Task[]
  /** Base file name (without .xlsx). */
  fileName?: string
  /** Optional context label shown in the dialog (e.g. project name). */
  contextLabel?: string
}

export function ExportTasksDialog({
  open,
  onOpenChange,
  tasks,
  fileName = 'tasks-export',
  contextLabel,
}: ExportTasksDialogProps) {
  const [selected, setSelected] = useState<Set<ExportColumnKey>>(
    () => new Set(defaultSelectedColumnKeys()),
  )
  const [exporting, setExporting] = useState(false)

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelected(new Set(defaultSelectedColumnKeys()))
      setExporting(false)
    }
  }, [open])

  const allKeys = useMemo(() => EXPORT_COLUMNS.map((c) => c.key), [])
  const selectedCount = selected.size
  const allSelected = selectedCount === allKeys.length

  const toggle = (key: ExportColumnKey) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(allKeys))
  const selectNone = () => setSelected(new Set())
  const selectDefaults = () => setSelected(new Set(defaultSelectedColumnKeys()))

  const handleExport = () => {
    if (!tasks.length) {
      toast.error('No tasks to export.')
      return
    }
    if (!selected.size) {
      toast.error('Select at least one column to export.')
      return
    }

    // Preserve column order from EXPORT_COLUMNS definition
    const columns = EXPORT_COLUMNS.map((c) => c.key).filter((k) => selected.has(k))

    setExporting(true)
    try {
      exportTasksToExcel({
        tasks,
        columns,
        fileName,
        sheetName: contextLabel?.slice(0, 31) || 'Tasks',
      })
      toast.success(`Exported ${tasks.length} task${tasks.length === 1 ? '' : 's'} to Excel.`)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export tasks.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Export to Excel
          </DialogTitle>
          <DialogDescription>
            Choose which columns to include. All task details are available.
            {contextLabel ? (
              <>
                {' '}
                Exporting from <span className="font-medium text-foreground">{contextLabel}</span>.
              </>
            ) : null}{' '}
            <span className="font-medium text-foreground">
              {tasks.length} task{tasks.length === 1 ? '' : 's'}
            </span>{' '}
            will be exported
            {tasks.length === 0 ? ' (nothing to export yet).' : '.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              Select all
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={selectNone}>
              Clear
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={selectDefaults}>
              Defaults
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {selectedCount} of {allKeys.length} columns
            </span>
          </div>

          <div className="grid max-h-[min(50vh,360px)] grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2">
            {EXPORT_COLUMNS.map((col) => {
              const id = `export-col-${col.key}`
              const checked = selected.has(col.key)
              return (
                <label
                  key={col.key}
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={() => toggle(col.key)}
                  />
                  <span className="leading-snug">{col.label}</span>
                </label>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {allSelected
              ? 'All columns selected — full task details will be included.'
              : 'Tip: use “Select all” for a complete export with every field.'}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={exporting || !tasks.length || selectedCount === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export Excel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Trigger button + dialog for employee/admin task exports. Hidden from clients by not rendering. */
export function ExportTasksButton({
  tasks,
  fileName,
  contextLabel,
  variant = 'outline',
  size = 'default',
  className,
}: {
  tasks: Task[]
  fileName?: string
  contextLabel?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        disabled={!tasks.length}
        title={tasks.length ? 'Export tasks to Excel' : 'No tasks to export'}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Export to Excel
      </Button>
      <ExportTasksDialog
        open={open}
        onOpenChange={setOpen}
        tasks={tasks}
        fileName={fileName}
        contextLabel={contextLabel}
      />
    </>
  )
}
