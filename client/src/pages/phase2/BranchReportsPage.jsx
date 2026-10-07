import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'

// TODO(phase2): wire into branch router when Reports module ships
export function ReportsPage() {
  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Analytics"
          title="Reports & BI"
          description="Download daily summaries, print schedules, and review automated reports."
        />
      </MotionHeader>
      <MotionReveal>
        <SurfaceCard className="p-8 text-center text-slate-500">
          <p className="text-lg font-bold mb-2">Reports and PDF Downloads are a Phase 2 Module</p>
          <p className="text-sm">Advanced BI visual reports and daily sheets will be generated here.</p>
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}
export default ReportsPage
