// TL §10 — per-supplier invoices on order detail (IM + BM)
// QA Bug 5 — Send removed; PDF + Excel download/export retained
import { useCallback, useEffect, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import {
  canDownloadPurchaseOrderInvoices,
  downloadPurchaseOrderInvoicePdf,
  exportPurchaseOrderInvoiceItemsExcel,
  exportPurchaseOrderInvoicesWorkbook,
} from '@/lib/purchaseOrderInvoiceExport'
import { toastError, toastSuccess } from '@/lib/toast'

async function fetchInvoiceDetail(orderId, invoiceId) {
  const result = await apiClient.get(endpoints.orders.invoiceDetail(orderId, invoiceId))
  if (!result.success) throw new Error(result.error || 'Failed to load invoice')
  return result.data
}

export function OrderInvoicesSection({ order, busy = false, onBusyChange }) {
  const orderId = order?.id
  const status = order?.status
  const show = Boolean(orderId && canDownloadPurchaseOrderInvoices(status))

  const [loading, setLoading] = useState(false)
  const [actionKey, setActionKey] = useState('')
  const [bundle, setBundle] = useState(null)
  const [error, setError] = useState('')

  const setBusy = useCallback(
    (next) => {
      onBusyChange?.(Boolean(next))
    },
    [onBusyChange],
  )

  const reload = useCallback(async () => {
    if (!orderId || !canDownloadPurchaseOrderInvoices(status)) {
      setBundle(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await apiClient.get(endpoints.orders.invoices(orderId))
      if (!result.success) {
        setError(result.error || 'Failed to load invoices')
        setBundle(null)
        return
      }
      setBundle(result.data || null)
    } catch (err) {
      setError(err?.message || 'Failed to load invoices')
      setBundle(null)
    } finally {
      setLoading(false)
    }
  }, [orderId, status])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!show) return null

  const invoices = Array.isArray(bundle?.items) ? bundle.items : []

  async function withAction(key, work) {
    if (busy || actionKey) return
    setActionKey(key)
    setBusy(true)
    try {
      await work()
    } finally {
      setActionKey('')
      setBusy(false)
    }
  }

  async function handleDownloadPdf(row) {
    await withAction(`pdf:${row.id}`, async () => {
      try {
        const detail = await fetchInvoiceDetail(orderId, row.id)
        await downloadPurchaseOrderInvoicePdf(detail)
        toastSuccess(`Downloaded ${detail.invoiceNumber || 'invoice'} PDF`)
      } catch (err) {
        toastError(err?.message || 'PDF download failed')
      }
    })
  }

  async function handleExportItems(row) {
    await withAction(`xls:${row.id}`, async () => {
      try {
        const detail = await fetchInvoiceDetail(orderId, row.id)
        exportPurchaseOrderInvoiceItemsExcel(detail)
        toastSuccess(`Exported ${detail.invoiceNumber || 'invoice'} items`)
      } catch (err) {
        toastError(err?.message || 'Excel export failed')
      }
    })
  }

  async function handleExportWorkbook() {
    await withAction('workbook', async () => {
      try {
        if (!invoices.length) {
          toastError('No invoices to export')
          return
        }
        const details = []
        for (const row of invoices) {
          details.push(await fetchInvoiceDetail(orderId, row.id))
        }
        exportPurchaseOrderInvoicesWorkbook(details, {
          orderNumber: order?.orderNumber || '',
        })
        toastSuccess(`Exported ${details.length} invoice sheet(s)`)
      } catch (err) {
        toastError(err?.message || 'Workbook export failed')
      }
    })
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Supplier invoices</h3>
          <p className="text-xs text-slate-500">
            One invoice per supplier company · approved quantities locked
          </p>
        </div>
        {invoices.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            loading={actionKey === 'workbook'}
            disabled={busy || loading || (Boolean(actionKey) && actionKey !== 'workbook')}
            onClick={() => void handleExportWorkbook()}
          >
            <FileSpreadsheet className="size-3.5" />
            Export Excel workbook
          </Button>
        ) : null}
      </div>

      {loading ? (
        <TableRowsSkeleton rows={3} />
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-slate-500">
          No formal invoices yet for this order. Approve generates one invoice per supplier.
        </p>
      ) : (
        <ul className="space-y-2">
          {invoices.map((row) => {
            const pdfBusy = actionKey === `pdf:${row.id}`
            const xlsBusy = actionKey === `xls:${row.id}`
            return (
              <li
                key={row.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {row.invoiceNumber}
                    <span className="font-normal text-slate-500">
                      {' · '}
                      {row.supplier?.companyName || 'Supplier'}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Date <DateTimeLines value={row.invoiceDate} className="inline-flex" />
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    loading={pdfBusy}
                    disabled={busy || (Boolean(actionKey) && !pdfBusy)}
                    onClick={() => void handleDownloadPdf(row)}
                    title="Download PDF"
                  >
                    <Download className="size-3.5" />
                    PDF
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    loading={xlsBusy}
                    disabled={busy || (Boolean(actionKey) && !xlsBusy)}
                    onClick={() => void handleExportItems(row)}
                    title="Export items Excel"
                  >
                    <FileSpreadsheet className="size-3.5" />
                    Excel
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default OrderInvoicesSection
