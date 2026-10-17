import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { StaffPerformanceTab } from '@/components/feature/branch/staff/StaffPerformanceTab'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

export function PerformancePage() {
  const [designations, setDesignations] = useState([])
  const [loading, setLoading] = useState(false)
  const [scaleCreateOpen, setScaleCreateOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const res = await apiClient.get(endpoints.branch.designations.list, { limit: 100 })
    setLoading(false)
    if (res.success) {
      setDesignations(res.data.items || res.data || [])
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Operations"
          title="Performance Monitoring"
          description="Evaluate employee performance scores against custom criteria scales."
        />
      </MotionHeader>

      <MotionReveal>
        {loading ? (
          <p className="text-center py-8 text-slate-400">Loading performance tracker...</p>
        ) : (
          <StaffPerformanceTab
            designations={designations}
            createOpen={scaleCreateOpen}
            onCreateOpenChange={setScaleCreateOpen}
          />
        )}
      </MotionReveal>
    </div>
  )
}
export default PerformancePage
