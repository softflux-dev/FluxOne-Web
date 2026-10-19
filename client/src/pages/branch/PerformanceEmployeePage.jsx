import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PerformanceDetailHeader } from '@/components/feature/branch/performance/PerformanceDetailHeader'
import { PerformanceDetailSkeleton } from '@/components/feature/branch/performance/PerformanceDetailSkeleton'
import { PerformanceSummaryCards } from '@/components/feature/branch/performance/PerformanceSummaryCards'
import { PerformanceTrendChart } from '@/components/feature/branch/performance/PerformanceTrendChart'
import { PerformanceCriteriaBreakdown } from '@/components/feature/branch/performance/PerformanceCriteriaBreakdown'
import { PerformanceHistoryTimeline } from '@/components/feature/branch/performance/PerformanceHistoryTimeline'
import { ScoreEmployeeDialog } from '@/components/feature/branch/performance/ScoreEmployeeDialog'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/api'
import { PATHS } from '@/router/paths'

const SLOW_LOAD_MS = 8000

export function PerformanceEmployeePage() {
  const { staffId } = useParams()
  const [searchParams] = useSearchParams()

  const [detail, setDetail] = useState(null)
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [slow, setSlow] = useState(false)
  const [range, setRange] = useState('12M')
  const [timelinePage, setTimelinePage] = useState(1)
  const [expandedId, setExpandedId] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [scoreOpen, setScoreOpen] = useState(false)

  // Back to Staff → Performance roster (keep search/filter)
  const backHref = useMemo(() => {
    const params = new URLSearchParams()
    params.set('tab', 'performance')
    const q = searchParams.get('q')
    const designation = searchParams.get('designation')
    if (q) params.set('q', q)
    if (designation) params.set('designation', designation)
    return `${PATHS.branch.staff}?${params.toString()}`
  }, [searchParams])

  const loadDetail = useCallback(async () => {
    if (!staffId) return
    setLoading(true)
    setError(null)
    setSlow(false)
    const res = await apiClient.get(`/branch/performance/employees/${staffId}`, {
      range,
      timelinePage,
      timelineLimit: 10,
    })
    setLoading(false)
    setSlow(false)
    if (!res.success) {
      setError(res.error || 'Failed to load performance detail')
      setDetail(null)
      return
    }
    setDetail(res.data)
  }, [staffId, range, timelinePage])

  const loadCriteria = useCallback(async () => {
    const res = await apiClient.get('/branch/performance/scales')
    if (res.success) setCriteria(res.data?.criteria || [])
  }, [])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  useEffect(() => {
    void loadCriteria()
  }, [loadCriteria])

  // Soft slow-load hint — does not block; Retry available when still loading
  useEffect(() => {
    if (!loading || detail) {
      setSlow(false)
      return undefined
    }
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS)
    return () => window.clearTimeout(timer)
  }, [loading, detail])

  // Bind chart point → matching timeline row (by evaluationId, not date)
  const handlePointClick = (evaluationId) => {
    if (!evaluationId) return
    setHighlightId(evaluationId)
    setExpandedId(evaluationId)
    const items = detail?.timeline?.items || []
    if (items.some((i) => i.id === evaluationId)) return
    // Newest page first — jump home so scrollIntoView can find the row
    if (timelinePage !== 1) setTimelinePage(1)
  }

  if (loading && !detail) {
    return (
      <PerformanceDetailSkeleton
        slow={slow}
        onRetry={() => void loadDetail()}
      />
    )
  }

  if (error && !detail) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-sm font-medium text-red-600">{error}</p>
        <p className="text-xs text-slate-500">
          Something went wrong while loading this employee&apos;s performance.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="brand" onClick={() => void loadDetail()}>
            Retry
          </Button>
          <Button variant="outline" asChild>
            <Link to={backHref}>Back to roster</Link>
          </Button>
        </div>
      </div>
    )
  }

  const employee = detail?.employee
  const empty = !detail?.summary?.evaluationCount

  return (
    <div className="space-y-6 pb-10">
      <MotionHeader>
        <PerformanceDetailHeader
          employee={employee}
          backHref={backHref}
          canScore={Boolean(employee?.canScore)}
          onScore={() => setScoreOpen(true)}
        />
      </MotionHeader>

      {empty ? (
        <MotionReveal>
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <p className="text-base font-semibold text-foreground">No performance scores yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Record the first evaluation to unlock trend, breakdown, and history.
            </p>
            {employee?.canScore ? (
              <Button className="mt-4" variant="brand" onClick={() => setScoreOpen(true)}>
                Score Employee
              </Button>
            ) : null}
          </div>
        </MotionReveal>
      ) : (
        <>
          <MotionReveal delay={0.04}>
            <PerformanceSummaryCards summary={detail.summary} />
          </MotionReveal>

          <MotionReveal delay={0.06}>
            <PerformanceTrendChart
              chart={detail.chart}
              range={range}
              onRangeChange={(next) => {
                setRange(next)
                setTimelinePage(1)
              }}
              onPointClick={handlePointClick}
            />
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <PerformanceCriteriaBreakdown
              items={detail.criteriaBreakdown}
              previousItems={detail.previousCriteria}
            />
          </MotionReveal>

          <MotionReveal delay={0.1}>
            <PerformanceHistoryTimeline
              timeline={detail.timeline}
              expandedId={expandedId}
              highlightId={highlightId}
              onToggleExpand={(id) =>
                setExpandedId((prev) => (prev === id ? null : id))
              }
              onPageChange={setTimelinePage}
            />
          </MotionReveal>
        </>
      )}

      <ScoreEmployeeDialog
        open={scoreOpen}
        onOpenChange={setScoreOpen}
        employee={
          employee
            ? { staffId: employee.staffId, fullName: employee.fullName }
            : null
        }
        criteria={criteria}
        onSuccess={() => {
          void loadDetail()
        }}
      />
    </div>
  )
}

export default PerformanceEmployeePage
