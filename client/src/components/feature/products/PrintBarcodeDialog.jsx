import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/lib/constants'
import { downloadBarcodePdf } from '@/lib/pdfDownload'
import { toastError, toastSuccess } from '@/lib/toast'

export function PrintBarcodeDialog({
  open,
  onOpenChange,
  product = null,
  fetchBarcodePng,
}) {
  const [url, setUrl] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let revoked = null
    async function load() {
      if (!open || !product?.id) return
      setLoading(true)
      setError(null)
      setUrl(null)
      const result = await fetchBarcodePng?.(product.id)
      if (result?.success) {
        setUrl(result.data)
        revoked = result.data
      } else {
        setError(result?.error || 'Failed to load barcode')
      }
      setLoading(false)
    }
    load()
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [open, product?.id, fetchBarcodePng])

  async function handleDownloadPdf() {
    if (!url) return
    setDownloading(true)
    try {
      await downloadBarcodePdf({ product, pngUrl: url })
      toastSuccess('Barcode PDF downloaded')
      onOpenChange?.(false)
    } catch (err) {
      toastError(err?.message || 'PDF download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Download barcode PDF</DialogTitle>
          <DialogDescription>
            {product?.name || 'Product'} · {product?.barcode || '—'}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-border bg-slate-50 p-5">
          {loading ? (
            <div className="h-16 w-40 animate-pulse rounded bg-slate-200" />
          ) : url ? (
            <img
              src={url}
              alt="Barcode"
              className="max-h-40 max-w-full object-contain"
            />
          ) : (
            <p className="text-sm text-slate-400">No barcode preview</p>
          )}
        </div>

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
            type="button"
            className="cursor-pointer text-white"
            style={{ background: BRAND.purple }}
            disabled={!url || downloading}
            onClick={handleDownloadPdf}
          >
            {downloading ? 'Downloading…' : 'Download PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
