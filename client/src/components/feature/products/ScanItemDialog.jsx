import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BRAND } from '@/lib/constants'

export function ScanItemDialog({ open, onOpenChange, loading = false, onScan, onOpenProduct }) {
  const [barcode, setBarcode] = useState('')
  const [error, setError] = useState(null)
  const [found, setFound] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (String(barcode).trim().length < 4) {
      setError('Enter at least 4 characters')
      return
    }
    setError(null)
    setFound(null)
    const result = await onScan?.(String(barcode).trim())
    if (result?.success) {
      setFound(result.data)
    } else {
      setError(result?.error || 'No item found')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setBarcode('')
          setFound(null)
          setError(null)
        }
        onOpenChange?.(next)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan item</DialogTitle>
          <DialogDescription>Look up a product by barcode.</DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="scan-barcode">Barcode</Label>
            <Input
              id="scan-barcode"
              value={barcode}
              autoFocus
              placeholder="Scan or type barcode"
              onChange={(event) => setBarcode(event.target.value)}
            />
          </div>

          {found ? (
            <div className="rounded-xl border border-border bg-slate-50 px-3 py-3 text-sm">
              <p className="font-semibold text-slate-900">{found.name}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {found.itemCode} · {found.barcode}
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3 cursor-pointer text-white"
                style={{ background: BRAND.purple }}
                onClick={() => {
                  onOpenProduct?.(found)
                  onOpenChange?.(false)
                }}
              >
                Open / edit
              </Button>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => onOpenChange?.(false)}
            >
              Close
            </Button>
            <Button
              type="submit"
              className="cursor-pointer text-white"
              style={{ background: BRAND.purple }}
              loading={loading}
            >
              Scan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
