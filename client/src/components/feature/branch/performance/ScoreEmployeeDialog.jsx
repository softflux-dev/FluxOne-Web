import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/api/api'
import {
  calcWeightedScorePercent,
  formatScorePercent,
  sumActualPoints,
  sumScalePoints,
} from '@/lib/performanceScales'
import { ratingBadgeClass, ratingLabelFromScore } from '@/lib/performanceRatings'
import { toastError, toastSuccess } from '@/lib/toast'

// Shared Score Employee panel (roster + detail page)
export function ScoreEmployeeDialog({
  open,
  onOpenChange,
  employee = null,
  criteria = [],
  onSuccess,
}) {
  const [scores, setScores] = useState({})
  const [remarks, setRemarks] = useState('')
  const [mutating, setMutating] = useState(false)

  useEffect(() => {
    if (!open || !employee) return
    const initial = {}
    criteria.forEach((c) => {
      initial[c.id] = Math.round(Number(c.maxPoints || 0) / 2)
    })
    setScores(initial)
    setRemarks('')
  }, [open, employee, criteria])

  const summary = useMemo(() => {
    const actualTotal = sumActualPoints(scores, criteria)
    const maxTotal = sumScalePoints(criteria)
    const percent = calcWeightedScorePercent(scores, criteria)
    return {
      actualTotal,
      maxTotal,
      percent,
      label: ratingLabelFromScore(percent),
    }
  }, [scores, criteria])

  const handleSlider = (criterionId, val) => {
    setScores((prev) => ({ ...prev, [criterionId]: parseInt(val, 10) }))
  }

  const handleSubmit = async () => {
    if (!employee?.staffId) return
    if (!criteria.length) {
      return toastError('Configure a scoring scale (total 100) before evaluating')
    }
    setMutating(true)
    try {
      const items = criteria.map((c) => {
        const pts = Number(scores[c.id])
        const safe = Number.isFinite(pts) && pts >= 0 ? pts : 0
        return {
          criterionId: c.id,
          points: Math.min(safe, Number(c.maxPoints)),
        }
      })
      const res = await apiClient.post('/branch/performance/evaluations', {
        staffId: employee.staffId,
        remarks: remarks.trim() || undefined,
        items,
      })
      if (!res.success) {
        toastError(res.error || 'Failed to record evaluation')
        return
      }
      toastSuccess(
        `Performance recorded — ${formatScorePercent(res.data?.totalScore ?? summary.percent)} · ${res.data?.ratingLabel || summary.label}`,
      )
      onOpenChange?.(false)
      onSuccess?.(res.data)
    } catch (err) {
      toastError(err?.message || 'Failed to record evaluation')
    } finally {
      setMutating(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onOpenChange?.(false)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Evaluate Performance: {employee?.fullName}</DialogTitle>
          <DialogDescription>
            Assign points per criterion (0 to max). Scale total is 100 — final score is a percentage.
          </DialogDescription>
        </DialogHeader>

        {!criteria.length ? (
          <p className="py-4 text-center text-slate-400">
            Save a scoring scale that totals exactly 100 points first.
          </p>
        ) : (
          <div className="space-y-4 py-2">
            {criteria.map((c) => {
              const currentVal = scores[c.id] ?? 0
              return (
                <div
                  key={c.id}
                  className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2"
                >
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{c.name}</span>
                    <span className="text-purple-700">
                      {currentVal} / {c.maxPoints} pts
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={c.maxPoints}
                    value={currentVal}
                    onChange={(e) => handleSlider(c.id, e.target.value)}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-purple-600"
                  />
                </div>
              )
            })}

            <div className="space-y-1.5">
              <Label htmlFor="eval-remarks">Remarks (optional)</Label>
              <textarea
                id="eval-remarks"
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Notes for this evaluation…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-purple-400"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Evaluation summary</p>
              <p className="mt-1">
                Raw total: <strong>{summary.actualTotal}</strong> /{' '}
                <strong>{summary.maxTotal}</strong> pts
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-bold text-purple-800">
                  Final score: {formatScorePercent(summary.percent)}
                </span>
                <Badge variant="outline" className={ratingBadgeClass(summary.label)}>
                  {summary.label}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogCancelButton disabled={mutating} className="w-full sm:w-auto" />
          <Button
            onClick={handleSubmit}
            loading={mutating}
            disabled={!criteria.length}
            variant="brand"
            className="w-full sm:w-auto"
          >
            Record Scores
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ScoreEmployeeDialog
