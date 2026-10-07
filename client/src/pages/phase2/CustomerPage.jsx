import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'

// TODO(phase2): wire into branch router when Customer Management ships
export function CustomerPage() {
  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="CRM Operations"
          title="Customer Management"
          description="If customer purchases online items, unique customer management is required."
        />
      </MotionHeader>
      <MotionReveal>
        <SurfaceCard className="p-8 text-center text-slate-500">
          <p className="text-lg font-bold mb-2">Customer Management is a Phase 2 Module</p>
          <p className="text-sm">Online-to-offline synced client profiles and CRM points will be configured here.</p>
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}
export default CustomerPage
