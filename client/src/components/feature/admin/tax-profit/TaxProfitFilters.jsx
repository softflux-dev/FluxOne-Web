import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/select'
import { BRAND } from '@/lib/constants'
import { Award, Columns, RotateCcw, Search, TrendingUp } from 'lucide-react'

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

const selectClass =
  'h-10 w-full min-w-[8.5rem] rounded-xl border-border bg-white text-xs font-medium text-slate-800 sm:w-40'

function presetClass(active) {
  return `rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
    active
      ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
      : 'bg-white text-slate-700 border-slate-200 hover:border-purple-200'
  }`
}

export function TaxProfitPresetPills({ presetFilter, setPresetFilter, totalCatalog }) {
  return (
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
    </div>
  )
}

export function TaxProfitFilters({
  searchQuery,
  setSearchQuery,
  selectedBranchId,
  setSelectedBranchId,
  selectedCategoryId,
  setSelectedCategoryId,
  selectedSubcategoryId,
  setSelectedSubcategoryId,
  selectedProductId,
  setSelectedProductId,
  selectedVariantId,
  setSelectedVariantId,
  branches,
  categoryOptions,
  subcategoryOptions,
  productOptions,
  variantOptions,
  showVariantFilter,
  hasTableFilters,
  onClearTableFilters,
  visibleColumns,
  setVisibleColumns,
  colMenuOpen,
  setColMenuOpen,
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-3 shadow-2xs sm:p-4">
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
            setSelectedCategoryId('')
            setSelectedSubcategoryId('')
            setSelectedProductId('')
            setSelectedVariantId('')
          }}
          className={selectClass}
          aria-label="Filter by branch"
        >
          <option value="">All Branches</option>
          {(branches || []).map((b) => (
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
            onClick={onClearTableFilters}
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
  )
}
