import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Search,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { StatCard } from '@/components/shared/StatsCards'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { ActionIconButton } from '@/components/shared/ActionIconButton'
import { LeaveDetailDialog } from '@/components/feature/admin/leaves/LeaveDetailDialog'
import { Input } from '@/components/ui/input'
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
import { endpoints } from '@/api/endpoints'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { BRAND } from '@/lib/constants'
import { referenceFromUuid, displayStaffRef, matchesDisplayRef, normalizeSearchQuery } from '@/lib/formatDisplayId'
import { formatDateLine } from '@/lib/formatDateTime'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { toastError, toastSuccess } from '@/lib/toast'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'

function displayLeaveRef(row = {}) {
  return row.id ? referenceFromUuid(row.id, 'LV') : '—'
}

function displayLeaveStaffRef(row = {}) {
  return displayStaffRef({ id: row.requestedBy || row.staffId })
}

function formatRange(start, end) {
  return `${formatDateLine(start)} - ${formatDateLine(end)}`
}

function dayLabel(count) {
  const n = Number(count) || 0
  return `${n} ${n === 1 ? 'Day' : 'Days'}`
}

function statusBadgeClass(status) {
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

// use reusable components if possible — ActionIconButton for icon-only row actions
function LeaveRowActions({ row, mutating, onView, onApprove, onReject }) {
  const pending = row.status === 'pending'
  return (
    <div className="inline-flex items-center gap-0.5">
      <ActionIconButton action="view" onClick={() => onView(row)} />
      {pending ? (
        <>
          <ActionIconButton
            action="approve"
            disabled={mutating}
            onClick={() => onApprove(row)}
          />
          <ActionIconButton
            action="reject"
            disabled={mutating}
            onClick={() => onReject(row)}
          />
        </>
      ) : null}
    </div>
  )
}

export function LeavesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight') || ''

  const [items, setItems] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutatingId, setMutatingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(normalizeSearchQuery(searchQuery), 300)

  const [detailRow, setDetailRow] = useState(null)
  const [presetDecision, setPresetDecision] = useState(null)

  const fetchLeaves = useCallback(async () => {
    setLoading(true)
    // Branch-scoped list only — search/status applied client-side so KPIs stay accurate
    const res = await apiClient.get(endpoints.admin.leaves.list, {
      branchId: branchFilter || undefined,
    })
    setLoading(false)
    if (res.success) setItems(res.data || [])
    else toastError(res.error || 'Failed to load leave requests')
  }, [branchFilter])

  useEffect(() => {
    void fetchLeaves()
  }, [fetchLeaves])

  useEffect(() => {
    void (async () => {
      const res = await apiClient.get(endpoints.admin.branches.list, { page: 1, limit: 100 })
      if (res.success) {
        const list = res.data?.items || res.data || []
        setBranches(Array.isArray(list) ? list : [])
      }
    })()
  }, [])

  // Dynamic KPIs from full branch-scoped set (not search/status filtered)
  const counts = useMemo(() => {
    const all = items.length
    const pending = items.filter((r) => r.status === 'pending').length
    const approved = items.filter((r) => r.status === 'approved').length
    const rejected = items.filter((r) => r.status === 'rejected').length
    return { all, pending, approved, rejected }
  }, [items])

  const searched = useMemo(() => {
    if (!debouncedQ) return items
    const q = debouncedQ.toLowerCase()
    return items.filter((r) => {
      const name = String(r.managerName || '').toLowerCase()
      // Match Leave ID as UUID or LV-XXXXXXXX (paste-safe)
      return matchesDisplayRef(r.id, debouncedQ, 'LV') || name.includes(q)
    })
  }, [items, debouncedQ])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return searched
    return searched.filter((r) => r.status === statusFilter)
  }, [searched, statusFilter])

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pageRows,
  } = useClientPagination(filtered)

  useEffect(() => {
    setPage(1)
  }, [filtered.length, setPage])

  // Scroll/highlight when opened from a notification
  useEffect(() => {
    if (!highlightId || !items.length) return
    const match = items.find((r) => r.id === highlightId)
    if (match) {
      setDetailRow(match)
      setPresetDecision(null)
      setStatusFilter(match.status === 'pending' ? 'pending' : 'all')
    }
  }, [highlightId, items])

  const openDetail = (row, decision = null) => {
    setDetailRow(row)
    setPresetDecision(decision)
  }

  const closeDetail = (open) => {
    if (open) return
    setDetailRow(null)
    setPresetDecision(null)
  }

  const submitDecision = async ({ status, decisionReason }) => {
    if (!detailRow) return
    if (status === 'rejected' && !String(decisionReason || '').trim()) {
      return toastError('Please provide a rejection reason')
    }
    setMutatingId(detailRow.id)
    const res = await apiClient.patch(endpoints.admin.leaves.decide(detailRow.id), {
      status,
      decisionReason: decisionReason?.trim() || null,
    })
    setMutatingId(null)
    if (res.success) {
      toastSuccess(status === 'approved' ? 'Leave approved' : 'Leave rejected')
      setDetailRow(null)
      setPresetDecision(null)
      if (highlightId) {
        searchParams.delete('highlight')
        setSearchParams(searchParams, { replace: true })
      }
      void fetchLeaves()
    } else {
      toastError(res.error || 'Failed to update leave request')
    }
  }

  const statusChips = [
    { id: 'all', label: `All (${counts.all})` },
    { id: 'pending', label: `Pending (${counts.pending})` },
    { id: 'approved', label: `Approved (${counts.approved})` },
    { id: 'rejected', label: `Rejected (${counts.rejected})` },
  ]

  const kpiCards = [
    {
      id: 'all',
      label: 'Total Leaves',
      value: counts.all,
      icon: CalendarDays,
      iconGradient: 'from-[#8E238F] to-[#412283]',
    },
    {
      id: 'approved',
      label: 'Total Approved',
      value: counts.approved,
      icon: CheckCircle2,
      iconGradient: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'rejected',
      label: 'Total Rejected',
      value: counts.rejected,
      icon: XCircle,
      iconGradient: 'from-rose-500 to-red-600',
    },
    {
      id: 'pending',
      label: 'Approval Required',
      value: counts.pending,
      icon: Clock3,
      iconGradient: 'from-amber-500 to-orange-600',
    },
  ]

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Workforce"
          title="Leave Management"
          description="View and manage leave requests submitted by branch managers"
        />
      </MotionHeader>

      <MotionReveal delay={0.03}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((kpi, index) => (
            <StatCard
              key={kpi.id}
              index={index}
              label={kpi.label}
              value={loading ? '—' : kpi.value}
              icon={kpi.icon}
              iconGradient={kpi.iconGradient}
              onClick={() => setStatusFilter(kpi.id)}
              className={cn(statusFilter === kpi.id && 'border-purple-300 ring-1 ring-purple-200')}
            />
          ))}
        </div>
      </MotionReveal>

      <MotionReveal delay={0.06}>
        <SurfaceCard
          title="Leave Management"
          description="Branch manager personal leave requests awaiting or past Admin decision"
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search by Leave ID or Employee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onPaste={(e) => {
                  // Normalize pasted Leave IDs (ZWSP / fancy dashes) before debounce
                  e.preventDefault()
                  const pasted = e.clipboardData?.getData('text') || ''
                  setSearchQuery(normalizeSearchQuery(pasted))
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {statusChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id)}
                  className={cn(
                    'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    statusFilter === chip.id
                      ? 'border-transparent text-white'
                      : 'border-border bg-white text-slate-700 hover:bg-slate-50',
                  )}
                  style={
                    statusFilter === chip.id ? { backgroundColor: BRAND.purple } : undefined
                  }
                >
                  {chip.label}
                </button>
              ))}
              <NativeSelect
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                aria-label="Filter by branch"
                className="h-8 w-auto min-w-[8.5rem] max-w-[14rem] cursor-pointer rounded-full border-border px-3 py-1.5 text-xs font-semibold"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {loading ? (
            <TableRowsSkeleton rows={5} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No leave requests found</p>
          ) : (
            <ResponsiveDataShell
              mobile={pageRows.map((row) => (
                <DataCard
                  key={row.id}
                  className={cn(highlightId === row.id && 'ring-2 ring-purple-300')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-purple-800">
                        {displayLeaveRef(row)}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                        {row.managerName || 'Branch Manager'}
                      </p>
                      <p className="text-[11px] text-slate-500">{displayLeaveStaffRef(row)}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {row.branchName || '—'}
                        {row.branchLocation ? ` / ${row.branchLocation}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {formatRange(row.startDate, row.endDate)} · {dayLabel(row.dayCount)}
                      </p>
                    </div>
                    <Badge className={cn('border', statusBadgeClass(row.status))}>
                      {row.status}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <LeaveRowActions
                      row={row}
                      mutating={mutatingId === row.id}
                      onView={(r) => openDetail(r)}
                      onApprove={(r) => openDetail(r, 'approved')}
                      onReject={(r) => openDetail(r, 'rejected')}
                    />
                  </div>
                </DataCard>
              ))}
              desktop={
                // Make Sure All tables are responsive
                <Table className="w-full min-w-[64rem] text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="px-3 py-2 font-medium">Leave ID</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Employee Name</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Branch</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Duration Dates</TableHead>
                      <TableHead className="px-3 py-2 font-medium">No. of days</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Applied On</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Status</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          'hover:bg-slate-50/50',
                          highlightId === row.id && 'bg-purple-50/60',
                        )}
                      >
                        <TableCell className="px-3 py-3 font-mono text-xs font-bold text-purple-800">
                          {displayLeaveRef(row)}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                row.managerImageUrl ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.managerName || 'BM')}`
                              }
                              alt=""
                              className="size-9 rounded-full object-cover ring-1 ring-slate-200"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {row.managerName || 'Branch Manager'}
                              </p>
                              <p className="text-[11px] text-slate-500">{displayLeaveStaffRef(row)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <p className="font-medium text-slate-800">{row.branchName || '—'}</p>
                          <p className="text-[11px] text-slate-500">{row.branchLocation || ''}</p>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">
                          {formatRange(row.startDate, row.endDate)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">
                          {dayLabel(row.dayCount)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">
                          {/* Date top · 12h AM/PM time bottom */}
                          <DateTimeLines value={row.createdAt} />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Badge className={cn('border capitalize', statusBadgeClass(row.status))}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <LeaveRowActions
                            row={row}
                            mutating={mutatingId === row.id}
                            onView={(r) => openDetail(r)}
                            onApprove={(r) => openDetail(r, 'approved')}
                            onReject={(r) => openDetail(r, 'rejected')}
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
            page={page}
            pageCount={pageCount}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </SurfaceCard>
      </MotionReveal>

      {/* Leave details + decision (Cancel / Confirm, discard when dirty) */}
      <LeaveDetailDialog
        open={!!detailRow}
        onOpenChange={closeDetail}
        row={detailRow}
        presetDecision={presetDecision}
        submitting={mutatingId === detailRow?.id}
        onConfirm={submitDecision}
      />
    </div>
  )
}

export default LeavesPage
