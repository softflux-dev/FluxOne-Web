import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDownUp, Eye, Settings, Star } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { RowActionButtons } from '@/components/shared/ActionIconButton'
import { ScaleFormDialog } from '@/components/feature/branch/staff/ScaleFormDialog'
import { ScoreEmployeeDialog } from '@/components/feature/branch/performance/ScoreEmployeeDialog'
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
import { apiClient } from '@/api/api'
import { useAuth } from '@/context/AuthContext'
import { useClientPagination } from '@/hooks/useClientPagination'
import {
  formatScorePercent,
  isScaleSumValid,
  SCALE_SUM_TARGET,
  sumScalePoints,
} from '@/lib/performanceScales'
import {
  formatRelativeScored,
  ratingBadgeClass,
  trendDisplay,
} from '@/lib/performanceRatings'
import { formatDateLine } from '@/lib/formatDateTime'
import { BRAND } from '@/lib/constants'
import { displayStaffRef, matchesDisplayRef } from '@/lib/formatDisplayId'
import { PATHS } from '@/router/paths'
import { toastError, toastSuccess } from '@/lib/toast'

function isBranchManagerDesignation(name) {
  return /branch\s*manager/i.test(String(name || ''))
}

function detailHref(staffId, searchQuery, filterDesignation) {
  const params = new URLSearchParams()
  if (searchQuery) params.set('q', searchQuery)
  if (filterDesignation) params.set('designation', filterDesignation)
  const qs = params.toString()
  const base = PATHS.branch.performanceEmployee(staffId)
  return qs ? `${base}?${qs}` : base
}

export function StaffPerformanceTab({
  designations = [],
  createOpen = false,
  onCreateOpenChange,
  onSubTabChange,
}) {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [activeSubTab, setActiveSubTab] = useState('roster')

  const [roster, setRoster] = useState([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [filterDesignation, setFilterDesignation] = useState(
    searchParams.get('designation') || '',
  )
  const [sortLastScored, setSortLastScored] = useState(null)

  const [scoringEmployee, setScoringEmployee] = useState(null)

  const [criteriaDraft, setCriteriaDraft] = useState([])
  // Saved active scale — used for Score Employee (not unsaved draft)
  const [activeCriteria, setActiveCriteria] = useState([])
  const [scaleMeta, setScaleMeta] = useState(null)
  const [loadingScales, setLoadingScales] = useState(false)
  const [savingScale, setSavingScale] = useState(false)
  const [editingScale, setEditingScale] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)

  const rosterDesignations = useMemo(
    () => designations.filter((d) => !isBranchManagerDesignation(d.name)),
    [designations],
  )

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
    if (res.success) {
      const list = (res.data?.criteria || []).map((c) => ({
        ...c,
        _localKey: c.id,
      }))
      setCriteriaDraft(list)
      setActiveCriteria(res.data?.criteria || [])
      setScaleMeta(res.data?.version || null)
    }
  }

  useEffect(() => {
    void fetchRoster()
    void fetchScales()
    onSubTabChange?.('roster')
  }, [])

  const filteredRoster = useMemo(() => {
    let rows = roster.filter((emp) => {
      if (isBranchManagerDesignation(emp.designation)) return false
      if (emp.role === 'branch_manager') return false
      if (user?.id && emp.userId && String(emp.userId) === String(user.id)) return false
      if (filterDesignation && emp.designationId !== filterDesignation) return false
      if (searchQuery) {
        const matchesName = String(emp.fullName || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
        const matchesId = matchesDisplayRef(emp.id || emp.staffId, searchQuery, 'STF')
        if (!matchesName && !matchesId) return false
      }
      return true
    })

    if (sortLastScored) {
      rows = [...rows].sort((a, b) => {
        const aTime = a.lastScoredAt ? new Date(a.lastScoredAt).getTime() : 0
        const bTime = b.lastScoredAt ? new Date(b.lastScoredAt).getTime() : 0
        return sortLastScored === 'asc' ? aTime - bTime : bTime - aTime
      })
    }
    return rows
  }, [roster, filterDesignation, searchQuery, user?.id, sortLastScored])

  const rosterPaging = useClientPagination(filteredRoster)
  const scalesPaging = useClientPagination(criteriaDraft)
  const pointsUsed = sumScalePoints(criteriaDraft)
  const canSaveScale = isScaleSumValid(criteriaDraft)

  const openScoringModal = (employee) => setScoringEmployee(employee)

  const openEditScale = (scale) => {
    setEditingScale(scale)
    setEditOpen(true)
  }

  const applyCriterion = (row) => {
    setCriteriaDraft((prev) => {
      if (row.id || row._localKey) {
        const key = row.id || row._localKey
        const exists = prev.some((c) => c.id === key || c._localKey === key)
        if (exists) {
          return prev.map((c) =>
            c.id === key || c._localKey === key
              ? { ...c, name: row.name, maxPoints: row.maxPoints }
              : c,
          )
        }
      }
      return [
        ...prev,
        {
          id: row.id,
          name: row.name,
          maxPoints: row.maxPoints,
          _localKey: row._localKey || `local-${Date.now()}`,
        },
      ]
    })
  }

  const confirmRemoveCriterion = () => {
    if (!removeTarget) return
    const key = removeTarget.id || removeTarget._localKey
    setCriteriaDraft((prev) =>
      prev.filter((c) => c.id !== key && c._localKey !== key),
    )
    setRemoveTarget(null)
  }

  const handleSaveScaleVersion = async () => {
    if (!canSaveScale) {
      return toastError(`Criteria maximums must total exactly ${SCALE_SUM_TARGET}`)
    }
    setSavingScale(true)
    const res = await apiClient.put('/branch/performance/scales', {
      criteria: criteriaDraft.map((c) => ({
        ...(c.id ? { id: c.id } : {}),
        name: c.name,
        maxPoints: Number(c.maxPoints),
      })),
    })
    setSavingScale(false)
    if (!res.success) {
      toastError(res.error || 'Failed to save scoring scale')
      return
    }
    toastSuccess(
      res.data?.version
        ? `Scoring scale saved (v${res.data.version.versionNumber})`
        : 'Scoring scale saved',
    )
    void fetchScales()
    void fetchRoster()
  }

  const toggleLastScoredSort = () => {
    setSortLastScored((prev) => {
      if (prev === 'desc') return 'asc'
      if (prev === 'asc') return null
      return 'desc'
    })
  }

  const renderTrend = (emp) => {
    const t = trendDisplay(emp.trendDirection, emp.trendDelta)
    return <span className={t.className}>{t.text}</span>
  }

  const renderLastScored = (emp) => {
    if (!emp.lastScoredAt) {
      return <span className="text-slate-400">Not scored yet</span>
    }
    const relative = formatRelativeScored(emp.lastScoredAt)
    return (
      <span title={relative ? `${formatDateLine(emp.lastScoredAt)} (${relative})` : undefined}>
        {formatDateLine(emp.lastScoredAt)}
      </span>
    )
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
          Scoring Scale
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
                {rosterDesignations.map((d) => (
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
                      <Link
                        to={detailHref(emp.staffId, searchQuery, filterDesignation)}
                        className="truncate text-sm font-semibold text-purple-700 hover:underline"
                      >
                        {emp.fullName}
                      </Link>
                      <p
                        title={emp.staffId || undefined}
                        className="mt-0.5 font-mono text-[11px] font-bold text-purple-800"
                      >
                        {displayStaffRef(emp)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{emp.designation || '—'}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Trend: {renderTrend(emp)} · {renderLastScored(emp)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-slate-800">
                        {emp.score == null ? '—' : `${Number(emp.score).toFixed(0)} / 100`}
                      </span>
                      {emp.ratingLabel ? (
                        <Badge variant="outline" className={ratingBadgeClass(emp.ratingLabel)}>
                          <Star className="mr-1 size-3.5 fill-current" />
                          {emp.ratingLabel}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 text-xs"
                      asChild
                    >
                      <Link to={detailHref(emp.staffId, searchQuery, filterDesignation)}>
                        <Eye className="mr-1 size-3.5" />
                        View Details
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="brand"
                      className="h-8 flex-1 text-xs"
                      onClick={() => openScoringModal(emp)}
                    >
                      Score Employee
                    </Button>
                  </div>
                </DataCard>
              ))}
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead>Employee</TableHead>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="inline-flex cursor-pointer items-center gap-1 hover:text-slate-800"
                          onClick={toggleLastScoredSort}
                          title="Sort by last scored"
                        >
                          Last Scored
                          <ArrowDownUp className="size-3.5" />
                        </button>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rosterPaging.slice.map((emp) => (
                      <TableRow key={emp.staffId}>
                        <TableCell>
                          <Link
                            to={detailHref(emp.staffId, searchQuery, filterDesignation)}
                            className="font-semibold text-purple-700 hover:underline"
                          >
                            {emp.fullName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span
                            title={emp.staffId || undefined}
                            className="font-mono text-xs font-bold text-purple-800 select-all"
                          >
                            {displayStaffRef(emp)}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600">{emp.designation || '—'}</TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          {emp.score == null ? '—' : `${Number(emp.score).toFixed(0)} / 100`}
                        </TableCell>
                        <TableCell>{renderTrend(emp)}</TableCell>
                        <TableCell>
                          {emp.ratingLabel ? (
                            <Badge variant="outline" className={ratingBadgeClass(emp.ratingLabel)}>
                              <Star className="mr-1 size-3.5 fill-current" />
                              {emp.ratingLabel}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {renderLastScored(emp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                              <Link to={detailHref(emp.staffId, searchQuery, filterDesignation)}>
                                View Details
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="brand"
                              className="h-8 text-xs"
                              onClick={() => openScoringModal(emp)}
                            >
                              Score Employee
                            </Button>
                          </div>
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
          description={
            scaleMeta
              ? `Active version v${scaleMeta.versionNumber} · Total ${pointsUsed} / ${SCALE_SUM_TARGET}`
              : `Draft total ${pointsUsed} / ${SCALE_SUM_TARGET}`
          }
          actions={
            <Button
              size="sm"
              variant="brand"
              disabled={!canSaveScale || savingScale}
              onClick={handleSaveScaleVersion}
            >
              {savingScale ? 'Saving…' : 'Save Scale'}
            </Button>
          }
        >
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
              canSaveScale
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            Running total: <strong>{pointsUsed}</strong> / {SCALE_SUM_TARGET}. Save is enabled only
            when the total is exactly {SCALE_SUM_TARGET}. Saving creates a new scale version;
            past evaluations keep their snapshots.
          </div>

          {loadingScales ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
          ) : criteriaDraft.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No criteria yet. Add criteria until the total is {SCALE_SUM_TARGET}.
            </p>
          ) : (
            <ResponsiveDataShell
              mobile={scalesPaging.slice.map((s) => (
                <DataCard key={s.id || s._localKey}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-600">{s.maxPoints} pts</p>
                    </div>
                    <RowActionButtons
                      onEdit={() => openEditScale(s)}
                      onDelete={() => setRemoveTarget(s)}
                    />
                  </div>
                </DataCard>
              ))}
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead>Criterion</TableHead>
                      <TableHead>Max Points</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scalesPaging.slice.map((s) => (
                      <TableRow key={s.id || s._localKey}>
                        <TableCell className="font-semibold text-slate-900">{s.name}</TableCell>
                        <TableCell className="font-mono text-slate-700">{s.maxPoints} pts</TableCell>
                        <TableCell>
                          <RowActionButtons
                            onEdit={() => openEditScale(s)}
                            onDelete={() => setRemoveTarget(s)}
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
        scales={criteriaDraft}
        onApply={applyCriterion}
      />

      <ScaleFormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditingScale(null)
        }}
        mode="edit"
        initialScale={editingScale}
        scales={criteriaDraft}
        onApply={applyCriterion}
      />

      <ScoreEmployeeDialog
        open={Boolean(scoringEmployee)}
        onOpenChange={(open) => {
          if (!open) setScoringEmployee(null)
        }}
        employee={scoringEmployee}
        criteria={activeCriteria}
        onSuccess={() => {
          void fetchRoster()
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
        title="Remove criterion from draft?"
        description="This removes the criterion from the next saved scale version. Past evaluations keep their snapshots. Click Save Scale to publish."
        confirmLabel="Remove"
        onConfirm={confirmRemoveCriterion}
      />
    </div>
  )
}

export default StaffPerformanceTab
