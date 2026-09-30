import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { EmptyState } from '@/components/shared/EmptyState'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ADMIN_TAX_PROFIT_PAGE_SIZE,
  useAdminTaxProfit,
} from '@/hooks/useAdminTaxProfit'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useCurrency } from '@/hooks/useCurrency'
import { BRAND } from '@/lib/constants'
import { toastSuccess, toastError } from '@/lib/toast'
import { validatePercentage } from '@/lib/validation/formValidators'
import { ExportCsvButton } from '@/components/shared/ExportCsvButton'
import { CategoryLines } from '@/components/shared/CategoryLines'
import { exportTaxProfitCsv, exportTaxProfitPdf } from '@/lib/taxProfitExport'
import {
  Percent,
  Calculator,
  Search,
  TrendingUp,
  Award,
  Columns,
  Loader2,
  PackageOpen,
  Settings,
  RotateCcw,
} from 'lucide-react'

const COLUMN_LABELS = {
  id: 'SKU ID',
  image: 'Image',
  name: 'Product',
  barcode: 'Barcode',
  category: 'Category',
  baseCost: 'Purchase Cost',
  profitPct: 'Profit %',
  taxPct: 'Tax %',
  finalPrice: 'Final Price',
}

export function TaxProfitPage() {
  const { currency, formatPlain } = useCurrency()
  const [selectedIds, setSelectedIds] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery.trim(), 300)
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [presetFilter, setPresetFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(ADMIN_TAX_PROFIT_PAGE_SIZE)
  const [exporting, setExporting] = useState(false)

  const [profitDialogOpen, setProfitDialogOpen] = useState(false)
  const [taxDialogOpen, setTaxDialogOpen] = useState(false)
  const [bulkProfitValue, setBulkProfitValue] = useState('20')
  const [bulkTaxValue, setBulkTaxValue] = useState('5')

  // Default Tax & Profit configuration states
  const [defaultTaxProfitDialogOpen, setDefaultTaxProfitDialogOpen] = useState(false)
  const [defaultTaxValue, setDefaultTaxValue] = useState('0')
  const [defaultProfitValue, setDefaultProfitValue] = useState('0')

  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    image: true,
    name: true,
    barcode: true,
    category: true,
    baseCost: true,
    profitPct: true,
    taxPct: true,
    finalPrice: true,
  })
  const [colMenuOpen, setColMenuOpen] = useState(false)

  useEffect(() => {
    setPage(1)
    setSelectedIds([])
  }, [
    debouncedQ,
    selectedBranchId,
    selectedCategoryId,
    selectedSubcategoryId,
    selectedProductId,
    selectedVariantId,
    presetFilter,
  ])

  const {
    items: products,
    meta,
    pagination,
    loading,
    mutating,
    error,
    updateDefaults,
    bulkSetProfit,
    bulkSetTax,
    fetchExportRows,
  } = useAdminTaxProfit({
    q: debouncedQ,
    branchId: selectedBranchId,
    categoryId: selectedCategoryId,
    subcategoryId: selectedSubcategoryId,
    productId: selectedProductId,
    variantId: selectedVariantId,
    sort: presetFilter,
    page,
    limit,
  })

  // Sync current defaults from meta
  useEffect(() => {
    if (meta?.defaults) {
      setDefaultProfitValue(String(meta.defaults.defaultProfitPercent ?? 0))
      setDefaultTaxValue(String(meta.defaults.defaultTaxPercent ?? 0))
    }
  }, [meta?.defaults])

  const slowHint = useSlowLoadingHint(loading)
  const totalCatalog = pagination.total || 0
  // Table filter bar — Clear Filters only when any table filter is active
  const hasTableFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(selectedBranchId) ||
    Boolean(selectedCategoryId) ||
    Boolean(selectedSubcategoryId) ||
    Boolean(selectedProductId) ||
    Boolean(selectedVariantId)
  const hasFilters = hasTableFilters || presetFilter !== 'all'

  const selectClass =
    'h-10 w-full min-w-[8.5rem] rounded-xl border-border bg-white text-xs font-medium text-slate-800 sm:w-40'

  // Categories are per-branch — when a branch is selected, only show that branch's categories
  const categoryOptions = useMemo(() => {
    const list = meta.categories || []
    if (!selectedBranchId) return list
    return list.filter((c) => c.branchId === selectedBranchId)
  }, [meta.categories, selectedBranchId])

  const subcategoryOptions = useMemo(() => {
    if (!selectedCategoryId) return []
    const parent = categoryOptions.find((c) => c.id === selectedCategoryId)
    const children = parent?.children || []
    if (!selectedBranchId) return children
    return children.filter((s) => !s.branchId || s.branchId === selectedBranchId)
  }, [categoryOptions, selectedCategoryId, selectedBranchId])

  // Product filter options scoped by branch / category / subcategory
  const productOptions = useMemo(() => {
    const list = meta.products || []
    return list.filter((p) => {
      if (selectedBranchId && p.branchId !== selectedBranchId) return false
      if (selectedCategoryId && p.categoryId !== selectedCategoryId) return false
      if (selectedSubcategoryId && p.subcategoryId !== selectedSubcategoryId) return false
      return true
    })
  }, [meta.products, selectedBranchId, selectedCategoryId, selectedSubcategoryId])

  const selectedProduct = useMemo(
    () => productOptions.find((p) => p.id === selectedProductId) || null,
    [productOptions, selectedProductId],
  )

  // Variant filter only when the selected product has combinations
  const variantOptions = selectedProduct?.variants?.length ? selectedProduct.variants : []
  const showVariantFilter = variantOptions.length > 0

  function handleClearTableFilters() {
    setSearchQuery('')
    setSelectedBranchId('')
    setSelectedCategoryId('')
    setSelectedSubcategoryId('')
    setSelectedProductId('')
    setSelectedVariantId('')
  }

  // Drop category/subcategory when they fall outside the selected branch
  useEffect(() => {
    if (selectedCategoryId && !categoryOptions.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId('')
      setSelectedSubcategoryId('')
      setSelectedProductId('')
      setSelectedVariantId('')
    }
  }, [categoryOptions, selectedCategoryId])

  useEffect(() => {
    if (
      selectedSubcategoryId &&
      !subcategoryOptions.some((s) => s.id === selectedSubcategoryId)
    ) {
      setSelectedSubcategoryId('')
      setSelectedProductId('')
      setSelectedVariantId('')
    }
  }, [subcategoryOptions, selectedSubcategoryId])

  // Clear product/variant when they fall out of scoped options
  useEffect(() => {
    if (selectedProductId && !productOptions.some((p) => p.id === selectedProductId)) {
      setSelectedProductId('')
      setSelectedVariantId('')
    }
  }, [productOptions, selectedProductId])

  useEffect(() => {
    if (!showVariantFilter && selectedVariantId) setSelectedVariantId('')
  }, [showVariantFilter, selectedVariantId])

  const pageIds = products.map((p) => p.id)
  const isAllSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))

  function handleToggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
      return
    }
    setSelectedIds((prev) => [...new Set([...prev, ...pageIds])])
  }

  function handleToggleRow(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  // --- Default Profit & Tax Handlers ---
  function handleOpenDefaultTaxProfit() {
    setDefaultTaxValue(String(meta?.defaults?.defaultTaxPercent ?? 0))
    setDefaultProfitValue(String(meta?.defaults?.defaultProfitPercent ?? 0))
    setDefaultTaxProfitDialogOpen(true)
  }

  async function handleSaveDefaults(e) {
    e?.preventDefault()

    const taxErr = validatePercentage(defaultTaxValue, {
      min: 0,
      max: 100,
      fieldName: 'Default tax percentage',
    })
    if (taxErr) {
      toastError(taxErr)
      return
    }

    const profitErr = validatePercentage(defaultProfitValue, {
      min: 0,
      max: 100,
      fieldName: 'Default profit percentage',
    })
    if (profitErr) {
      toastError(profitErr)
      return
    }

    const taxNum = Number(defaultTaxValue)
    const profitNum = Number(defaultProfitValue)

    const result = await updateDefaults({
      defaultTaxPercent: taxNum,
      defaultProfitPercent: profitNum,
      applyToAllProducts: false,
    })

    if (!result.success) {
      toastError(result.error || 'Failed to update default setting')
      return
    }

    toastSuccess(
      `Default Tax (${taxNum}%) and Profit (${profitNum}%) saved. This will automatically apply to newly created products.`,
    )
    setDefaultTaxProfitDialogOpen(false)
  }

  async function handleApplyBulkProfit(e) {
    e.preventDefault()
    const err = validatePercentage(bulkProfitValue, {
      min: 0,
      max: 100,
      fieldName: 'Profit percentage',
    })
    if (err) {
      toastError(err)
      return
    }
    if (selectedIds.length === 0) {
      toastError('Select at least one product')
      return
    }

    const profitNum = Number(bulkProfitValue)
    const result = await bulkSetProfit(selectedIds, profitNum)
    if (!result.success) {
      toastError(result.error || 'Failed to update profit %')
      return
    }

    toastSuccess(
      `Updated Profit to ${profitNum}% across ${result.data?.updated ?? selectedIds.length} selected items`,
    )
    setSelectedIds([])
    setProfitDialogOpen(false)
  }

  async function handleApplyBulkTax(e) {
    e.preventDefault()
    const err = validatePercentage(bulkTaxValue, {
      min: 0,
      max: 100,
      fieldName: 'Tax percentage',
    })
    if (err) {
      toastError(err)
      return
    }
    if (selectedIds.length === 0) {
      toastError('Select at least one product')
      return
    }

    const taxNum = Number(bulkTaxValue)
    const result = await bulkSetTax(selectedIds, taxNum)
    if (!result.success) {
      toastError(result.error || 'Failed to update tax %')
      return
    }

    toastSuccess(
      `Updated Tax to ${taxNum}% across ${result.data?.updated ?? selectedIds.length} selected items`,
    )
    setSelectedIds([])
    setTaxDialogOpen(false)
  }

  function calculateFinalPrice(baseCost, profitPct, taxPct) {
    const cost = Number(baseCost) || 0
    const profitAmount = (cost * (profitPct || 0)) / 100
    const subtotal = cost + profitAmount
    const taxAmount = (subtotal * (taxPct || 0)) / 100
    return Math.round((subtotal + taxAmount) * 100) / 100
  }

  async function handleExport(kind) {
    setExporting(true)
    try {
      const result = await fetchExportRows({ limit: 200 })
      if (!result.success) {
        toastError(result.error || 'Failed to load rows for export')
        return
      }
      const items = result.data || []
      if (!items.length) {
        toastError('No products to export for the current filters')
        return
      }
      if (kind === 'csv') exportTaxProfitCsv({ items, currency })
      else exportTaxProfitPdf({ items, currency })
      toastSuccess(kind === 'csv' ? 'CSV exported' : 'PDF exported')
    } catch (err) {
      toastError(err?.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const presetClass = (active) =>
    `rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${active
      ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
      : 'bg-white text-slate-700 border-slate-200 hover:border-purple-200'
    }`

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Pricing & Margin Control"
          title="Tax & Profit Management"
          description="Global wholesale margin rules, sales tax compliance, and automated multi-branch price calculations"
          className="sm:items-center"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ExportCsvButton
                onClick={() => handleExport('csv')}
                disabled={exporting || loading}
                label="Export"
                title="Export pricing catalog to CSV"
              />
              <Button
                type="button"
                onClick={handleOpenDefaultTaxProfit}
                className="h-10 px-3.5 text-xs font-bold cursor-pointer text-white rounded-xl shadow-xs transition-opacity hover:opacity-90 flex items-center gap-1.5"
                style={{ background: BRAND.purple }}
              >
                <Settings className="size-3.5" />
                Set Default Tax & Profit
              </Button>
            </div>
          }
        />
      </MotionHeader>

      <SlowLoadingBanner show={slowHint} />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <MotionReveal delay={0.05}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPresetFilter('all')}
            className={presetClass(presetFilter === 'all')}
          >
            All Products ({totalCatalog})
          </button>
          <button
            type="button"
            onClick={() => setPresetFilter('top_sales')}
            className={presetClass(presetFilter === 'top_sales')}
          >
            <TrendingUp className="size-3.5 text-emerald-500" />
            Most Selling
          </button>
          <button
            type="button"
            onClick={() => setPresetFilter('top_profit')}
            className={presetClass(presetFilter === 'top_profit')}
          >
            <Award className="size-3.5 text-amber-500" />
            Highest Profit Margin
          </button>
          {/* <button
            type="button"
            onClick={() => setPresetFilter('slow_moving')}
            className={presetClass(presetFilter === 'slow_moving')}
          >
            <ArrowDownWideNarrow className="size-3.5 text-slate-500" />
            Slow Moving
          </button> */}
        </div>
      </MotionReveal>

      <MotionReveal delay={0.1}>
        <div className="rounded-2xl border border-border bg-white p-3 shadow-2xs sm:p-4">
          {/* Search → Branches → Category → Subcategory → Product → Variant → Clear → Columns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[14rem] flex-1 basis-[16rem]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by SKU, name, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-white py-2 pl-9 pr-4 text-xs text-slate-900 outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-300 sm:text-sm"
              />
            </div>

            <NativeSelect
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value)
                // Categories are branch-scoped — reset dependent filters
                setSelectedCategoryId('')
                setSelectedSubcategoryId('')
                setSelectedProductId('')
                setSelectedVariantId('')
              }}
              className={selectClass}
              aria-label="Filter by branch"
            >
              <option value="">All Branches</option>
              {(meta.branches || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value)
                setSelectedSubcategoryId('')
                setSelectedProductId('')
                setSelectedVariantId('')
              }}
              className={selectClass}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={selectedSubcategoryId}
              onChange={(e) => {
                setSelectedSubcategoryId(e.target.value)
                setSelectedProductId('')
                setSelectedVariantId('')
              }}
              disabled={!selectedCategoryId || subcategoryOptions.length === 0}
              className={selectClass}
              aria-label="Filter by subcategory"
            >
              <option value="">All Subcategories</option>
              {subcategoryOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value)
                setSelectedVariantId('')
              }}
              className={selectClass}
              aria-label="Filter by product"
            >
              <option value="">All Products</option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>

            {showVariantFilter ? (
              <NativeSelect
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className={selectClass}
                aria-label="Filter by variant"
              >
                <option value="">All Variants</option>
                {variantOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </NativeSelect>
            ) : null}

            {hasTableFilters ? (
              <button
                type="button"
                onClick={handleClearTableFilters}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{ color: BRAND.purple }}
              >
                <RotateCcw className="size-4" />
                Clear Filters
              </button>
            ) : null}

            <div className="hidden h-8 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />

            <div className="relative shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setColMenuOpen(!colMenuOpen)}
                className="h-10 cursor-pointer gap-1.5 rounded-xl border-border px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Columns className="size-4 text-slate-500" />
                <span>Columns</span>
              </Button>

              {colMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 space-y-1.5 rounded-xl border border-border bg-white p-3 text-xs shadow-xl">
                  <span className="block border-b border-slate-100 pb-1 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                    Toggle Table Columns
                  </span>
                  {Object.keys(visibleColumns).map((colKey) => (
                    <label
                      key={colKey}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[colKey]}
                        onChange={(e) =>
                          setVisibleColumns({
                            ...visibleColumns,
                            [colKey]: e.target.checked,
                          })
                        }
                        className="rounded text-purple-600 focus:ring-0"
                      />
                      {COLUMN_LABELS[colKey] || colKey}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </MotionReveal>

      <MotionReveal delay={0.15}>
        <SurfaceCard
          title="Catalog Pricing & Profit Margins"
          description={`Final Price = (Purchase Cost + Profit) + Tax on Subtotal · Currency: ${currency}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-900 border-purple-200 text-xs font-bold px-2.5 py-1"
                >
                  {selectedIds.length} Selected
                </Badge>
              )}
              {/* <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={exporting || loading}
                onClick={() => handleExport('pdf')}
                className="h-9 px-3 text-xs font-semibold cursor-pointer rounded-xl"
                title="Export table to PDF"
              >
                <FileText className="mr-1.5 size-3.5 text-rose-600" />
                PDF
              </Button> */}
              <Button
                type="button"
                disabled={selectedIds.length === 0 || mutating}
                onClick={() => setProfitDialogOpen(true)}
                size="sm"
                className="h-9 px-3.5 text-xs font-bold cursor-pointer text-white disabled:opacity-40 rounded-xl shadow-xs"
                style={{ background: BRAND.purple }}
              >
                <Percent className="mr-1.5 size-3.5" />
                Set Profit %
              </Button>
              <Button
                type="button"
                disabled={selectedIds.length === 0 || mutating}
                onClick={() => setTaxDialogOpen(true)}
                size="sm"
                className="h-9 px-3.5 text-xs font-bold cursor-pointer text-white disabled:opacity-40 rounded-xl shadow-xs"
                style={{ background: BRAND.deep }}
              >
                <Calculator className="mr-1.5 size-3.5" />
                Set Tax %
              </Button>
            </div>
          }
        >
          {loading && products.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Loading catalog…
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title={
                hasFilters
                  ? 'No products match these filters'
                  : 'No products in this company yet'
              }
              description={
                hasFilters
                  ? 'Clear search or filters to see more of the catalog.'
                  : 'Create products from a branch Inventory Manager catalog first. Tax & Profit will list them here for bulk margin and tax updates.'
              }
              compact
            />
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {products.map((p) => {
                  const isChecked = selectedIds.includes(p.id)
                  const finalPrice =
                    p.finalPrice ?? calculateFinalPrice(p.baseCost, p.profitPct, p.taxPct)

                  return (
                    <article
                      key={p.id}
                      className={`rounded-xl border px-3 py-3 ${isChecked
                        ? 'border-purple-200 bg-purple-50/40'
                        : 'border-border bg-slate-50/60'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(p.id)}
                          className="mt-1 rounded text-purple-600 focus:ring-0"
                          aria-label={`Select ${p.name}`}
                        />
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="size-10 shrink-0 rounded-lg border border-slate-200 object-cover shadow-2xs"
                          />
                        ) : (
                          <div className="size-10 shrink-0 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {p.variantLabel ? `${p.name} (${p.variantLabel})` : p.name}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400">
                            {p.itemCode || p.id}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            <CategoryLines
                              category={p.category}
                              subcategory={p.subcategory}
                              categoryClassName="font-medium text-slate-600"
                              subcategoryClassName="text-[11px] text-slate-400"
                            />
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span
                              className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700"
                              aria-label={`Profit margin ${p.profitPct} percent`}
                            >
                              +{p.profitPct}%
                            </span>
                            <span
                              className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700"
                              aria-label={`Tax ${p.taxPct > 0 ? `${p.taxPct} percent` : 'exempt'}`}
                            >
                              {p.taxPct > 0 ? `${p.taxPct}%` : '0% (Exempt)'}
                            </span>
                          </div>
                          <div className="mt-2 flex items-end justify-between gap-2">
                            <div>
                              <p className="text-[10px] text-slate-400">
                                Purchase {formatPlain(p.baseCost)}
                              </p>
                              <p className="text-sm font-extrabold text-purple-950">
                                {formatPlain(finalPrice)}
                              </p>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Margin {formatPlain(Number(finalPrice) - Number(p.baseCost || 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[50rem] text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="w-10 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleToggleSelectAll}
                          className="rounded text-purple-600 focus:ring-0"
                        />
                      </TableHead>
                      {visibleColumns.id && (
                        <TableHead className="px-3 py-3 font-medium">SKU ID</TableHead>
                      )}
                      {visibleColumns.image && (
                        <TableHead className="px-3 py-3 font-medium">Image</TableHead>
                      )}
                      {visibleColumns.name && (
                        <TableHead className="px-3 py-3 font-medium">Product</TableHead>
                      )}
                      {visibleColumns.barcode && (
                        <TableHead className="hidden px-3 py-3 font-medium lg:table-cell">
                          Barcode
                        </TableHead>
                      )}
                      {visibleColumns.category && (
                        <TableHead className="px-3 py-3 font-medium">Category</TableHead>
                      )}
                      {visibleColumns.baseCost && (
                        <TableHead className="px-3 py-3 font-medium">Purchase Cost</TableHead>
                      )}
                      {visibleColumns.profitPct && (
                        <TableHead className="px-3 py-3 font-medium">Profit %</TableHead>
                      )}
                      {visibleColumns.taxPct && (
                        <TableHead className="px-3 py-3 font-medium">Tax %</TableHead>
                      )}
                      {visibleColumns.finalPrice && (
                        <TableHead className="sticky right-0 z-[1] bg-white px-3 py-3 text-right font-bold text-slate-900">
                          Final Price
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => {
                      const isChecked = selectedIds.includes(p.id)
                      const finalPrice =
                        p.finalPrice ??
                        calculateFinalPrice(p.baseCost, p.profitPct, p.taxPct)

                      return (
                        <TableRow
                          key={p.id}
                          className={`group hover:bg-slate-50/70 transition-colors ${isChecked ? 'bg-purple-50/40' : ''
                            }`}
                        >
                          <TableCell className="w-10 px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRow(p.id)}
                              className="rounded text-purple-600 focus:ring-0"
                            />
                          </TableCell>

                          {visibleColumns.id && (
                            <TableCell className="px-3 py-3 font-mono text-xs font-bold text-slate-700">
                              {p.itemCode || p.id}
                            </TableCell>
                          )}

                          {visibleColumns.image && (
                            <TableCell className="px-3 py-3">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="size-10 rounded-lg object-cover border border-slate-200 shadow-2xs"
                                />
                              ) : (
                                <div className="size-10 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                              )}
                            </TableCell>
                          )}

                          {visibleColumns.name && (
                            <TableCell className="px-3 py-3 font-bold text-slate-900 text-xs">
                              {p.variantLabel ? `${p.name} (${p.variantLabel})` : p.name}
                            </TableCell>
                          )}

                          {visibleColumns.barcode && (
                            <TableCell className="hidden px-3 py-3 font-mono text-xs text-slate-500 lg:table-cell">
                              {p.barcode || '—'}
                            </TableCell>
                          )}

                          {visibleColumns.category && (
                            <TableCell className="px-3 py-3 text-xs text-slate-600">
                              <CategoryLines
                                category={p.category}
                                subcategory={p.subcategory}
                              />
                            </TableCell>
                          )}

                          {visibleColumns.baseCost && (
                            <TableCell className="px-3 py-3 font-semibold text-slate-800 text-xs">
                              {formatPlain(p.baseCost)}
                            </TableCell>
                          )}

                          {visibleColumns.profitPct && (
                            <TableCell className="px-3 py-3">
                              <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                +{p.profitPct}%
                              </span>
                            </TableCell>
                          )}

                          {visibleColumns.taxPct && (
                            <TableCell className="px-3 py-3">
                              <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                                {p.taxPct > 0 ? `${p.taxPct}%` : '0%'}
                              </span>
                            </TableCell>
                          )}

                          {visibleColumns.finalPrice && (
                            <TableCell className="sticky right-0 z-[1] bg-white px-3 py-3 text-right group-hover:bg-slate-50/70">
                              <span className="font-extrabold text-sm text-purple-950 block">
                                {formatPlain(finalPrice)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Margin: {formatPlain(Number(finalPrice) - Number(p.baseCost || 0))}
                              </span>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <TablePagination
                page={pagination.page || page}
                pageCount={pagination.pageCount || 1}
                totalItems={pagination.total || 0}
                pageSize={limit}
                loading={loading}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                  setLimit(next)
                  setPage(1)
                }}
              />
            </>
          )}
        </SurfaceCard>
      </MotionReveal>

      {/* Set Default Tax % Dialog */}
      {/* Set Default Tax & Profit Dialog */}
      <Dialog open={defaultTaxProfitDialogOpen} onOpenChange={setDefaultTaxProfitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-4 text-purple-600" />
              Set Default Tax & Profit
            </DialogTitle>
            <DialogDescription>
              Configure the default Tax % and Profit % available to the Inventory Manager when adding a new product.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDefaults} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="defaultTaxInput" className="text-xs font-semibold">
                Default Tax %
              </Label>
              <WholeNumberInput
                id="defaultTaxInput"
                min={0}
                max={100}
                value={defaultTaxValue}
                onChange={(e) => setDefaultTaxValue(e.target.value)}
                placeholder="Enter tax percentage"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="defaultProfitInput" className="text-xs font-semibold">
                Default Profit %
              </Label>
              <WholeNumberInput
                id="defaultProfitInput"
                min={0}
                max={100}
                value={defaultProfitValue}
                onChange={(e) => setDefaultProfitValue(e.target.value)}
                placeholder="Enter profit percentage"
                required
              />
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDefaultTaxProfitDialogOpen(false)}
                disabled={mutating}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutating}
                className="text-white font-semibold text-xs cursor-pointer shadow-xs"
                style={{ background: BRAND.purple }}
              >
                {mutating ? 'Saving…' : 'Set Default'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Profit Dialog */}
      <Dialog open={profitDialogOpen} onOpenChange={setProfitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Profit Margin Percentage</DialogTitle>
            <DialogDescription>
              Apply a standardized profit percentage to {selectedIds.length} selected items
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplyBulkProfit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="profitInput" className="text-xs font-semibold">
                Profit Margin (%)
              </Label>
              <WholeNumberInput
                id="profitInput"
                min={0}
                max={100}
                value={bulkProfitValue}
                onChange={(e) => setBulkProfitValue(e.target.value)}
                placeholder="e.g. 25"
                required
              />
              <p className="text-[11px] text-slate-500">
                Selling price is recalculated from purchase cost + profit % + tax % on cost.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfitDialogOpen(false)}
                disabled={mutating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutating}
                className="text-white font-semibold"
                style={{ background: BRAND.purple }}
              >
                {mutating ? 'Applying…' : 'Apply Profit %'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Tax Dialog */}
      <Dialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Sales Tax Percentage</DialogTitle>
            <DialogDescription>
              Apply tax rate or exemption to {selectedIds.length} selected items
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplyBulkTax} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="taxInput" className="text-xs font-semibold">
                Tax Percentage (%)
              </Label>
              <WholeNumberInput
                id="taxInput"
                min={0}
                max={100}
                value={bulkTaxValue}
                onChange={(e) => setBulkTaxValue(e.target.value)}
                placeholder="e.g. 5"
                required
              />
              <p className="text-[11px] text-slate-500">
                Enter 0 for tax-exempt essentials. Non-zero rates find or create a matching company tax.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTaxDialogOpen(false)}
                disabled={mutating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutating}
                className="text-white font-semibold"
                style={{ background: BRAND.deep }}
              >
                {mutating ? 'Applying…' : 'Apply Tax %'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TaxProfitPage

