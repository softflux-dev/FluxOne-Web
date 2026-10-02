import { Label } from '@/components/ui/label'
import { TimePicker } from '@/components/shared/TimePicker'
import { WorkingDaysPicker } from '@/components/shared/WorkingDaysPicker'
import { FieldError } from '@/components/shared/FieldError'
import { formatClockTime } from '@/lib/formatDateTime'
import { formatWorkingDaysShort } from '@/lib/validation/branchForms'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'

// Reusable staff schedule block: working days + shift + break.
export function StaffScheduleFields({
  form,
  branchHours,
  hoursWarning,
  fieldErrors = {},
  onPatch,
  ids = {
    workingDays: 'staff-working-days',
    scheduleStart: 'staff-start',
    scheduleEnd: 'staff-end',
    scheduleBreakStart: 'staff-break-start',
    scheduleBreakEnd: 'staff-break-end',
  },
}) {
  const branchDaysLabel = formatWorkingDaysShort(branchHours?.workingDays)

  return (
    <>
      <div className="space-y-1.5">
        <Label id={ids.workingDays}>Working days *</Label>
        <WorkingDaysPicker
          value={form.workingDays}
          allowedDays={branchHours?.workingDays}
          onChange={(days) => onPatch?.('workingDays', days)}
        />
        <FieldError message={fieldErrors.workingDays} />
        {branchDaysLabel ? (
          <p className="text-xs text-slate-500">
            Branch calendar: {branchDaysLabel}. Staff days must stay within it.
          </p>
        ) : null}
      </div>

      {hoursWarning ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-100 sm:col-span-2">
          {hoursWarning}
        </p>
      ) : branchHours?.openingTime && branchHours?.closingTime ? (
        <p className="text-xs text-slate-500 sm:col-span-2">
          Branch hours: {formatClockTime(branchHours.openingTime)} –{' '}
          {formatClockTime(branchHours.closingTime)}. Shift must fall inside this window.
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor={ids.scheduleStart}>Start Time</Label>
        <TimePicker
          id={ids.scheduleStart}
          value={form.scheduleStart}
          onChange={(e) => onPatch?.('scheduleStart', e.target.value)}
          className={fieldErrorClass(fieldErrors.scheduleStart)}
        />
        <FieldError message={fieldErrors.scheduleStart} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.scheduleEnd}>End Time</Label>
        <TimePicker
          id={ids.scheduleEnd}
          value={form.scheduleEnd}
          onChange={(e) => onPatch?.('scheduleEnd', e.target.value)}
          className={fieldErrorClass(fieldErrors.scheduleEnd)}
        />
        <FieldError message={fieldErrors.scheduleEnd} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.scheduleBreakStart}>Break from</Label>
        <TimePicker
          id={ids.scheduleBreakStart}
          value={form.scheduleBreakStart}
          onChange={(e) => onPatch?.('scheduleBreakStart', e.target.value)}
          className={fieldErrorClass(fieldErrors.scheduleBreakStart)}
        />
        <FieldError message={fieldErrors.scheduleBreakStart} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.scheduleBreakEnd}>Break to</Label>
        <TimePicker
          id={ids.scheduleBreakEnd}
          value={form.scheduleBreakEnd}
          onChange={(e) => onPatch?.('scheduleBreakEnd', e.target.value)}
          className={fieldErrorClass(fieldErrors.scheduleBreakEnd)}
        />
        <FieldError message={fieldErrors.scheduleBreakEnd} />
      </div>
    </>
  )
}
