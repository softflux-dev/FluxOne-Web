import { useEffect, useRef, useState } from 'react'
import { Printer, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ProductCatalogFilters } from '@/components/shared/ProductCatalogFilters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableActionsHead,
  TableActionsCell,
  TablePagination,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useClientPagination } from '@/hooks/useClientPagination'
import { BRAND } from '@/lib/constants'
import { formatDateTime } from '@/lib/formatDateTime'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { toastError, toastSuccess } from '@/lib/toast'
import { CATEGORY_ACTIVE_QUERY } from '@/lib/productCatalogCache'
import { filterActiveCategories } from '@/lib/mapProduct'
import { useCurrency } from '@/hooks/useCurrency'

export function SalesPage() {
  const { format, currency: tenantCurrency } = useCurrency()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pagedSales,
  } = useClientPagination(sales)

  // Filters — search debounced; catalog cascade is instant
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery, 300)
  const [filterDate, setFilterDate] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSubcategory, setFilterSubcategory] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterVariantType, setFilterVariantType] = useState('')
  const [filterVariantValue, setFilterVariantValue] = useState('')
  const fetchSeq = useRef(0)

  const [refundTarget, setRefundTarget] = useState(null)
  const [refunding, setRefunding] = useState(false)
  const [invoiceTarget, setInvoiceTarget] = useState(null)

  const fetchSales = async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    const params = {}
    if (debouncedQ.trim()) params.q = debouncedQ.trim()
    if (filterDate) params.date = filterDate
    if (filterCategory) params.categoryId = filterCategory
    if (filterSubcategory) params.subcategoryId = filterSubcategory
    if (filterProduct) params.productId = filterProduct
    // Sales list may ignore axes; cascade still scopes productId above.
    if (filterVariantType) params.variantTypeId = filterVariantType
    if (filterVariantValue) params.variantValueId = filterVariantValue

    const res = await apiClient.get(endpoints.branch.sales.list, params)
    if (seq !== fetchSeq.current) return

    setLoading(false)
    if (res.success && res.data) {
      let items = res.data.items || []
      // Client-side axis filter when API has no variant type/value support.
      if (filterVariantType || filterVariantValue) {
        items = items.filter((sale) => {
          const parts = sale.parts || sale.variantParts || []
          if (!parts.length) return !filterVariantType && !filterVariantValue
          const typeOk =
            !filterVariantType ||
            parts.some(
              (p) => (p.variantTypeId || p.typeId) === filterVariantType,
            )
          const valueOk =
            !filterVariantValue ||
            parts.some(
              (p) => (p.variantValueId || p.valueId) === filterVariantValue,
            )
          return typeOk && valueOk
        })
      }
      setSales(items)
    }
  }

  const fetchCategories = async () => {
    const res = await apiClient.get('/inventory/products/categories', CATEGORY_ACTIVE_QUERY)
    if (res.success && res.data) {
      setCategories(filterActiveCategories(res.data || []))
    }
  }

  useEffect(() => {
    void fetchSales()
  }, [
    debouncedQ,
    filterDate,
    filterCategory,
    filterSubcategory,
    filterProduct,
    filterVariantType,
    filterVariantValue,
  ])

  useEffect(() => {
    void fetchCategories()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [
    debouncedQ,
    filterDate,
    filterCategory,
    filterSubcategory,
    filterProduct,
    filterVariantType,
    filterVariantValue,
  ])

  const handleCatalogChange = (patch = {}) => {
    if ('categoryId' in patch) setFilterCategory(patch.categoryId || '')
    if ('subcategoryId' in patch) setFilterSubcategory(patch.subcategoryId || '')
    if ('productId' in patch) setFilterProduct(patch.productId || '')
    if ('variantTypeId' in patch) setFilterVariantType(patch.variantTypeId || '')
    if ('variantValueId' in patch) setFilterVariantValue(patch.variantValueId || '')
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterDate('')
    setFilterCategory('')
    setFilterSubcategory('')
    setFilterProduct('')
    setFilterVariantType('')
    setFilterVariantValue('')
  }

  const handleRefund = async () => {
    if (!refundTarget) return
    setRefunding(true)
    const res = await apiClient.post(endpoints.branch.sales.refund(refundTarget.id))
    setRefunding(false)
    if (res.success) {
      toastSuccess('Sale refunded successfully')
      setRefundTarget(null)
      void fetchSales()
    } else {
      toastError(res.error || 'Failed to refund sale')
    }
  }

  const handlePrint = (sale) => {
    setInvoiceTarget(sale)
    setTimeout(() => {
      window.print()
    }, 500)
  }

  const money = (val, cur) => format(val, cur || tenantCurrency)

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Transactions"
          title="Sales Management"
          description="Transactions, refunds, and invoice print. Online customer management is Phase 2."
        />
      </MotionHeader>

      <MotionReveal delay={0.04}>
        <ProductCatalogFilters
          searchId="sales-search"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search sale ID (SAL-INV-… or INV-…)"
          showDate
          dateId="sales-date"
          dateValue={filterDate}
          onDateChange={setFilterDate}
          categories={categories}
          categoryId={filterCategory}
          subcategoryId={filterSubcategory}
          productId={filterProduct}
          variantTypeId={filterVariantType}
          variantValueId={filterVariantValue}
          onChange={handleCatalogChange}
          onClear={handleClearFilters}
        />
      </MotionReveal>

      <MotionReveal delay={0.06}>
        <SurfaceCard
          title="Sales Transactions"
          description="POS and register transactions history"
          className="min-h-[400px]"
        >
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading transactions...</p>
          ) : sales.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No transactions found</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {pagedSales.map((sale) => {
                  const soldItems = (sale.items || []).filter((i) => !i.isExchange)
                  const exchangeItems = (sale.items || []).filter((i) => i.isExchange)
                  const indexStr = String(sale.saleNumber || sale.id.slice(0, 4))
                  const salId = `SAL-${indexStr}`
                  const soldAtLabel = formatDateTime(sale.soldAt)

                  return (
                    <article
                      key={sale.id}
                      className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-purple-800 select-all">
                            {salId}
                          </span>
                          <p className="mt-1 text-xs text-slate-500">{soldAtLabel}</p>
                        </div>
                        {sale.status === 'refunded' ? (
                          <Badge
                            variant="destructive"
                            className="rounded border-none bg-rose-50 font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Refunded
                          </Badge>
                        ) : null}
                      </div>

                      <p
                        className="mt-2 truncate text-sm text-slate-700"
                        title={soldItems.map((i) => i.name).join(', ')}
                      >
                        {soldItems.map((i) => i.name).join(', ') || '—'}
                      </p>
                      {exchangeItems.length > 0 ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          Exchange: {exchangeItems.map((i) => i.name).join(', ')}
                        </p>
                      ) : null}

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400">Final</span>
                          <p className="font-bold text-slate-900">
                            {money(sale.finalAmount, sale.currency)}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Paid</span>
                          <p className="font-semibold text-slate-700">
                            {money(sale.paidAmount, sale.currency)}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Tax</span>
                          <p className="text-slate-600">
                            {money(sale.tax_amount || sale.taxAmount, sale.currency)}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Discount</span>
                          <p className="text-slate-600">
                            {money(sale.discount_amount || sale.discountAmount, sale.currency)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-2">
                        {sale.status !== 'refunded' ? (
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => setRefundTarget(sale)}
                          >
                            Refund
                          </Button>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex text-slate-500 transition-colors hover:text-slate-800"
                          onClick={() => handlePrint(sale)}
                          aria-label="Print invoice"
                        >
                          <Printer className="size-4" />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[56rem]">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500">
                      <TableHead>Sale ID</TableHead>
                      <TableHead>Date / Time</TableHead>
                      <TableHead>Sale items</TableHead>
                      <TableHead className="hidden lg:table-cell">Exchange item</TableHead>
                      <TableHead className="hidden xl:table-cell">Tax</TableHead>
                      <TableHead className="hidden xl:table-cell">Discount</TableHead>
                      <TableHead>Final</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead className="hidden lg:table-cell">Return</TableHead>
                      <TableActionsHead sticky />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedSales.map((sale) => {
                      const soldItems = (sale.items || []).filter((i) => !i.isExchange)
                      const exchangeItems = (sale.items || []).filter((i) => i.isExchange)
                      const indexStr = String(sale.saleNumber || sale.id.slice(0, 4))
                      const salId = `SAL-${indexStr}`

                      return (
                        <TableRow key={sale.id} className="group">
                          <TableCell className="py-4">
                            <span className="font-mono text-xs font-bold text-purple-800 select-all">
                              {salId}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            <DateTimeLines value={sale.soldAt} />
                          </TableCell>
                          <TableCell className="text-slate-700">
                            <div
                              className="max-w-[200px] truncate"
                              title={soldItems.map((i) => i.name).join(', ')}
                            >
                              {soldItems.map((i) => i.name).join(', ') || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-slate-500 lg:table-cell">
                            {exchangeItems.map((i) => i.name).join(', ') || '—'}
                          </TableCell>
                          <TableCell className="hidden text-slate-600 xl:table-cell">
                            {money(sale.tax_amount || sale.taxAmount, sale.currency)}
                          </TableCell>
                          <TableCell className="hidden text-slate-600 xl:table-cell">
                            {money(sale.discount_amount || sale.discountAmount, sale.currency)}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900">
                            {money(sale.finalAmount, sale.currency)}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {money(sale.paidAmount, sale.currency)}
                          </TableCell>
                          <TableCell className="hidden text-slate-600 lg:table-cell">
                            {parseFloat(sale.returnAmount) > 0
                              ? `${money(sale.returnAmount, sale.currency)}`
                              : '—'}
                          </TableCell>
                          <TableActionsCell sticky>
                            {sale.status !== 'refunded' ? (
                              <Button
                                size="xs"
                                variant="outline"
                                className="h-7 border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => setRefundTarget(sale)}
                              >
                                Refund
                              </Button>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="rounded border-none bg-rose-50 font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                Refunded
                              </Badge>
                            )}
                            <button
                              type="button"
                              className="cursor-pointer text-slate-500 transition-colors hover:text-slate-800"
                              onClick={() => handlePrint(sale)}
                              aria-label="Print invoice"
                            >
                              <Printer className="size-4" />
                            </button>
                          </TableActionsCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </SurfaceCard>
      </MotionReveal>

      <Dialog
        open={Boolean(refundTarget)}
        onOpenChange={(open) => {
          if (!open) setRefundTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="size-5" />
              Approve Refund request?
            </DialogTitle>
            <DialogDescription>
              This will mark the selected invoice as **Refunded** and return the full payment amount
              back to the customer.
            </DialogDescription>
          </DialogHeader>

          {refundTarget && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1">
              <div>
                <strong>Invoice:</strong> {refundTarget.saleNumber}
              </div>
              <div>
                <strong>Amount to Refund:</strong>{' '}
                {money(refundTarget.finalAmount, refundTarget.currency)}
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogCancelButton disabled={refunding} className="w-full sm:w-auto" />
            <Button
              onClick={handleRefund}
              disabled={refunding}
              className="text-white w-full sm:w-auto"
              style={{ backgroundColor: BRAND.purple }}
            >
              {refunding ? 'Refunding…' : 'Approve Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(invoiceTarget)}
        onOpenChange={(open) => {
          if (!open) setInvoiceTarget(null)
        }}
      >
        <DialogContent className="max-w-sm p-6 bg-white font-mono text-xs border border-slate-300 rounded-none shadow-none print:p-0 print:border-none print:shadow-none">
          {invoiceTarget && (
            <div className="space-y-4">
              <div className="text-center border-b border-dashed border-slate-400 pb-3">
                <div className="text-base font-bold">SOFTWARE FLUX SOLUTION</div>
                <div>Branch Manager Terminal</div>
                <div className="text-[10px] text-slate-400">
                  Date: {formatDateTime(invoiceTarget.soldAt)}
                </div>
                <div>Invoice: {invoiceTarget.saleNumber}</div>
              </div>
              <div className="space-y-2 border-b border-dashed border-slate-400 pb-3">
                <div className="flex justify-between font-bold">
                  <span>Item Name</span>
                  <span>Total</span>
                </div>
                {(invoiceTarget.items || []).map((i) => (
                  <div key={i.id} className="flex justify-between text-slate-600">
                    <span>
                      {i.name} (x{parseInt(i.quantity)})
                    </span>
                    <span>{money(i.lineTotal, invoiceTarget.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{money(invoiceTarget.subtotal, invoiceTarget.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Amount</span>
                  <span>
                    {money(invoiceTarget.tax_amount || invoiceTarget.taxAmount, invoiceTarget.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>
                    -{' '}
                    {money(
                      invoiceTarget.discount_amount || invoiceTarget.discountAmount,
                      invoiceTarget.currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-dashed border-slate-400 pt-2">
                  <span>FINAL TOTAL</span>
                  <span>{money(invoiceTarget.finalAmount, invoiceTarget.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Paid amount</span>
                  <span>{money(invoiceTarget.paidAmount, invoiceTarget.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Return Amount</span>
                  <span>{money(invoiceTarget.returnAmount, invoiceTarget.currency)}</span>
                </div>
              </div>
              <div className="text-center text-[10px] border-t border-dashed border-slate-400 pt-3">
                Thank you for your business!
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SalesPage
