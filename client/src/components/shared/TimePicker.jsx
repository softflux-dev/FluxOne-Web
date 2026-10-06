import { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/constants'

const HOURS_12 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
const DEFAULT_MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
const PERIODS = ['AM', 'PM']

/**
 * Converts 24h string ("09:00", "18:30") to 12h components ({ hour: "09", minute: "00", period: "AM" })
 */
function parse24to12(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
    return { hour: '09', minute: '00', period: 'AM', isSet: false }
  }
  const [hStr, mStr] = timeStr.split(':')
  let hourNum = parseInt(hStr, 10)
  const minuteNum = parseInt(mStr, 10)

  if (Number.isNaN(hourNum) || Number.isNaN(minuteNum)) {
    return { hour: '09', minute: '00', period: 'AM', isSet: false }
  }

  const period = hourNum >= 12 ? 'PM' : 'AM'
  if (hourNum === 0) {
    hourNum = 12
  } else if (hourNum > 12) {
    hourNum -= 12
  }

  const hour = String(hourNum).padStart(2, '0')
  const minute = String(minuteNum).padStart(2, '0')

  return { hour, minute, period, isSet: true }
}

/**
 * Converts 12h components to 24h string ("09:00", "18:30")
 */
function format12to24(hourStr, minuteStr, period) {
  let hourNum = parseInt(hourStr, 10) || 12
  const minuteNum = parseInt(minuteStr, 10) || 0

  if (period === 'PM' && hourNum < 12) {
    hourNum += 12
  } else if (period === 'AM' && hourNum === 12) {
    hourNum = 0
  }

  return `${String(hourNum).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}`
}

/**
 * Formats 24h string to 12h display string ("09:00 AM")
 */
function formatDisplayTime(timeStr) {
  if (!timeStr) return ''
  const parsed = parse24to12(timeStr)
  if (!parsed.isSet) return ''
  return `${parsed.hour}:${parsed.minute} ${parsed.period}`
}

export function TimePicker({
  id,
  name,
  value = '',
  onChange,
  disabled = false,
  placeholder = '--:-- --',
  className = '',
  clearable = true
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const hourListRef = useRef(null)
  const minuteListRef = useRef(null)
  const periodListRef = useRef(null)

  // Current parsed values from props
  const parsedInitial = parse24to12(value)

  // Temporary selection state while picker is open
  const [tempHour, setTempHour] = useState(parsedInitial.hour)
  const [tempMinute, setTempMinute] = useState(parsedInitial.minute)
  const [tempPeriod, setTempPeriod] = useState(parsedInitial.period)

  // Sync temp state whenever value or isOpen changes
  useEffect(() => {
    const p = parse24to12(value)
    setTempHour(p.hour)
    setTempMinute(p.minute)
    setTempPeriod(p.period)
  }, [value, isOpen])

  // Scroll selected items into view when opened
  useEffect(() => {
    if (isOpen) {
      const scrollSelected = (container, valueSelector) => {
        if (!container) return
        const activeElem = container.querySelector(valueSelector)
        if (activeElem) {
          activeElem.scrollIntoView({ block: 'center', behavior: 'instant' })
        }
      }

      setTimeout(() => {
        scrollSelected(hourListRef.current, `[data-value="${tempHour}"]`)
        scrollSelected(minuteListRef.current, `[data-value="${tempMinute}"]`)
        scrollSelected(periodListRef.current, `[data-value="${tempPeriod}"]`)
      }, 10)
    }
  }, [isOpen, tempHour, tempMinute, tempPeriod])

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Cancel/close without saving
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const emitChange = (nextValue) => {
    if (!onChange) return
    onChange({
      target: {
        id: id || name,
        name: name || id,
        value: nextValue
      }
    })
  }

  const handleCancel = (e) => {
    e?.stopPropagation()
    const p = parse24to12(value)
    setTempHour(p.hour)
    setTempMinute(p.minute)
    setTempPeriod(p.period)
    setIsOpen(false)
  }

  const handleConfirm = (e) => {
    e?.stopPropagation()
    emitChange(format12to24(tempHour, tempMinute, tempPeriod))
    setIsOpen(false)
  }

  const handleClear = (e) => {
    e?.stopPropagation()
    emitChange('')
    setIsOpen(false)
  }
  // Ensure minute list includes the temp minute if not in 5-min intervals
  const minutesList = DEFAULT_MINUTES.includes(tempMinute)
    ? DEFAULT_MINUTES
    : [...DEFAULT_MINUTES, tempMinute].sort((a, b) => parseInt(a, 10) - parseInt(b, 10))

  const displayString = formatDisplayTime(value)

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-left font-normal text-slate-800 shadow-sm transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          isOpen
            ? 'border-[#8E238F] ring-2 ring-[#8E238F]/25'
            : 'hover:border-slate-300 focus-visible:border-[#8E238F] focus-visible:ring-2 focus-visible:ring-[#8E238F]/25',
          !displayString && 'text-slate-400',
        )}
      >
        <span className={cn('truncate', displayString ? 'text-slate-900 font-medium' : 'text-slate-400')}>
          {displayString || placeholder}
        </span>
        <Clock className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[190px] rounded-2xl border border-slate-200/90 bg-white shadow-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-100 overflow-hidden select-none">
          <div className="flex h-[210px] divide-x divide-slate-100 text-center text-sm">
            {/* Hours Column */}
            <div
              ref={hourListRef}
              className="flex-1 overflow-y-auto py-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {HOURS_12.map((h) => {
                const isSelected = h === tempHour
                return (
                  <button
                    key={h}
                    type="button"
                    data-value={h}
                    onClick={() => setTempHour(h)}
                    style={isSelected ? { backgroundColor: BRAND.purple } : undefined}
                    className={cn(
                      'w-full h-9 flex items-center justify-center text-sm transition-colors cursor-pointer',
                      isSelected
                        ? 'text-white font-medium'
                        : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {h}
                  </button>
                )
              })}
            </div>

            {/* Minutes Column */}
            <div
              ref={minuteListRef}
              className="flex-1 overflow-y-auto py-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {minutesList.map((m) => {
                const isSelected = m === tempMinute
                return (
                  <button
                    key={m}
                    type="button"
                    data-value={m}
                    onClick={() => setTempMinute(m)}
                    style={isSelected ? { backgroundColor: BRAND.purple } : undefined}
                    className={cn(
                      'w-full h-9 flex items-center justify-center text-sm transition-colors cursor-pointer',
                      isSelected
                        ? 'text-white font-medium'
                        : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {m}
                  </button>
                )
              })}
            </div>

            {/* Period Column (AM/PM) */}
            <div
              ref={periodListRef}
              className="flex-1 overflow-y-auto py-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {PERIODS.map((p) => {
                const isSelected = p === tempPeriod
                return (
                  <button
                    key={p}
                    type="button"
                    data-value={p}
                    onClick={() => setTempPeriod(p)}
                    style={isSelected ? { backgroundColor: BRAND.purple } : undefined}
                    className={cn(
                      'w-full h-9 flex items-center justify-center text-sm transition-colors cursor-pointer',
                      isSelected
                        ? 'text-white font-medium'
                        : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 bg-white">
            {clearable && value ? (
              <button type="button" onClick={handleClear} className="text-sm font-medium text-slate-500 hover:opacity-75 cursor-pointer">
                Clear
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-4">
              <button type="button" onClick={handleCancel} style={{ color: BRAND.purple }} className="text-sm font-medium hover:opacity-75 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleConfirm} style={{ color: BRAND.purple }} className="text-sm font-medium hover:opacity-75 cursor-pointer">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

