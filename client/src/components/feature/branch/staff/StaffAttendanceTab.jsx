import { useEffect, useMemo, useState } from 'react'
import { Calendar as CalendarIcon, List, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/api/api'
import { BRAND } from '@/lib/constants'
import { formatDateLine } from '@/lib/formatDateTime'
import { toastError, toastSuccess } from '@/lib/toast'
import { useClientPagination } from '@/hooks/useClientPagination'
import { cn } from '@/lib/utils'

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

// Shared display format for both Attendance Logs and Manual Attendance
function formatAttendanceDate(value) {
  return formatDateLine(value)
}

function matchesDesignation(member, designationId) {
  if (!designationId) return true
  return member?.designationId === designationId
}

// Shared filter bar: Date | Designation | Show All Dates (optional)
function AttendanceFilterBar({
  dateLabel = 'Date',
  dateId,
  dateValue,
  onDateChange,
  dateDisabled = false,
  designationId,
  designationValue,
  onDesignationChange,
  designations = [],
  showAllDates = false,
  onShowAllDatesChange,
}) {
  return (
    <div
      className={cn(
        'mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2',
        onShowAllDatesChange ? 'max-w-3xl lg:grid-cols-3' : 'max-w-lg',
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor={dateId}>{dateLabel}</Label>
        <Input
          id={dateId}
          type="date"
          value={dateValue}
          disabled={dateDisabled}
          onChange={(e) => onDateChange?.(e.target.value)}
          className="h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={designationId}>Filter Designation</Label>
        <NativeSelect
          id={designationId}
          value={designationValue}
          onChange={(e) => onDesignationChange?.(e.target.value)}
          className="h-9"
        >
          <option value="">All Designations</option>
          {designations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Align with inputs — not between date label and field */}
      {onShowAllDatesChange ? (
        <div className="space-y-1.5">
          <Label htmlFor="attendance-show-all-dates" className="select-none text-transparent">
            Options
          </Label>
          <label
            htmlFor="attendance-show-all-dates"
            className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-3 text-sm text-slate-700"
          >
            <input
              id="attendance-show-all-dates"
              type="checkbox"
              checked={showAllDates}
              onChange={(e) => onShowAllDatesChange?.(e.target.checked)}
              className="size-4 cursor-pointer accent-purple-700"
            />
            Show All Dates
          </label>
        </div>
      ) : null}
    </div>
  )
}

export function StaffAttendanceTab({ designations = [], staff = [] }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)

  const [subTab, setSubTab] = useState('overview') // 'overview' | 'mark'
  const [viewMode, setViewMode] = useState('list') // 'list' | 'calendar'
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [filterLogDate, setFilterLogDate] = useState(todayIso)
  const [showAllDates, setShowAllDates] = useState(false)
  const [filterDesignation, setFilterDesignation] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [localAttendance, setLocalAttendance] = useState({})

  const fetchLogs = async () => {
    setLoading(true)
    const res = await apiClient.get('/branch/attendance')
    setLoading(false)
    if (res.success) {
      setLogs(res.data || [])
    }
  }

  useEffect(() => {
    void fetchLogs()
  }, [])

  // Sync local marked attendance
  useEffect(() => {
    const nextAttendance = {}
    staff.forEach((member) => {
      const log = logs.find((l) => {
        const lDate = String(l.workDate || '').split('T')[0]
        return l.staffId === member.id && lDate === selectedDate
      })
      nextAttendance[member.id] = {
        status: log?.status || 'present',
        note: log?.note || '',
        isSaved: Boolean(log),
      }
    })
    setLocalAttendance(nextAttendance)
  }, [selectedDate, staff, logs])

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayIndex = getFirstDayOfMonth(year, month)

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchedStaff = staff.find((s) => s.id === log.staffId)
      if (!matchedStaff) return false
      if (!matchesDesignation(matchedStaff, filterDesignation)) return false
      const logDate = String(log.workDate || '').split('T')[0]
      if (!showAllDates && filterLogDate && logDate !== filterLogDate) return false
      return true
    })
  }, [logs, staff, filterDesignation, filterLogDate, showAllDates])

  // Manual Attendance — same designation filter
  const filteredStaff = useMemo(() => {
    return staff.filter((m) => matchesDesignation(m, filterDesignation))
  }, [staff, filterDesignation])

  const {
    page: logPage,
    setPage: setLogPage,
    pageSize: logPageSize,
    setPageSize: setLogPageSize,
    pageCount: logPageCount,
    total: logTotal,
    slice: pagedLogs,
  } = useClientPagination(filteredLogs)

  const getLogsForDate = (dayNum) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    return logs.filter((log) => String(log.workDate || '').split('T')[0] === dateStr)
  }

  function handleShowAllDates(checked) {
    setShowAllDates(checked)
    // Keep the date value visible; filtering ignores it while "all dates" is on
    if (!checked && !filterLogDate) setFilterLogDate(todayIso())
  }

  function handleFilterLogDateChange(next) {
    setShowAllDates(false)
    setFilterLogDate(next)
  }

  const handleStatusChange = (staffId, status) => {
    setLocalAttendance((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], status },
    }))
  }

  const handleNoteChange = (staffId, note) => {
    setLocalAttendance((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], note },
    }))
  }

  const handleSaveAttendance = async (staffId) => {
    const item = localAttendance[staffId]
    if (!item) return

    setMutating(true)
    const res = await apiClient.post('/branch/attendance', {
      staffId,
      workDate: selectedDate,
      status: item.status,
      note: item.note || undefined,
    })
    setMutating(false)

    if (res.success) {
      toastSuccess(item.isSaved ? 'Attendance updated' : 'Attendance saved')
      setLocalAttendance((prev) => ({
        ...prev,
        [staffId]: { ...prev[staffId], isSaved: true },
      }))
      void fetchLogs()
    } else {
      toastError(res.error || 'Failed to save attendance')
    }
  }

  const handleSaveAll = async () => {
    setMutating(true)
    let successCount = 0
    for (const member of filteredStaff) {
      const item = localAttendance[member.id]
      if (!item) continue
      const res = await apiClient.post('/branch/attendance', {
        staffId: member.id,
        workDate: selectedDate,
        status: item.status,
        note: item.note || undefined,
      })
      if (res.success) successCount++
    }
    setMutating(false)
    if (successCount > 0) {
      toastSuccess(`Recorded ${successCount} attendance records`)
      setLocalAttendance((prev) => {
        const next = { ...prev }
        filteredStaff.forEach((m) => {
          if (next[m.id]) next[m.id] = { ...next[m.id], isSaved: true }
        })
        return next
      })
      void fetchLogs()
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present': return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      case 'absent': return 'bg-rose-50 text-rose-700 ring-rose-200'
      case 'late': return 'bg-amber-50 text-amber-700 ring-amber-200'
      case 'holiday': return 'bg-sky-50 text-sky-700 ring-sky-200'
      case 'leave': return 'bg-indigo-50 text-indigo-700 ring-indigo-200'
      default: return 'bg-slate-50 text-slate-700 ring-slate-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Sub tabs header */}
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={subTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setSubTab('overview')}
            style={subTab === 'overview' ? { backgroundColor: BRAND.purple } : {}}
            className={subTab === 'overview' ? 'text-white' : ''}
          >
            Attendance Logs
          </Button>
          <Button
            size="sm"
            variant={subTab === 'mark' ? 'default' : 'outline'}
            onClick={() => setSubTab('mark')}
            style={subTab === 'mark' ? { backgroundColor: BRAND.purple } : {}}
            className={subTab === 'mark' ? 'text-white' : ''}
          >
            <CheckSquare className="mr-1.5 size-4" />
            Manual Attendance
          </Button>
        </div>

        {subTab === 'overview' && (
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              style={viewMode === 'list' ? { backgroundColor: BRAND.purple } : {}}
              className={viewMode === 'list' ? 'text-white' : ''}
            >
              <List className="mr-1 size-4" /> List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              style={viewMode === 'calendar' ? { backgroundColor: BRAND.purple } : {}}
              className={viewMode === 'calendar' ? 'text-white' : ''}
            >
              <CalendarIcon className="mr-1 size-4" /> Calendar
            </Button>
          </div>
        )}
      </div>

      {subTab === 'overview' ? (
        <>
          {viewMode === 'list' ? (
            <SurfaceCard title="Daily Roster Logs">
              <AttendanceFilterBar
                dateLabel="Log Date"
                dateId="filter-log-date"
                dateValue={filterLogDate}
                onDateChange={handleFilterLogDateChange}
                dateDisabled={showAllDates}
                designationId="filter-log-desig"
                designationValue={filterDesignation}
                onDesignationChange={setFilterDesignation}
                designations={designations}
                showAllDates={showAllDates}
                onShowAllDatesChange={handleShowAllDates}
              />

              {loading ? (
                <TableRowsSkeleton rows={5} />
              ) : filteredLogs.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  {showAllDates ? 'No logs found' : 'No logs found for this date'}
                </p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {pagedLogs.map((log) => {
                      const m = staff.find((s) => s.id === log.staffId)
                      return (
                        <article
                          key={log.id}
                          className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {m?.fullName || 'Employee'}
                              </p>
                              <p className="text-xs text-slate-500">{m?.designation || '—'}</p>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                                {formatAttendanceDate(log.workDate)}
                              </p>
                            </div>
                            <span
                              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset capitalize ${getStatusBadge(log.status)}`}
                            >
                              {log.status}
                            </span>
                          </div>
                          {log.note ? (
                            <p className="mt-2 text-xs italic text-slate-400">{log.note}</p>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <Table className="min-w-[36rem] text-left text-sm">
                      <TableHeader>
                        <TableRow className="text-xs text-slate-500 uppercase">
                          <TableHead className="px-3 py-2 font-medium">Employee</TableHead>
                          <TableHead className="px-3 py-2 font-medium">Designation</TableHead>
                          <TableHead className="px-3 py-2 font-medium">Date</TableHead>
                          <TableHead className="px-3 py-2 font-medium">Status</TableHead>
                          <TableHead className="px-3 py-2 font-medium">Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedLogs.map((log) => {
                          const m = staff.find((s) => s.id === log.staffId)
                          return (
                            <TableRow key={log.id} className="hover:bg-slate-50/50">
                              <TableCell className="px-3 py-2.5 font-semibold text-slate-900">
                                {m?.fullName || 'Employee'}
                              </TableCell>
                              <TableCell className="px-3 py-2.5 text-slate-600">
                                {m?.designation || '—'}
                              </TableCell>
                              <TableCell className="px-3 py-2.5 font-mono text-xs text-slate-600">
                                {formatAttendanceDate(log.workDate)}
                              </TableCell>
                              <TableCell className="px-3 py-2.5">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset capitalize ${getStatusBadge(log.status)}`}
                                >
                                  {log.status}
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-2.5 italic text-slate-400">
                                {log.note || '—'}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              <TablePagination
                page={logPage}
                pageCount={logPageCount}
                totalItems={logTotal}
                pageSize={logPageSize}
                onPageChange={setLogPage}
                onPageSizeChange={setLogPageSize}
              />
            </SurfaceCard>
          ) : (
            <SurfaceCard
              title={`${monthsList[month]} ${year}`}
              actions={
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="size-8" onClick={prevMonth}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="size-8" onClick={nextMonth}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              }
            >
              <div className="w-full">
                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-400 sm:gap-2 sm:text-xs">
                  <div>S</div>
                  <div>M</div>
                  <div>T</div>
                  <div>W</div>
                  <div>T</div>
                  <div>F</div>
                  <div>S</div>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="h-14 rounded-lg border border-dashed border-slate-100 bg-slate-50/50 sm:h-20"
                    />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1
                    const dayLogs = getLogsForDate(dayNum)
                    const presents = dayLogs.filter((l) => l.status === 'present').length
                    const absents = dayLogs.filter((l) => l.status === 'absent').length
                    return (
                      <div
                        key={`day-${dayNum}`}
                        className="flex h-14 flex-col justify-between rounded-lg border border-border bg-white p-1 hover:bg-slate-50 sm:h-20"
                      >
                        <span className="text-[10px] font-bold text-slate-700 sm:text-xs">{dayNum}</span>
                        {dayLogs.length > 0 ? (
                          <div className="space-y-0.5 text-[8px] sm:text-[10px]">
                            {presents > 0 && (
                              <div className="truncate rounded bg-emerald-50 px-0.5 text-left text-emerald-800 sm:px-1">
                                P:{presents}
                              </div>
                            )}
                            {absents > 0 && (
                              <div className="truncate rounded bg-rose-50 px-0.5 text-left text-rose-800 sm:px-1">
                                A:{absents}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="hidden text-[9px] italic text-slate-300 sm:inline">No logs</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </SurfaceCard>
          )}
        </>
      ) : (
        <SurfaceCard
          title="Daily Attendance Registry"
          description={`Marking attendance for ${formatAttendanceDate(selectedDate)}`}
          actions={
            <Button
              onClick={handleSaveAll}
              disabled={mutating || filteredStaff.length === 0}
              variant="brand"
              className="w-full sm:w-auto"
            >
              Save All
            </Button>
          }
        >
          {/* Same filter layout as Attendance Logs (without Show All Dates) */}
          <AttendanceFilterBar
            dateLabel="Attendance Date"
            dateId="manual-attendance-date"
            dateValue={selectedDate}
            onDateChange={setSelectedDate}
            designationId="manual-filter-desig"
            designationValue={filterDesignation}
            onDesignationChange={setFilterDesignation}
            designations={designations}
          />

          {filteredStaff.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              {staff.length === 0 ? 'No staff to mark' : 'No staff match this designation'}
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredStaff.map((m) => {
                  const local = localAttendance[m.id] || { status: 'present', note: '', isSaved: false }
                  return (
                    <article
                      key={m.id}
                      className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                    >
                      <p className="truncate text-sm font-semibold text-slate-900">{m.fullName}</p>
                      <p className="truncate text-xs text-slate-400">{m.email}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{m.designation || '—'}</p>
                      <div className="mt-3 space-y-2">
                        <NativeSelect
                          value={local.status}
                          onChange={(e) => handleStatusChange(m.id, e.target.value)}
                          className="h-9 w-full py-1"
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="leave">Leave</option>
                          <option value="holiday">Holiday</option>
                        </NativeSelect>
                        <Input
                          placeholder="e.g. Late by 10 mins"
                          value={local.note}
                          onChange={(e) => handleNoteChange(m.id, e.target.value)}
                          className="h-9 text-xs"
                        />
                        <Button
                          size="sm"
                          variant={local.isSaved ? 'outline' : 'default'}
                          style={local.isSaved ? {} : { backgroundColor: BRAND.purple }}
                          className={
                            local.isSaved
                              ? 'w-full border-slate-300 text-slate-700 hover:bg-slate-50'
                              : 'w-full text-white'
                          }
                          onClick={() => handleSaveAttendance(m.id)}
                          disabled={mutating}
                        >
                          {local.isSaved ? 'Update' : 'Save'}
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[38rem] text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="px-3 py-2 font-medium">Employee</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Designation</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Mark Attendance</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Shift Note</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((m) => {
                      const local = localAttendance[m.id] || {
                        status: 'present',
                        note: '',
                        isSaved: false,
                      }
                      return (
                        <TableRow key={m.id} className="hover:bg-slate-50/50">
                          <TableCell className="px-3 py-2.5">
                            <div className="font-semibold text-slate-900">{m.fullName}</div>
                            <div className="text-xs text-slate-400">{m.email}</div>
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-slate-600">
                            {m.designation || '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <NativeSelect
                              value={local.status}
                              onChange={(e) => handleStatusChange(m.id, e.target.value)}
                              className="h-8 w-32 py-1"
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="late">Late</option>
                              <option value="leave">Leave</option>
                              <option value="holiday">Holiday</option>
                            </NativeSelect>
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <Input
                              placeholder="e.g. Late by 10 mins"
                              value={local.note}
                              onChange={(e) => handleNoteChange(m.id, e.target.value)}
                              className="h-8 max-w-[160px] py-0.5 text-xs"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <Button
                              size="sm"
                              variant={local.isSaved ? 'outline' : 'default'}
                              style={local.isSaved ? {} : { backgroundColor: BRAND.purple }}
                              className={
                                local.isSaved
                                  ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                                  : 'text-white'
                              }
                              onClick={() => handleSaveAttendance(m.id)}
                              disabled={mutating}
                            >
                              {local.isSaved ? 'Update' : 'Save'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </SurfaceCard>
      )}
    </div>
  )
}

export default StaffAttendanceTab
