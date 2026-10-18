import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { FormDialog, DialogCancelButton } from '@/components/shared/FormDialog'
import { StaffEmployeeChecklist } from '@/components/feature/branch/staff/StaffEmployeeChecklist'
import { FieldError } from '@/components/shared/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toastError, toastSuccess } from '@/lib/toast'
import { validateHolidayFormFields } from '@/lib/validation/branchForms'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { apiClient } from '@/api/api'

const FIELD_IDS = {
  name: 'holiday-name',
  startDate: 'holiday-start',
  endDate: 'holiday-end',
  employees: 'holiday-employees',
}

const HOLIDAY_FIELD_ORDER = ['name', 'startDate', 'endDate', 'employees']

// Create Holiday wizard (2 steps) — opened from Staff Management header CTA.
export function HolidayFormDialog({
  open,
  onOpenChange,
  designations = [],
  staff = [],
  onSuccess,
}) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [filterDesignation, setFilterDesignation] = useState('')
  const [mutating, setMutating] = useState(false)
  const { fieldErrors, formError, resetErrors, clearField, applyErrors } = useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  const resetForm = () => {
    setStep(1)
    setName('')
    setStartDate('')
    setEndDate('')
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
    captureBaseline({
      name: '',
      startDate: '',
      endDate: '',
      selectedEmployees: [],
    })
  }, [open, resetErrors, captureBaseline])

  const dirty = isDirty({
    name,
    startDate,
    endDate,
    selectedEmployees: [...selectedEmployees].map(String).sort(),
  })

  const handleNextStep = () => {
    const errors = validateHolidayFormFields({ name, startDate, endDate })
    if (Object.keys(errors).length) {
      applyErrors(errors, FIELD_IDS, HOLIDAY_FIELD_ORDER)
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
        HOLIDAY_FIELD_ORDER,
      )
      return
    }
    resetErrors()
    setMutating(true)
    try {
      const res = await apiClient.post('/branch/holidays', {
        name,
        startDate,
        endDate,
        employeeIds: selectedEmployees,
      })
      if (res.success) {
        toastSuccess('Holiday added and marked on employee attendance sheets')
        onOpenChange?.(false)
        onSuccess?.()
      } else {
        toastError(res.error || 'Failed to save holiday')
      }
    } catch (err) {
      toastError(err?.message || 'Failed to save holiday')
    } finally {
      setMutating(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty}
      title="Add Holiday Schedule"
      description="Register a holiday and apply to team roster"
      contentClassName="sm:max-w-lg"
      footer={
        step === 1 ? (
          <>
            <DialogCancelButton disabled={mutating} />
            <Button
              type="button"
              onClick={handleNextStep}
              variant="brand"
            >
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
            <Button
              type="button"
              disabled={mutating}
              onClick={handleSave}
              variant="brand"
            >
              {mutating ? 'Saving…' : 'Apply Holiday'}
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
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-500">
            <strong>Step 1:</strong> Configure holiday details and dates.
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holiday-name">Holiday Name</Label>
            <Input
              id="holiday-name"
              placeholder="e.g. Independence Day"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                clearField('name')
              }}
              aria-invalid={Boolean(fieldErrors.name)}
              className={fieldErrorClass(fieldErrors.name)}
            />
            <FieldError message={fieldErrors.name} />
          </div>
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="holiday-start">Start Date</Label>
                <Input
                  id="holiday-start"
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
                <Label htmlFor="holiday-end">End Date</Label>
                <Input
                  id="holiday-end"
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
        </div>
      ) : (
        <div className="space-y-4 py-1">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-xs text-emerald-800">
            <strong>Step 2:</strong> Checklist selected employees.
          </div>
          <div id="holiday-employees" tabIndex={-1}>
            <StaffEmployeeChecklist
              designations={designations}
              staff={staff}
              selectedIds={selectedEmployees}
              filterDesignation={filterDesignation}
              onFilterChange={setFilterDesignation}
              onToggle={handleCheckboxToggle}
              onSelectAllFiltered={handleSelectAllFiltered}
              selectedLabel="Apply to Filtered"
            />
          </div>
          <FieldError message={fieldErrors.employees} />
        </div>
      )}
    </FormDialog>
  )
}

export default HolidayFormDialog
