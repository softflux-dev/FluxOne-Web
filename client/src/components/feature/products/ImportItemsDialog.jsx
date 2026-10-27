import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { BRAND } from '@/lib/constants'
import { downloadTextFile, productCsvTemplate } from '@/lib/productCsv'
import { parseProductsImport } from '@/lib/productImport'
import { useFormBaseline } from '@/hooks/useFormBaseline'

function isExcelFile(file) {
  const name = String(file?.name || '').toLowerCase()
  return name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.html')
}

// Import products from Excel export (.xls), CSV, or pasted text.
export function ImportItemsDialog({ open, onOpenChange, loading = false, onSubmit }) {
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef(null)
  const { captureBaseline, isDirty } = useFormBaseline(open)

  useEffect(() => {
    if (!open) return
    setText('')
    setFileName('')
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
    captureBaseline({ text: '', fileName: '' })
  }, [open, captureBaseline])

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setText(String(reader.result || ''))
    }
    reader.onerror = () => setError('Could not read import file')
    reader.readAsText(file)
  }

  function handleDownloadTemplate() {
    downloadTextFile('fluxone-products-template.csv', productCsvTemplate())
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const rows = parseProductsImport(text)
    if (!rows.length) {
      setError(
        'No valid rows. Need Product Name (and Parent/Component Ref for variants & bundles). Download the template or use Export.',
      )
      return
    }
    setError(null)
    try {
      const result = await onSubmit?.(rows)
      if (result?.success) {
        setText('')
        setFileName('')
        if (fileRef.current) fileRef.current.value = ''
        onOpenChange?.(false)
      } else {
        setError(result?.error || 'Import failed. Please try again.')
      }
    } catch (err) {
      setError(err?.message || 'Import failed. Please try again.')
    }
  }

  const previewHint = fileName
    ? isExcelFile({ name: fileName })
      ? 'Excel export loaded — ready to import'
      : 'CSV loaded — ready to import'
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty({ text, fileName })}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import products</DialogTitle>
          <DialogDescription>
            Upload the Excel export (.xls) or CSV. Every row creates a new product (new ID + item
            code). Item codes are not read from the file. Use Import Ref / Parent Ref / Component Ref
            to link variants and bundles. Categories are matched by name.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={handleDownloadTemplate}
            >
              Download CSV template
            </Button>
            <Label
              htmlFor="import-csv-file"
              className="inline-flex cursor-pointer items-center rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Choose Excel / CSV
            </Label>
            <input
              ref={fileRef}
              id="import-csv-file"
              type="file"
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel"
              className="sr-only"
              onChange={handleFileChange}
            />
            {fileName ? (
              <span className="text-xs text-slate-500">{fileName}</span>
            ) : null}
          </div>

          {previewHint ? (
            <p className="text-xs text-slate-500">{previewHint}</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="import-rows">File content (optional paste)</Label>
            <Textarea
              id="import-rows"
              className="min-h-40 font-mono text-xs"
              placeholder={
                'Paste CSV rows, or choose the .xls file from Export.\nProduct Name, SKU / Item Code, …'
              }
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                setFileName('')
              }}
            />
          </div>
          <DialogFooter>
            <DialogCancelButton className="cursor-pointer" />
            <Button
              type="submit"
              className="cursor-pointer text-white"
              style={{ background: BRAND.purple }}
              loading={loading}
            >
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
