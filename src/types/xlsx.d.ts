/**
 * Ambient module types for SheetJS (xlsx).
 * Ensures TypeScript resolves the package even when node_modules
 * type discovery fails under bundler moduleResolution.
 */
declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[]
    Sheets: Record<string, WorkSheet>
  }

  export interface WorkSheet {
    [cell: string]: unknown
    '!cols'?: Array<{ wch?: number; wpx?: number }>
    '!ref'?: string
  }

  export interface WritingOptions {
    bookType?: 'xlsx' | 'xls' | 'csv' | string
    type?: 'base64' | 'binary' | 'buffer' | 'file' | 'array' | 'string'
    cellStyles?: boolean
  }

  export interface Utils {
    json_to_sheet: <T extends object>(
      data: T[],
      opts?: { header?: string[]; skipHeader?: boolean },
    ) => WorkSheet
    book_new: () => WorkBook
    book_append_sheet: (workbook: WorkBook, worksheet: WorkSheet, name?: string) => void
    sheet_to_json: <T = unknown>(worksheet: WorkSheet, opts?: object) => T[]
  }

  export const utils: Utils
  export function writeFile(workbook: WorkBook, filename: string, opts?: WritingOptions): void
  export function write(workbook: WorkBook, opts?: WritingOptions): unknown
  export function read(data: unknown, opts?: object): WorkBook
  export function readFile(filename: string, opts?: object): WorkBook

  const XLSX: {
    utils: Utils
    writeFile: typeof writeFile
    write: typeof write
    read: typeof read
    readFile: typeof readFile
  }

  export default XLSX
}
