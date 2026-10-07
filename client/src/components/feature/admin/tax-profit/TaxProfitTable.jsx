import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { CategoryLines } from '@/components/shared/CategoryLines'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { BRAND } from '@/lib/constants'
import { finalPriceFromCost } from '@/lib/pricing'
import { Calculator, Loader2, PackageOpen, Percent } from 'lucide-react'

export function TaxProfitTable({
  currency,
  formatPlain,
  products,
  loading,
  mutating,
  hasFilters,
  selectedIds,
  isAllSelected,
  onToggleSelectAll,
  onToggleRow,
  visibleColumns,
  pagination,
  page,
  limit,
  setPage,
  setLimit,
  onOpenProfitDialog,
  onOpenTaxDialog,
}) {
  return (
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
          <Button
            type="button"
            disabled={selectedIds.length === 0 || mutating}
            onClick={onOpenProfitDialog}
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
            onClick={onOpenTaxDialog}
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
                p.finalPrice ?? finalPriceFromCost(p.baseCost, p.profitPct, p.taxPct)

              return (
                <article
                  key={p.id}
                  className={`rounded-xl border px-3 py-3 ${
                    isChecked
                      ? 'border-purple-200 bg-purple-50/40'
                      : 'border-border bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleRow(p.id)}
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
                      onChange={onToggleSelectAll}
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
                    p.finalPrice ?? finalPriceFromCost(p.baseCost, p.profitPct, p.taxPct)

                  return (
                    <TableRow
                      key={p.id}
                      className={`group hover:bg-slate-50/70 transition-colors ${
                        isChecked ? 'bg-purple-50/40' : ''
                      }`}
                    >
                      <TableCell className="w-10 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleRow(p.id)}
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
  )
}
