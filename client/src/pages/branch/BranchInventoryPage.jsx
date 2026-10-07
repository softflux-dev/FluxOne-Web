import { useEffect, useRef, useState } from 'react'
import { Send, Settings2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ProductCatalogFilters } from '@/components/shared/ProductCatalogFilters'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogCancelButton } from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useClientPagination } from '@/hooks/useClientPagination'
import { BRAND } from '@/lib/constants'
import { formatMoney } from '@/lib/currency'
import { displayItemCode } from '@/lib/formatDisplayId'
import { CategoryLines } from '@/components/shared/CategoryLines'
import { toastError, toastSuccess } from '@/lib/toast'
import { CATEGORY_ACTIVE_QUERY } from '@/lib/productCatalogCache'
import { filterActiveCategories } from '@/lib/mapProduct'
import { StockControlPriceDialog } from '@/components/feature/branch/inventory/StockControlPriceDialog'

export function BranchInventoryPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pagedProducts,
  } = useClientPagination(products)

  // Filters — search debounced; catalog cascade instant
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery, 300)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSubcategory, setFilterSubcategory] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterVariantType, setFilterVariantType] = useState('')
  const [filterVariantValue, setFilterVariantValue] = useState('')
  const fetchSeq = useRef(0)

  // Subcategories live in the same categories list (rows with parentId)
  const subcategories = categories.filter((c) => !!c.parentId)

  // Stock request dialog state
  const [priceRuleOpen, setPriceRuleOpen] = useState(false)
  const [requestTarget, setRequestTarget] = useState(null)
  const [requiredQty, setRequiredQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const fetchInventory = async () => {
    const seq = ++fetchSeq.current
    setLoading(true)

    const params = { limit: 100, status: 'active' }
    if (debouncedQ.trim()) params.q = debouncedQ.trim()
    if (filterCategory) params.categoryId = filterCategory
    if (filterSubcategory) params.subcategoryId = filterSubcategory
    if (filterProduct) params.productId = filterProduct
    if (filterVariantType) params.variantTypeId = filterVariantType
    if (filterVariantValue) params.variantValueId = filterVariantValue

    const res = await apiClient.get('/inventory/products', params)
    if (seq !== fetchSeq.current) return

    setLoading(false)
    if (res.success && res.data) {
      setProducts(res.data.items || res.data || [])
    }
  }

  const fetchCategories = async () => {
    const res = await apiClient.get('/inventory/products/categories', CATEGORY_ACTIVE_QUERY)
    if (res.success && res.data) {
      setCategories(filterActiveCategories(res.data || []))
    }
  }

  useEffect(() => {
    void fetchInventory()
  }, [
    debouncedQ,
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
    setFilterCategory('')
    setFilterSubcategory('')
    setFilterProduct('')
    setFilterVariantType('')
    setFilterVariantValue('')
  }

  // Open dialog — suggest qty as gap to reorder point (min 1)
  const handleOpenRequest = (prod) => {
    setRequestTarget(prod)
    const current = Math.max(0, Math.floor(Number(prod.quantity) || 0))
    const reorder = Math.max(0, Math.ceil(Number(prod.reorderPoint) || 0))
    setRequiredQty(Math.max(1, reorder > current ? reorder - current : 1))
  }

  // POST stock request (kind fixed to replenishment)
  const handleSendRequest = async (e) => {
    e.preventDefault()
    if (!requestTarget) return

    const qty = Math.floor(Number(requiredQty))
    if (!Number.isFinite(qty) || qty < 1) {
      toastError('Required quantity must be a whole number of at least 1')
      return
    }

    setSubmitting(true)
    const res = await apiClient.post('/branch/stock-requests', {
      productId: requestTarget.id,
      kind: 'request',
      remainingQuantity: qty,
    })
    setSubmitting(false)

    if (res.success) {
      toastSuccess('Stock request sent to Inventory Management successfully')
      setRequestTarget(null)
    } else {
      toastError(res.error || 'Failed to send stock request')
    }
  }

  // Resolve optional product price (final → selling); hide when missing / zero
  const resolveProductPrice = (prod) => {
    if (!prod) return null
    const price = Number(prod.finalPrice ?? prod.sellingPrice ?? 0)
    return Number.isFinite(price) && price > 0 ? price : null
  }

  const requestProductPrice = resolveProductPrice(requestTarget)

  // Stock Level Status Indicators mapped to Shadcn Badge variants
  const getStockStatus = (qty, reorderPoint) => {
    const num = parseFloat(qty || 0)
    const point = parseFloat(reorderPoint || 10)
    if (num === 0) {
      return {
        label: 'Empty',
        variant: 'destructive',
        className: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-none px-2.5 py-0.5',
      }
    }
    if (num <= point) {
      return {
        label: 'Limited',
        variant: 'warning',
        className: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-none px-2.5 py-0.5',
      }
    }
    return {
      label: 'In Stock',
      variant: 'success',
      className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-0.5',
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Inventory"
          title="Inventory Monitoring"
          description="Monitor real-time shelf stock levels and manage price settings for new stock."
          actions={
            <Button type="button" variant="outline" onClick={() => setPriceRuleOpen(true)}>
              <Settings2 className="size-4" />
              Stock Control Price
            </Button>
          }
        />
      </MotionHeader>

      <StockControlPriceDialog open={priceRuleOpen} onOpenChange={setPriceRuleOpen} />

      {/* Category → Sub → Product → Variant type → Variant value → Reset */}
      <MotionReveal delay={0.02}>
        <ProductCatalogFilters
          searchId="stock-search"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Item name or item code…"
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

      {/* Grid List using Shadcn Table component */}
      <MotionReveal delay={0.04}>
        <SurfaceCard
          title="Shelf Stock Levels"
          className="min-h-[400px]"
        >
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading shelf stock...</p>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No stock products found</p>
          ) : (
            <>
              {/* Mobile cards — table-fixed was crushing columns on narrow screens */}
              <div className="space-y-3 md:hidden">
                {pagedProducts.map((prod) => {
                  const status = getStockStatus(prod.quantity, prod.reorderPoint)
                  const cat = categories.find((c) => c.id === prod.categoryId)?.name || '—'
                  const subcat = subcategories.find((s) => s.id === prod.subcategoryId)?.name || '—'

                  return (
                    <article
                      key={prod.id}
                      className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                    >
                      <div className="flex items-start gap-3">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="size-12 shrink-0 rounded-lg border border-slate-100 object-cover"
                          />
                        ) : (
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                            N/A
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">{prod.name}</p>
                              <p className="font-mono text-[11px] text-slate-400">
                                Item code: {displayItemCode(prod)}
                              </p>
                            </div>
                            <Badge variant={status.variant} className={`shrink-0 ${status.className}`}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="mt-1.5 text-xs text-slate-500">
                            <CategoryLines
                              category={cat !== '—' ? cat : ''}
                              subcategory={subcat !== '—' ? subcat : ''}
                              emptyLabel="—"
                              categoryClassName="font-medium text-slate-600"
                              subcategoryClassName="text-[11px] text-slate-400"
                            />
                          </div>
                          <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                            {parseFloat(prod.quantity || 0).toLocaleString()}{' '}
                            <span className="text-[10px] font-normal text-slate-400">
                              {prod.scale || 'pcs'}
                            </span>
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenRequest(prod)}
                            className="mt-3 h-8 w-full text-xs sm:w-auto"
                          >
                            <Send className="mr-1.5 size-3" />
                            Stock Request
                          </Button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[44rem] w-full text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="px-2 py-3 whitespace-nowrap">Image</TableHead>
                      <TableHead className="px-2 py-3 whitespace-nowrap min-w-[10rem]">Name</TableHead>
                      <TableHead className="px-2 py-3 whitespace-nowrap min-w-[8rem]">
                        Category
                      </TableHead>
                      <TableHead className="px-2 py-3 whitespace-nowrap">In Stock</TableHead>
                      <TableHead className="px-2 py-3 whitespace-nowrap">Status</TableHead>
                      <TableHead className="sticky right-0 z-[1] bg-slate-200/80 px-2 py-3 whitespace-nowrap">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedProducts.map((prod) => {
                      const status = getStockStatus(prod.quantity, prod.reorderPoint)
                      const cat = categories.find((c) => c.id === prod.categoryId)?.name || '—'
                      const subcat = subcategories.find((s) => s.id === prod.subcategoryId)?.name || '—'

                      return (
                        <TableRow key={prod.id} className="group">
                          <TableCell className="px-2 py-3">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="size-10 rounded-lg border border-slate-100 object-cover"
                              />
                            ) : (
                              <div className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                                N/A
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-3">
                            <div className="font-bold text-slate-900">{prod.name}</div>
                            <div className="font-mono text-[10px] text-slate-400">
                              Item code: {displayItemCode(prod)}
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-3 text-slate-600">
                            <CategoryLines
                              category={cat !== '—' ? cat : ''}
                              subcategory={subcat !== '—' ? subcat : ''}
                              emptyLabel="—"
                            />
                          </TableCell>
                          <TableCell className="px-2 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {parseFloat(prod.quantity || 0).toLocaleString()}{' '}
                            <span className="text-[10px] font-normal text-slate-400">
                              {prod.scale || 'pcs'}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-3">
                            <Badge variant={status.variant} className={status.className}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="sticky right-0 z-[1] bg-white px-2 py-3 group-hover:bg-slate-50/80">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenRequest(prod)}
                              className="h-8 text-xs"
                            >
                              <Send className="mr-1.5 size-3" />
                              Stock Request
                            </Button>
                          </TableCell>
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

          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:gap-4">
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-rose-500" /> Empty: Out of stock (0 items)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-amber-500" /> Limited: Under reorder point threshold
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-emerald-500" /> In Stock: Adequate supplies
            </span>
          </div>
        </SurfaceCard>
      </MotionReveal>

      {/* Send Stock Report dialog */}
      <Dialog open={Boolean(requestTarget)} onOpenChange={(open) => { if (!open) setRequestTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Stock Report</DialogTitle>
            <DialogDescription>
              Request replenishment from Inventory Management for this shelf item.
            </DialogDescription>
          </DialogHeader>

          {requestTarget ? (
            <form className="space-y-4" onSubmit={handleSendRequest}>
              {/* Product summary */}
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="shrink-0 text-slate-500">Product</span>
                  <span className="text-right font-medium text-slate-900">{requestTarget.name}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="shrink-0 text-slate-500">Current Stock</span>
                  <span className="text-right font-mono font-medium text-slate-900">
                    {parseFloat(requestTarget.quantity || 0).toLocaleString()}{' '}
                    <span className="font-sans text-xs font-normal text-slate-400">
                      {requestTarget.scale || 'pcs'}
                    </span>
                  </span>
                </div>
                {/* Product Price — only when available */}
                {requestProductPrice != null ? (
                  <div className="flex items-start justify-between gap-3">
                    <span className="shrink-0 text-slate-500">Product Price</span>
                    <span className="text-right font-medium text-slate-900">
                      {formatMoney(requestProductPrice)}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Required quantity only */}
              <div className="space-y-1.5">
                <Label htmlFor="request-qty">Required Quantity</Label>
                <WholeNumberInput
                  id="request-qty"
                  min={1}
                  value={requiredQty}
                  onChange={(e) => setRequiredQty(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>

              <DialogFooter>
                <DialogCancelButton disabled={submitting} className="w-full sm:w-auto" />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-white sm:w-auto"
                  style={{ backgroundColor: BRAND.purple }}
                >
                  {submitting ? 'Sending…' : 'Send Request'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default BranchInventoryPage
