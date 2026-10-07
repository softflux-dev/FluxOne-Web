import { Search } from 'lucide-react'
import { normalizeSearchQuery } from '@/lib/formatDisplayId'

export function BranchesFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  stats,
  setPage,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Branch Name, ID, Location, or Manager..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          onPaste={(e) => {
            e.preventDefault()
            const pasted = e.clipboardData?.getData('text') || ''
            setSearchQuery(normalizeSearchQuery(pasted))
            setPage(1)
          }}
          className="w-full rounded-xl border border-border bg-slate-50/70 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 outline-none focus:border-purple-300 focus:bg-white focus:ring-1 focus:ring-purple-300"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 font-semibold shrink-0">Status:</span>
        <div className="flex max-w-full overflow-x-auto rounded-xl bg-slate-100 p-0.5 border border-slate-200">
          {[
            { key: 'all', label: `All (${stats.total})` },
            { key: 'open', label: `Open (${stats.open})` },
            { key: 'blocked', label: `Blocked (${stats.blocked})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key)
                setPage(1)
              }}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-white text-purple-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
