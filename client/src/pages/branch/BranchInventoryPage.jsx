import { useEffect, useRef, useState } from 'react'
import { Send, Settings2 } from 'lucide-react'
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
  TablePagination,
} from '@/components/ui/table'
import { apiClient } from '@/api/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useClientPagination } from '@/hooks/useClientPagination'
import { displayItemCode } from '@/lib/formatDisplayId'
import { CategoryLines } from '@/components/shared/CategoryLines'
import { TruncatedText } from '@/components/shared/TruncatedText'
import { CATEGORY_ACTIVE_QUERY } from '@/lib/productCatalogCache'
import { filterActiveCategories } from '@/lib/mapProduct'
import { getShelfStockStatus } from '@/lib/shelfStockStatus'
import { StockControlPriceDialog } from '@/components/feature/branch/inventory/StockControlPriceDialog'
import { StockRequestDialog } from '@/components/feature/branch/inventory/StockRequestDialog'
import { BranchVariantStockDialog } from '@/components/feature/branch/inventory/BranchVariantStockDialog'
import {
  isVariantParent,
  ShelfStockCell,
} from '@/components/feature/branch/inventory/ShelfStockCell'

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

  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery, 300)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSubcategory, setFilterSubcategory] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterVariantType, setFilterVariantType] = useState('')
  const [filterVariantValue, setFilterVariantValue] = useState('')
  const fetchSeq = useRef(0)

  const subcategories = categories.filter((c) => !!c.parentId)

  const [priceRuleOpen, setPriceRuleOpen] = useState(false)
  const [variantsTarget, setVariantsTarget] = useState(null)
  const [requestTarget, setRequestTarget] = useState(null)

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

  function openStockRequest(target) {
    if (!target?.id) return
    setRequestTarget(target)
  }

  function handleVariantStockRequest(target) {
    setVariantsTarget(null)
    openStockRequest(target)
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

      <MotionReveal delay={0.04}>
        <SurfaceCard title="Shelf Stock Levels" className="min-h-[400px]">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading shelf stock...</p>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No stock products found</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {pagedProducts.map((prod) => {
                  const variantParent = isVariantParent(prod)
                  const status = variantParent
                    ? null
                    : getShelfStockStatus(prod.quantity, prod.reorderPoint)
                  const cat = categories.find((c) => c.id === prod.categoryId)?.name || '—'
                  const subcat =
                    subcategories.find((s) => s.id === prod.subcategoryId)?.name || '—'

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
                              <TruncatedText
                                text={prod.name}
                                maxChars={10}
                                className="text-sm font-bold text-slate-900"
                              />
                              <p className="font-mono text-[11px] text-slate-400">
                                Item code: {displayItemCode(prod)}
                              </p>
                            </div>
                            {status ? (
                              <Badge
                                variant={status.variant}
                                className={`shrink-0 ${status.className}`}
                              >
                                {status.label}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-violet-200 bg-violet-50 text-violet-700"
                              >
                                Variant
                              </Badge>
                            )}
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
                          <div className="mt-2">
                            <ShelfStockCell
                              product={prod}
                              onViewVariants={setVariantsTarget}
                            />
                          </div>
                          {!variantParent ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openStockRequest(prod)}
                              className="mt-3 h-8 w-full text-xs sm:w-auto"
                            >
                              <Send className="mr-1.5 size-3" />
                              Stock Request
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="w-full min-w-[44rem] table-fixed text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="w-14 px-2 py-3 whitespace-nowrap">Image</TableHead>
                      <TableHead className="w-[10rem] px-2 py-3 whitespace-nowrap">Name</TableHead>
                      <TableHead className="px-2 py-3 whitespace-nowrap">Category</TableHead>
                      <TableHead className="w-[9rem] px-2 py-3 whitespace-nowrap">In Stock</TableHead>
                      <TableHead className="w-[7rem] px-2 py-3 whitespace-nowrap">Status</TableHead>
                      <TableHead className="w-[9rem] px-2 py-3 whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedProducts.map((prod) => {
                      const variantParent = isVariantParent(prod)
                      const status = variantParent
                        ? null
                        : getShelfStockStatus(prod.quantity, prod.reorderPoint)
                      const cat = categories.find((c) => c.id === prod.categoryId)?.name || '—'
                      const subcat =
                        subcategories.find((s) => s.id === prod.subcategoryId)?.name || '—'

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
                          <TableCell className="max-w-[10rem] overflow-hidden px-2 py-3">
                            <TruncatedText
                              text={prod.name}
                              maxChars={10}
                              className="font-bold text-slate-900"
                            />
                            <div className="truncate font-mono text-[10px] text-slate-400">
                              Item code: {displayItemCode(prod)}
                            </div>
                          </TableCell>
                          <TableCell className="overflow-hidden px-2 py-3 text-slate-600">
                            <CategoryLines
                              category={cat !== '—' ? cat : ''}
                              subcategory={subcat !== '—' ? subcat : ''}
                              emptyLabel="—"
                            />
                          </TableCell>
                          <TableCell className="px-2 py-3">
                            <ShelfStockCell
                              product={prod}
                              onViewVariants={setVariantsTarget}
                            />
                          </TableCell>
                          <TableCell className="px-2 py-3">
                            {status ? (
                              <Badge variant={status.variant} className={status.className}>
                                {status.label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-3">
                            {variantParent ? (
                              <span className="text-xs text-slate-400">Via variants</span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openStockRequest(prod)}
                                className="h-8 text-xs"
                              >
                                <Send className="mr-1.5 size-3" />
                                Stock Request
                              </Button>
                            )}
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
              <span className="size-2 shrink-0 rounded-full bg-rose-500" /> Empty: Out of stock (0
              items)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-amber-500" /> Limited: Under reorder
              point threshold
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-emerald-500" /> In Stock: Adequate
              supplies
            </span>
          </div>
        </SurfaceCard>
      </MotionReveal>

      <BranchVariantStockDialog
        open={Boolean(variantsTarget)}
        product={variantsTarget}
        onOpenChange={(open) => {
          if (!open) setVariantsTarget(null)
        }}
        onStockRequest={handleVariantStockRequest}
      />

      <StockRequestDialog
        open={Boolean(requestTarget)}
        target={requestTarget}
        onOpenChange={(open) => {
          if (!open) setRequestTarget(null)
        }}
      />
    </div>
  )
}

export default BranchInventoryPage
