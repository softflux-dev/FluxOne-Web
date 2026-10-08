import { useState } from 'react'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { DateRangeFields } from '@/components/shared/DateRangeFields'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { AdminWelcomeBanner } from '@/components/feature/admin/dashboard/AdminWelcomeBanner'
import { AdminKpiCards } from '@/components/feature/admin/dashboard/AdminKpiCards'
import { BranchProfitOverviewChart } from '@/components/feature/admin/dashboard/BranchProfitOverviewChart'
import { BranchInventoryStatusChart } from '@/components/feature/admin/dashboard/BranchInventoryStatusChart'
import { AiBusinessInsights } from '@/components/feature/admin/dashboard/AiBusinessInsights'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import { BRAND } from '@/lib/constants'
import { NativeSelect } from '@/components/ui/select'
import { useAuthSession } from '@/hooks/useAuthSession'

export function DashboardPage() {
  const { user } = useAuthSession()
  const today = new Date().toISOString().slice(0, 10)
  // Page-header filters — drive full dashboard (KPIs, Branch Overview, Inventory)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [selectedBranch, setSelectedBranch] = useState('all')

  const {
    loading,
    error,
    branches,
    kpis,
    branchProfitOverview,
    branchInventoryStatus,
  } = useAdminDashboard({ from, to, branchId: selectedBranch })

  // Resolve label for Branch Overview description when a single branch is selected
  const selectedBranchName =
    selectedBranch === 'all'
      ? null
      : branches.find((b) => b.id === selectedBranch)?.name || null

  const slowHint = useSlowLoadingHint(loading)

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          eyebrow={user?.tenantName || 'Overview'}
          title="Admin Dashboard"
          description="Consolidated sales, profit, branch inventory & business insights"
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <label className="flex w-full items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-sm sm:w-auto">
                <span className="shrink-0 text-slate-500">Branch</span>
                <NativeSelect
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="h-7 border-0 bg-transparent py-0 text-xs font-semibold text-slate-800 shadow-none focus:ring-0"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <DateRangeFields
                compact
                from={from}
                to={to}
                max={today}
                onChange={({ from: nextFrom, to: nextTo }) => {
                  setFrom(nextFrom || today)
                  setTo(nextTo || today)
                }}
              />
            </div>
          }
        />
      </MotionHeader>

      <AdminWelcomeBanner />
      <SlowLoadingBanner show={slowHint} />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="space-y-5 sm:space-y-6">
        {loading && !kpis ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : (
          <AdminKpiCards kpis={kpis || {}} />
        )}

        <MotionReveal delay={0.05}>
          {loading && !branchProfitOverview ? (
            <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ) : (
            // Branch Overview uses page-header Branch + From/To (API-scoped net profit)
            <BranchProfitOverviewChart
              data={branchProfitOverview || {}}
              branchId={selectedBranch}
              branchName={selectedBranchName}
            />
          )}
        </MotionReveal>

        <MotionReveal delay={0.1}>
          {loading && !branchInventoryStatus ? (
            <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ) : (
            <BranchInventoryStatusChart data={branchInventoryStatus || {}} />
          )}
        </MotionReveal>

        <MotionReveal delay={0.15}>
          <AiBusinessInsights />
        </MotionReveal>
      </div>

      <p className="text-center text-[11px] text-slate-400">
        Accent · <span style={{ color: BRAND.purple }}>FluxOne</span> enterprise analytics
      </p>
    </div>
  )
}

export default DashboardPage
