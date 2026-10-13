import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { ProductCatalogFilters } from '@/components/shared/ProductCatalogFilters'
import { SalesTable } from '@/components/feature/branch/sales/SalesTable'
import { Button } from '@/components/ui/button'
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
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
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
    if (filterFrom) params.from = filterFrom
    if (filterTo) params.to = filterTo
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
            parts.some((p) => (p.variantTypeId || p.typeId) === filterVariantType)
          const valueOk =
            !filterVariantValue ||
            parts.some((p) => (p.variantValueId || p.valueId) === filterVariantValue)
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
    filterFrom,
    filterTo,
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
    filterFrom,
    filterTo,
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
    if ('from' in patch) setFilterFrom(patch.from || '')
    if ('to' in patch) setFilterTo(patch.to || '')
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterFrom('')
    setFilterTo('')
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
          showDates
          from={filterFrom}
          to={filterTo}
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
        <SalesTable
          items={pagedSales}
          loading={loading}
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onRefund={setRefundTarget}
          onPrint={handlePrint}
          filterFrom={filterFrom}
          filterTo={filterTo}
        />
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
            <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
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
              className="w-full text-white sm:w-auto"
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
        <DialogContent className="max-w-sm rounded-none border border-slate-300 bg-white p-6 font-mono text-xs shadow-none print:border-none print:p-0 print:shadow-none">
          {invoiceTarget && (
            <div className="space-y-4">
              <div className="border-b border-dashed border-slate-400 pb-3 text-center">
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
                    {money(
                      invoiceTarget.tax_amount || invoiceTarget.taxAmount,
                      invoiceTarget.currency,
                    )}
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
                <div className="flex justify-between border-t border-dashed border-slate-400 pt-2 text-sm font-bold">
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
              <div className="border-t border-dashed border-slate-400 pt-3 text-center text-[10px]">
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
