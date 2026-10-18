import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { StaffPerformanceTab } from '@/components/feature/branch/staff/StaffPerformanceTab'
import { PerformanceRosterSkeleton } from '@/components/feature/branch/performance/PerformanceRosterSkeleton'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

const SLOW_LOAD_MS = 8000

export function PerformancePage() {
  const [designations, setDesignations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [slow, setSlow] = useState(false)
  const [scaleCreateOpen, setScaleCreateOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    setSlow(false)
    const res = await apiClient.get(endpoints.branch.designations.list, { limit: 100 })
    setLoading(false)
    setSlow(false)
    if (res.success) {
      setDesignations(res.data.items || res.data || [])
      return
    }
    setError(res.error || 'Failed to load performance page')
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!loading) {
      setSlow(false)
      return undefined
    }
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS)
    return () => window.clearTimeout(timer)
  }, [loading])

  return (
    <div className="space-y-6 pb-8">
      {/* Keep header visible so layout does not jump when data arrives */}
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Operations"
          title="Performance Monitoring"
          description="Evaluate employee performance scores against custom criteria scales."
        />
      </MotionHeader>

      <MotionReveal>
        {loading ? (
          <PerformanceRosterSkeleton
            rows={6}
            slow={slow}
            onRetry={() => void loadData()}
          />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center dark:border-red-900/40 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="mt-3 text-sm font-semibold text-red-800 underline dark:text-red-200"
            >
              Retry
            </button>
          </div>
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
