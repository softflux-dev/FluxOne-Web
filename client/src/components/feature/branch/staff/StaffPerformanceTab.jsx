import { useEffect, useMemo, useState } from 'react'
import { Settings, Star } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { EntityStatusToggle } from '@/components/shared/EntityStatusToggle'
import { RowActionButtons } from '@/components/shared/ActionIconButton'
import { ScaleFormDialog } from '@/components/feature/branch/staff/ScaleFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { useClientPagination } from '@/hooks/useClientPagination'
import {
  activeScales,
  calcWeightedScorePercent,
  formatScorePercent,
  sumActualPoints,
  sumScalePoints,
} from '@/lib/performanceScales'
import { BRAND } from '@/lib/constants'
import { displayStaffRef, matchesDisplayRef } from '@/lib/formatDisplayId'
import { toastError, toastSuccess } from '@/lib/toast'

export function StaffPerformanceTab({
  designations = [],
  createOpen = false,
  onCreateOpenChange,
  onSubTabChange,
}) {
  const [activeSubTab, setActiveSubTab] = useState('roster') // 'roster' | 'scales'

  // Roster
  const [roster, setRoster] = useState([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDesignation, setFilterDesignation] = useState('')

  // Score employee modal
  const [scoringEmployee, setScoringEmployee] = useState(null)
  const [scales, setScales] = useState([])
  const [scores, setScores] = useState({})
  const [mutatingScore, setMutatingScore] = useState(false)

  // Scales CRUD
  const [loadingScales, setLoadingScales] = useState(false)
  const [editingScale, setEditingScale] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteTargetScale, setDeleteTargetScale] = useState(null)

  const switchSubTab = (next) => {
    setActiveSubTab(next)
    onSubTabChange?.(next)
  }

  const fetchRoster = async () => {
    setLoadingRoster(true)
    const res = await apiClient.get('/branch/performance/scores')
    setLoadingRoster(false)
    if (res.success) setRoster(res.data || [])
  }

  const fetchScales = async () => {
    setLoadingScales(true)
    const res = await apiClient.get('/branch/performance/scales')
    setLoadingScales(false)
    if (res.success) setScales(res.data || [])
  }

  useEffect(() => {
    void fetchRoster()
    void fetchScales()
    onSubTabChange?.('roster')
  }, [])

  const filteredRoster = roster.filter((emp) => {
    if (filterDesignation && emp.designationId !== filterDesignation) return false
    if (searchQuery) {
      const matchesName = String(emp.fullName || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      // STF-XXXXXXXX or bare hex both match via display-ref helper
      const matchesId = matchesDisplayRef(emp.id || emp.staffId, searchQuery, 'STF')
      if (!matchesName && !matchesId) return false
    }
    return true
  })

  const rosterPaging = useClientPagination(filteredRoster)
  const scalesPaging = useClientPagination(scales)

  // Enabled factors only — disabled are excluded from totals / evaluation
  const enabledScales = useMemo(() => activeScales(scales), [scales])

  // Running total of enabled factor max points (reference for BM)
  const pointsUsed = sumScalePoints(enabledScales)

  // Live evaluation summary while scoring
  const evaluationSummary = useMemo(() => {
    const actualTotal = sumActualPoints(scores, enabledScales)
    const maxTotal = sumScalePoints(enabledScales)
    const percent = calcWeightedScorePercent(scores, scales)
    return { actualTotal, maxTotal, percent }
  }, [scores, enabledScales, scales])

  const openScoringModal = (employee) => {
    setScoringEmployee(employee)
    // Default each enabled factor mid-range; missing values still count as 0 on submit
    const initialScores = {}
    enabledScales.forEach((s) => {
      initialScores[s.id] = Math.round(s.maxPoints / 2)
    })
    setScores(initialScores)
  }

  const handleScoreSliderChange = (scaleId, val) => {
    setScores((prev) => ({
      ...prev,
      [scaleId]: parseInt(val, 10),
    }))
  }

  const submitScores = async () => {
    if (enabledScales.length === 0) {
      return toastError('At least one scoring factor must be enabled before evaluating')
    }

    setMutatingScore(true)
    let successCount = 0
    for (const scale of enabledScales) {
      // Treat unset factors as 0
      const pts = Number(scores[scale.id])
      const safePts = Number.isFinite(pts) && pts >= 0 ? pts : 0
      const res = await apiClient.post('/branch/performance/scores', {
        staffId: scoringEmployee.staffId,
        scaleId: scale.id,
        points: Math.min(safePts, scale.maxPoints),
      })
      if (res.success) successCount++
    }
    setMutatingScore(false)
    if (successCount > 0) {
      toastSuccess(
        `Performance scores recorded — final score ${formatScorePercent(evaluationSummary.percent)}`,
      )
      setScoringEmployee(null)
      void fetchRoster()
    } else {
      toastError('Failed to record performance scores')
    }
  }

  const openEditScale = (scale) => {
    setEditingScale(scale)
    setEditOpen(true)
  }

  const handleToggleScaleActive = async (scale, next) => {
    const res = await apiClient.put(`/branch/performance/scales/${scale.id}`, {
      isActive: next,
    })
    if (!res.success) {
      toastError(res.error || 'Failed to update factor status')
      return
    }
    toastSuccess(next ? `"${scale.name}" enabled` : `"${scale.name}" disabled`)
    void fetchScales()
    void fetchRoster()
  }

  const confirmDeleteScale = async () => {
    if (!deleteTargetScale) return
    setLoadingScales(true)
    const res = await apiClient.delete(`/branch/performance/scales/${deleteTargetScale.id}`)
    setLoadingScales(false)
    if (res.success) {
      toastSuccess('Scoring scale deleted')
      setDeleteTargetScale(null)
      void fetchScales()
      void fetchRoster()
    } else {
      toastError(res.error || 'Failed to delete scale')
    }
  }

  const getRatingBadgeStyle = (rating) => {
    if (rating >= 75) {
      return 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-none font-bold rounded-lg px-2.5 py-1 text-sm'
    }
    if (rating >= 50) {
      return 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-none font-bold rounded-lg px-2.5 py-1 text-sm'
    }
    return 'bg-rose-50 text-rose-800 hover:bg-rose-100 border-none font-bold rounded-lg px-2.5 py-1 text-sm'
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border pb-3">
        <Button
          size="sm"
          variant={activeSubTab === 'roster' ? 'default' : 'outline'}
          onClick={() => switchSubTab('roster')}
          style={activeSubTab === 'roster' ? { backgroundColor: BRAND.purple } : {}}
          className={activeSubTab === 'roster' ? 'text-white' : ''}
        >
          Performance Roster
        </Button>
        <Button
          size="sm"
          variant={activeSubTab === 'scales' ? 'default' : 'outline'}
          onClick={() => switchSubTab('scales')}
          style={activeSubTab === 'scales' ? { backgroundColor: BRAND.purple } : {}}
          className={activeSubTab === 'scales' ? 'text-white' : ''}
        >
          <Settings className="mr-1 size-4" />
          Scoring Scales
        </Button>
      </div>

      {activeSubTab === 'roster' ? (
        <SurfaceCard title="Staff Scores & Performance Evaluation">
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Search Employee</Label>
              <Input
                placeholder="Search by name or ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Filter Designation</Label>
              <NativeSelect
                value={filterDesignation}
                onChange={(e) => setFilterDesignation(e.target.value)}
              >
                <option value="">All Designations</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {loadingRoster ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
          ) : filteredRoster.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No records found</p>
          ) : (
            <ResponsiveDataShell
              mobile={rosterPaging.slice.map((emp) => (
                <DataCard key={emp.staffId}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{emp.fullName}</p>
                      <p
                        title={emp.staffId || undefined}
                        className="mt-0.5 font-mono text-[11px] font-bold text-purple-800"
                      >
                        {displayStaffRef(emp)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{emp.designation || '—'}</p>
                    </div>
                    <Badge variant="outline" className={getRatingBadgeStyle(emp.rating)}>
                      <Star className="mr-1 size-3.5 fill-current" />
                      {formatScorePercent(emp.rating)}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="brand"
                    className="mt-3 h-8 w-full text-xs"
                    onClick={() => openScoringModal(emp)}
                  >
                    Score Employee
                  </Button>
                </DataCard>
              ))}
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead>Employee</TableHead>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Score rating</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rosterPaging.slice.map((emp) => (
                      <TableRow key={emp.staffId}>
                        <TableCell className="font-semibold text-slate-900">{emp.fullName}</TableCell>
                        <TableCell>
                          <span
                            title={emp.staffId || undefined}
                            className="font-mono text-xs font-bold text-purple-800 select-all"
                          >
                            {displayStaffRef(emp)}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600">{emp.designation || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRatingBadgeStyle(emp.rating)}>
                            <Star className="mr-1 size-3.5 fill-current" />
                            {formatScorePercent(emp.rating)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="brand"
                            className="h-8 text-xs"
                            onClick={() => openScoringModal(emp)}
                          >
                            Score Employee
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              }
            />
          )}

          <TablePagination
            page={rosterPaging.page}
            pageCount={rosterPaging.pageCount}
            totalItems={rosterPaging.total}
            pageSize={rosterPaging.pageSize}
            onPageChange={rosterPaging.setPage}
            onPageSizeChange={rosterPaging.setPageSize}
          />
        </SurfaceCard>
      ) : (
        <SurfaceCard
          title="Configured Scoring Criteria"
          description={`Enabled max points total: ${pointsUsed} · ${enabledScales.length} enabled / ${scales.length} total`}
        >
          {loadingScales ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
          ) : scales.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No scales configured</p>
          ) : (
            <ResponsiveDataShell
              mobile={scalesPaging.slice.map((s) => (
                <DataCard key={s.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-600">{s.maxPoints} pts</p>
                    </div>
                    <RowActionButtons
                      onEdit={() => openEditScale(s)}
                      onDelete={() => setDeleteTargetScale(s)}
                    />
                  </div>
                  <div className="mt-3">
                    <EntityStatusToggle
                      active={s.isActive !== false}
                      onChange={(next) => handleToggleScaleActive(s, next)}
                      activeLabel="Enabled"
                      inactiveLabel="Disabled"
                      activeTitle="Click to disable this scoring factor"
                      inactiveTitle="Click to enable this scoring factor"
                    />
                  </div>
                </DataCard>
              ))}
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead>Scale Name</TableHead>
                      <TableHead>Max Weights/Points</TableHead>
                      <TableHead>Enable / Disable</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scalesPaging.slice.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-semibold text-slate-900">{s.name}</TableCell>
                        <TableCell className="font-mono text-slate-700">{s.maxPoints} pts</TableCell>
                        <TableCell>
                          <EntityStatusToggle
                            active={s.isActive !== false}
                            onChange={(next) => handleToggleScaleActive(s, next)}
                            activeLabel="Enabled"
                            inactiveLabel="Disabled"
                            activeTitle="Click to disable this scoring factor"
                            inactiveTitle="Click to enable this scoring factor"
                          />
                        </TableCell>
                        <TableCell>
                          <RowActionButtons
                            onEdit={() => openEditScale(s)}
                            onDelete={() => setDeleteTargetScale(s)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              }
            />
          )}

          <TablePagination
            page={scalesPaging.page}
            pageCount={scalesPaging.pageCount}
            totalItems={scalesPaging.total}
            pageSize={scalesPaging.pageSize}
            onPageChange={scalesPaging.setPage}
            onPageSizeChange={scalesPaging.setPageSize}
          />
        </SurfaceCard>
      )}

      <ScaleFormDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        mode="create"
        scales={scales}
        onSuccess={fetchScales}
      />

      <ScaleFormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditingScale(null)
        }}
        mode="edit"
        initialScale={editingScale}
        scales={scales}
        onSuccess={fetchScales}
      />

      <Dialog
        open={Boolean(scoringEmployee)}
        onOpenChange={(open) => {
          if (!open) setScoringEmployee(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Evaluate Performance: {scoringEmployee?.fullName}</DialogTitle>
            <DialogDescription>
              Assign actual points per factor (0 to max). Final score is normalized to 100%.
            </DialogDescription>
          </DialogHeader>

          {enabledScales.length === 0 ? (
            <p className="py-4 text-center text-slate-400">
              Please enable at least one scoring scale first.
            </p>
          ) : (
            <div className="space-y-4 py-2">
              {enabledScales.map((s) => {
                const currentVal = scores[s.id] ?? 0
                return (
                  <div
                    key={s.id}
                    className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2"
                  >
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{s.name}</span>
                      <span className="text-purple-700">
                        {currentVal} / {s.maxPoints} pts
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={s.maxPoints}
                      value={currentVal}
                      onChange={(e) => handleScoreSliderChange(s.id, e.target.value)}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-purple-600"
                    />
                  </div>
                )
              })}

              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Evaluation summary</p>
                <p className="mt-1">
                  Raw total: <strong>{evaluationSummary.actualTotal}</strong> /{' '}
                  <strong>{evaluationSummary.maxTotal}</strong> pts
                </p>
                <p className="mt-1 text-sm font-bold text-purple-800">
                  Final score: {formatScorePercent(evaluationSummary.percent)}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogCancelButton disabled={mutatingScore} className="w-full sm:w-auto" />
            <Button
              onClick={submitScores}
              disabled={mutatingScore || enabledScales.length === 0}
              variant="brand"
              className="w-full sm:w-auto"
            >
              {mutatingScore ? 'Saving…' : 'Record Scores'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTargetScale)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetScale(null)
        }}
        title="Delete scoring scale?"
        description="Delete this scoring scale? Related scores are removed and ratings recalculate from remaining factors."
        confirmLabel="Delete"
        onConfirm={confirmDeleteScale}
        loading={loadingScales}
      />
    </div>
  )
}

export default StaffPerformanceTab
