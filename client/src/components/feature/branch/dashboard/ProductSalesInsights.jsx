import { useState } from 'react'
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { useCurrency } from '@/hooks/useCurrency'
import { formatPct } from '@/lib/mapBranchDashboard'

const LIST_MIN_H = 260

export function ProductSalesInsights({
  topProducts = [],
  lowProducts = [],
  className,
}) {
  const { format } = useCurrency()
  // Default: Top Products (highest sales)
  const [viewMode, setViewMode] = useState('top') // 'top' | 'low'

  const tops = Array.isArray(topProducts) ? topProducts : []
  const lows = Array.isArray(lowProducts) ? lowProducts : []
  const hasLowList = lows.length > 0

  // If low list empty, stay on top tab
  const activeMode = viewMode === 'low' && !hasLowList ? 'top' : viewMode

  return (
    <SurfaceCard
      className={className}
      title="Product Sales"
      description="Highest vs lowest units sold"
      actions={
        <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('top')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activeMode === 'top'
                ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="size-3 text-emerald-600" />
            Top Products
          </button>
          <button
            type="button"
            onClick={() => hasLowList && setViewMode('low')}
            disabled={!hasLowList}
            title={
              hasLowList
                ? 'Products with the lowest sales'
                : 'Needs more sold products to show a separate lowest list'
            }
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1 ${
              !hasLowList
                ? 'cursor-not-allowed text-slate-400 opacity-60'
                : activeMode === 'low'
                  ? 'cursor-pointer bg-white text-rose-800 shadow-2xs font-bold'
                  : 'cursor-pointer text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="size-3 text-rose-600" />
            Low Products
          </button>
        </div>
      }
    >
      {activeMode === 'top' && (
        <div className="space-y-3" style={{ minHeight: LIST_MIN_H }}>
          <p className="text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
            <ArrowUpRight className="size-3.5 text-emerald-600" />
            Products with the highest units sold in this period
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            {tops.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No product sales for this date.</p>
            ) : (
              tops.map((item, idx) => (
                <div
                  key={item.id || item.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-slate-900">{item.name}</p>
                      <p className="text-[11px] text-slate-500">{item.units} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xs sm:text-sm text-slate-900">{format(item.sales)}</p>
                    <span className="inline-flex items-center text-[11px] font-bold text-emerald-600">
                      {formatPct(item.changePct)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeMode === 'low' && hasLowList && (
        <div className="space-y-3" style={{ minHeight: LIST_MIN_H }}>
          <p className="text-xs font-medium text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-1.5">
            <ArrowDownRight className="size-3.5 text-rose-600" />
            Products with the lowest units sold in this period
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            {lows.map((item, idx) => (
              <div
                key={item.id || item.name}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-rose-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-slate-900">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{item.units} units sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs sm:text-sm text-slate-900">{format(item.sales)}</p>
                  <span className="inline-flex items-center text-[11px] font-bold text-rose-600">
                    {formatPct(item.changePct)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SurfaceCard>
  )
}

export default ProductSalesInsights
