import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { Button } from '@/components/ui/button'
import { ExportCsvButton } from '@/components/shared/ExportCsvButton'
import {
  TaxProfitBulkProfitDialog,
  TaxProfitBulkTaxDialog,
  TaxProfitDefaultsDialog,
} from '@/components/feature/admin/tax-profit/TaxProfitDialogs'
import {
  TaxProfitFilters,
  TaxProfitPresetPills,
} from '@/components/feature/admin/tax-profit/TaxProfitFilters'
import { TaxProfitTable } from '@/components/feature/admin/tax-profit/TaxProfitTable'
import {
  ADMIN_TAX_PROFIT_PAGE_SIZE,
  useAdminTaxProfit,
} from '@/hooks/useAdminTaxProfit'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useCurrency } from '@/hooks/useCurrency'
import { BRAND } from '@/lib/constants'
import { toastSuccess, toastError } from '@/lib/toast'
import { validatePercentage } from '@/lib/validation/formValidators'
import { exportTaxProfitCsv, exportTaxProfitPdf } from '@/lib/taxProfitExport'
import { Settings } from 'lucide-react'

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

  useEffect(() => {
    if (meta?.defaults) {
      setDefaultProfitValue(String(meta.defaults.defaultProfitPercent ?? 0))
      setDefaultTaxValue(String(meta.defaults.defaultTaxPercent ?? 0))
    }
  }, [meta?.defaults])

  const slowHint = useSlowLoadingHint(loading)
  const totalCatalog = pagination.total || 0
  const hasTableFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(selectedBranchId) ||
    Boolean(selectedCategoryId) ||
    Boolean(selectedSubcategoryId) ||
    Boolean(selectedProductId) ||
    Boolean(selectedVariantId)
  const hasFilters = hasTableFilters || presetFilter !== 'all'

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
        <TaxProfitPresetPills
          presetFilter={presetFilter}
          setPresetFilter={setPresetFilter}
          totalCatalog={totalCatalog}
        />
      </MotionReveal>

      <MotionReveal delay={0.1}>
        <TaxProfitFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedBranchId={selectedBranchId}
          setSelectedBranchId={setSelectedBranchId}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          selectedSubcategoryId={selectedSubcategoryId}
          setSelectedSubcategoryId={setSelectedSubcategoryId}
          selectedProductId={selectedProductId}
          setSelectedProductId={setSelectedProductId}
          selectedVariantId={selectedVariantId}
          setSelectedVariantId={setSelectedVariantId}
          branches={meta.branches}
          categoryOptions={categoryOptions}
          subcategoryOptions={subcategoryOptions}
          productOptions={productOptions}
          variantOptions={variantOptions}
          showVariantFilter={showVariantFilter}
          hasTableFilters={hasTableFilters}
          onClearTableFilters={handleClearTableFilters}
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          colMenuOpen={colMenuOpen}
          setColMenuOpen={setColMenuOpen}
        />
      </MotionReveal>

      <MotionReveal delay={0.15}>
        <TaxProfitTable
          currency={currency}
          formatPlain={formatPlain}
          products={products}
          loading={loading}
          mutating={mutating}
          hasFilters={hasFilters}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleRow={handleToggleRow}
          visibleColumns={visibleColumns}
          pagination={pagination}
          page={page}
          limit={limit}
          setPage={setPage}
          setLimit={setLimit}
          onOpenProfitDialog={() => setProfitDialogOpen(true)}
          onOpenTaxDialog={() => setTaxDialogOpen(true)}
        />
      </MotionReveal>

      <TaxProfitDefaultsDialog
        open={defaultTaxProfitDialogOpen}
        onOpenChange={setDefaultTaxProfitDialogOpen}
        defaultTaxValue={defaultTaxValue}
        setDefaultTaxValue={setDefaultTaxValue}
        defaultProfitValue={defaultProfitValue}
        setDefaultProfitValue={setDefaultProfitValue}
        mutating={mutating}
        onSubmit={handleSaveDefaults}
      />

      <TaxProfitBulkProfitDialog
        open={profitDialogOpen}
        onOpenChange={setProfitDialogOpen}
        selectedCount={selectedIds.length}
        bulkProfitValue={bulkProfitValue}
        setBulkProfitValue={setBulkProfitValue}
        mutating={mutating}
        onSubmit={handleApplyBulkProfit}
      />

      <TaxProfitBulkTaxDialog
        open={taxDialogOpen}
        onOpenChange={setTaxDialogOpen}
        selectedCount={selectedIds.length}
        bulkTaxValue={bulkTaxValue}
        setBulkTaxValue={setBulkTaxValue}
        mutating={mutating}
        onSubmit={handleApplyBulkTax}
      />
    </div>
  )
}

export default TaxProfitPage
