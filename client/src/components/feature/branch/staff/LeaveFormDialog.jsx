import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { FormDialog, DialogCancelButton } from '@/components/shared/FormDialog'
import { StaffEmployeeChecklist } from '@/components/feature/branch/staff/StaffEmployeeChecklist'
import { FieldError } from '@/components/shared/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toastError, toastSuccess } from '@/lib/toast'
import { validateLeaveFormFields } from '@/lib/validation/branchForms'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { apiClient } from '@/api/api'

const FIELD_IDS = {
  startDate: 'leave-start',
  endDate: 'leave-end',
  employees: 'leave-employees',
}

const LEAVE_FIELD_ORDER = ['startDate', 'endDate', 'employees']

// Create Leave wizard (2 steps) — opened from Staff Management header CTA.
export function LeaveFormDialog({
  open,
  onOpenChange,
  designations = [],
  staff = [],
  onSuccess,
}) {
  const [step, setStep] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [filterDesignation, setFilterDesignation] = useState('')
  const [mutating, setMutating] = useState(false)
  const { fieldErrors, formError, resetErrors, clearField, applyErrors } = useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  const resetForm = () => {
    setStep(1)
    setStartDate('')
    setEndDate('')
    setReason('')
    setSelectedEmployees([])
    setFilterDesignation('')
  }

  useEffect(() => {
    if (!open) {
      resetForm()
      return
    }
    resetErrors()
    resetForm()
    // Empty create baseline — confirm only after user types/selects
    captureBaseline({
      startDate: '',
      endDate: '',
      reason: '',
      selectedEmployees: [],
    })
  }, [open, resetErrors, captureBaseline])

  const dirty = isDirty({
    startDate,
    endDate,
    reason,
    selectedEmployees: [...selectedEmployees].map(String).sort(),
  })

  const handleNextStep = () => {
    const errors = validateLeaveFormFields({ reason, startDate, endDate })
    if (Object.keys(errors).length) {
      applyErrors(errors, FIELD_IDS, LEAVE_FIELD_ORDER)
      return
    }
    resetErrors()
    setStep(2)
  }

  const handleCheckboxToggle = (employeeId) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId],
    )
    clearField('employees')
  }

  const handleSelectAllFiltered = (filteredStaff) => {
    const filteredIds = filteredStaff.map((s) => s.id)
    const allSelected = filteredIds.every((id) => selectedEmployees.includes(id))
    if (allSelected) {
      setSelectedEmployees((prev) => prev.filter((id) => !filteredIds.includes(id)))
    } else {
      setSelectedEmployees((prev) => {
        const next = [...prev]
        filteredIds.forEach((id) => {
          if (!next.includes(id)) next.push(id)
        })
        return next
      })
    }
    clearField('employees')
  }

  const handleSave = async () => {
    if (selectedEmployees.length === 0) {
      applyErrors(
        { employees: 'Please select at least one employee' },
        FIELD_IDS,
        LEAVE_FIELD_ORDER,
      )
      return
    }
    resetErrors()
    setMutating(true)
    try {
      const res = await apiClient.post('/branch/leaves', {
        employeeIds: selectedEmployees,
        startDate,
        endDate,
        reason,
      })
      if (res.success) {
        toastSuccess('Leave recorded and scheduled successfully')
        onOpenChange?.(false)
        onSuccess?.()
      } else {
        toastError(res.error || 'Failed to submit leave request')
      }
    } catch (err) {
      toastError(err?.message || 'Failed to submit leave request')
    } finally {
      setMutating(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty}
      title="Add Staff Leave"
      description="Register single or bulk employee leaves (approved immediately)"
      contentClassName="sm:max-w-lg"
      footer={
        step === 1 ? (
          <>
            <DialogCancelButton disabled={mutating} />
            <Button type="button" onClick={handleNextStep} variant="brand">
              Next: Select Employees
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" disabled={mutating} onClick={() => setStep(1)}>
              <ArrowLeft className="mr-1 size-4" />
              Back
            </Button>
            <Button type="button" loading={mutating} onClick={handleSave} variant="brand">
              Apply & Save
            </Button>
          </>
        )
      }
    >
      {formError ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4 py-1">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
            <strong>Step 1:</strong> Configure leave dates and reason.
          </div>
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="leave-start">Start Date</Label>
                <Input
                  id="leave-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    clearField('startDate')
                  }}
                  aria-invalid={Boolean(fieldErrors.startDate)}
                  className={fieldErrorClass(fieldErrors.startDate)}
                />
                <FieldError message={fieldErrors.startDate} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leave-end">End Date</Label>
                <Input
                  id="leave-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    clearField('endDate')
                  }}
                  aria-invalid={Boolean(fieldErrors.endDate)}
                  className={fieldErrorClass(fieldErrors.endDate)}
                />
                <FieldError message={fieldErrors.endDate} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-reason">Reason / Note</Label>
            <Input
              id="leave-reason"
              placeholder="e.g. Sick Leave, Annual Leave"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4 py-1">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-xs text-emerald-800">
            <strong>Step 2:</strong> Select single or multiple employees.
          </div>
          <div id="leave-employees" tabIndex={-1}>
            <StaffEmployeeChecklist
              designations={designations}
              staff={staff}
              selectedIds={selectedEmployees}
              filterDesignation={filterDesignation}
              onFilterChange={setFilterDesignation}
              onToggle={handleCheckboxToggle}
              onSelectAllFiltered={handleSelectAllFiltered}
            />
          </div>
          <FieldError message={fieldErrors.employees} />
        </div>
      )}
    </FormDialog>
  )
}

export default LeaveFormDialog
