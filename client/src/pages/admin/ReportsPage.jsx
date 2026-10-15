import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { Badge } from '@/components/ui/badge'
import { BRAND } from '@/lib/constants'
import { FileText, Sparkles, Download, BarChart2, Calendar, FileSpreadsheet } from 'lucide-react'

export function ReportsPage() {
  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Executive Analytics"
          title="Enterprise Reports"
          description="Consolidated financial audits, multi-branch summaries and automated reporting"
        />
      </MotionHeader>

      <MotionReveal>
        <SurfaceCard
          title={
            <div className="flex items-center gap-2.5">
              <div
                className="flex size-7 items-center justify-center rounded-lg text-white shadow-xs"
                style={{ background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.deep})` }}
              >
                <Sparkles className="size-4" />
              </div>
              <span className="text-base sm:text-lg font-bold text-foreground">
                AI Generated Reports & Audits
              </span>
            </div>
          }
          description="Automated cross-branch financial audits and executive intelligence reports"
          actions={
            <Badge
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold dark:bg-accent dark:text-accent-foreground dark:border-border"
            >
              Phase 2 Feature
            </Badge>
          }
        >
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-purple-200 bg-[#fbf5fc]/60 dark:border-border dark:bg-muted/40">
            <div
              className="flex size-14 items-center justify-center rounded-2xl text-white shadow-sm mb-4"
              style={{ background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.deep})` }}
            >
              <FileText className="size-7" />
            </div>

            <h4 className="text-lg font-bold text-foreground">
              AI-Generated Reports Module (Phase 2)
            </h4>

            <p className="mt-1.5 max-w-lg text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Automated executive branch audits, monthly profit-and-loss PDF reports, tax summary packs, and AI-narrated business performance summaries will be generated here in <strong className="text-foreground">Phase 2</strong>.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full text-left">
              <div className="rounded-xl border border-purple-100 bg-card p-3.5 shadow-2xs dark:border-border">
                <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1">
                  <BarChart2 className="size-4" />
                  <span>Consolidated P&L Audit</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Comprehensive multi-branch monthly and annual balance sheets.
                </p>
              </div>

              <div className="rounded-xl border border-purple-100 bg-card p-3.5 shadow-2xs dark:border-border">
                <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1">
                  <Calendar className="size-4" />
                  <span>Tax & FBR Filing Reports</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Automated sales tax, withholding, and profit distribution summaries.
                </p>
              </div>

              <div className="rounded-xl border border-purple-100 bg-card p-3.5 shadow-2xs dark:border-border">
                <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1">
                  <FileSpreadsheet className="size-4" />
                  <span>One-Click Multi-Format Export</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Direct export to PDF, Excel XLSX, and automated email dispatches.
                </p>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}

export default ReportsPage
