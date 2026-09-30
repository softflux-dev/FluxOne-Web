import { FileDown, Calendar, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { BranchKpiCards } from '@/components/feature/branch/dashboard/BranchKpiCards'
import { BranchWelcomeBanner } from '@/components/feature/branch/dashboard/BranchWelcomeBanner'
import { DailySalesSummary } from '@/components/feature/branch/dashboard/DailySalesSummary'
import { CounterSalesCard } from '@/components/feature/branch/dashboard/CounterSalesCard'
import { InventoryStatusChart } from '@/components/feature/branch/dashboard/InventoryStatusChart'
import { ProductSalesInsights } from '@/components/feature/branch/dashboard/ProductSalesInsights'
import { SalesChart } from '@/components/feature/branch/dashboard/SalesChart'
import { StaffPerformanceTable } from '@/components/feature/branch/dashboard/StaffPerformanceTable'
// Phase 2 — restore when AI Business Insights ships
// import { AiBusinessInsights } from '@/components/feature/branch/dashboard/AiBusinessInsights'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { useBranchDashboard } from '@/hooks/useBranchDashboard'
import { useAuthSession } from '@/hooks/useAuthSession'
import { BRAND } from '@/lib/constants'
import { formatPct } from '@/lib/mapBranchDashboard'
import { downloadBranchDashboardPdf } from '@/lib/pdfDownload'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/hooks/useCurrency'

export function DashboardPage() {
  const { data, date, from, to, setRange, loading } = useBranchDashboard()
  const { user } = useAuthSession()
  const { format: formatCurrency } = useCurrency()
  const pdfBusyRef = useRef(false)
  const [pdfBusy, setPdfBusy] = useState(false)

  // Max selectable day = today (no future dates)
  const today = new Date().toISOString().slice(0, 10)

  async function handleDownloadPDF() {
    if (pdfBusyRef.current) return
    pdfBusyRef.current = true
    setPdfBusy(true)

    try {
      const result = downloadBranchDashboardPdf({
        companyName: user?.tenantName || user?.companyName || 'Company',
        branchName: data.branchName || user?.branchName || 'Branch',
        managerName: user?.name || 'Branch Manager',
        date,
        from,
        to,
        kpis: data.kpis || {},
        dailySummary: data.dailySummary || {},
        topProducts: data.topProducts || [],
        lowProducts: data.lowProducts || [],
        staff: data.staff || [],
        counters: data.counters || [],
        formatCurrency,
        formatPct,
      })
      toastSuccess(`Downloaded ${result.filename}`, {
        toastId: 'branch-dashboard-pdf-report',
      })
    } catch (err) {
      toastError(err?.message || 'PDF download failed', {
        toastId: 'branch-dashboard-pdf-error',
      })
    } finally {
      pdfBusyRef.current = false
      setPdfBusy(false)
    }
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          eyebrow="Branch Overview"
          title={data.branchName ? `${data.branchName} Dashboard` : 'Branch Dashboard'}
          description="Sales, profit, staff & inventory overview"
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {/* From / To — same day allowed; future dates blocked */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs sm:text-sm shadow-2xs">
                <Calendar className="size-4 text-purple-700 shrink-0" />
                <label className="inline-flex items-center gap-1.5">
                  <span className="shrink-0 text-slate-500 font-medium">From</span>
                  <input
                    type="date"
                    value={from}
                    max={to || today}
                    onChange={(event) => setRange({ from: event.target.value })}
                    className="min-w-0 border-0 bg-transparent font-semibold text-slate-900 outline-none"
                  />
                </label>
                <span className="text-slate-300">–</span>
                <label className="inline-flex items-center gap-1.5">
                  <span className="shrink-0 text-slate-500 font-medium">To</span>
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    max={today}
                    onChange={(event) => setRange({ to: event.target.value })}
                    className="min-w-0 border-0 bg-transparent font-semibold text-slate-900 outline-none"
                  />
                </label>
              </div>

              <Button
                type="button"
                onClick={handleDownloadPDF}
                disabled={pdfBusy}
                aria-busy={pdfBusy}
                className="text-white font-semibold cursor-pointer shadow-xs gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
                style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
              >
                {pdfBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileDown className="size-4" />
                )}
                {pdfBusy ? 'Downloading…' : 'Download Report (PDF)'}
              </Button>
            </div>
          }
        />
      </MotionHeader>

      <BranchWelcomeBanner />

      <div
        className={cn(
          'space-y-5 transition-opacity duration-300 sm:space-y-6',
          loading && 'opacity-60',
        )}
      >
        <BranchKpiCards kpis={data.kpis} />

        <MotionReveal delay={0.03}>
          <DailySalesSummary summary={data.dailySummary} />
        </MotionReveal>

        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 lg:gap-6">
          <MotionReveal delay={0.06} className="h-full">
            <SalesChart series={data.salesByHour} className="h-full" />
          </MotionReveal>
          <MotionReveal delay={0.09} className="h-full">
            <ProductSalesInsights
              topProducts={data.topProducts}
              lowProducts={data.lowProducts}
              className="h-full"
            />
          </MotionReveal>
        </div>

        <MotionReveal delay={0.11}>
          <CounterSalesCard counters={data.counters} />
        </MotionReveal>

        <div className="grid grid-cols-1 items-stretch">
          <MotionReveal delay={0.13} className="h-full">
            <StaffPerformanceTable staff={data.staff} className="h-full" />
          </MotionReveal>
          {/* <MotionReveal delay={0.16} className="h-full">
            <InventoryStatusChart inventory={data.inventory} className="h-full" />
          </MotionReveal> */}
        </div>

        {/* Phase 2 — restore when AI Business Insights ships
        <MotionReveal delay={0.18}>
          <AiBusinessInsights data={data} />
        </MotionReveal>
        */}
      </div>

      <p className="text-center text-[11px] text-slate-400">
        Accent · <span style={{ color: BRAND.purple }}>FluxOne</span> branch analytics
      </p>
    </div>
  )
}

export default DashboardPage
