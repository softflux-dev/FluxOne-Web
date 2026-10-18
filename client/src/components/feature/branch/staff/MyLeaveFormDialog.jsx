import { useEffect, useState } from 'react'
import { FormDialog, DialogCancelButton } from '@/components/shared/FormDialog'
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
  startDate: 'my-leave-start',
  endDate: 'my-leave-end',
}

const LEAVE_FIELD_ORDER = ['startDate', 'endDate']

// BM self-leave form — dates + reason only (no employee picker)
export function MyLeaveFormDialog({ open, onOpenChange, onSuccess }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [mutating, setMutating] = useState(false)
  const { fieldErrors, formError, resetErrors, clearField, applyErrors } = useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  const resetForm = () => {
    setStartDate('')
    setEndDate('')
    setReason('')
  }

  useEffect(() => {
    if (!open) {
      resetForm()
      return
    }
    resetErrors()
    resetForm()
    captureBaseline({ startDate: '', endDate: '', reason: '' })
  }, [open, resetErrors, captureBaseline])

  const dirty = isDirty({ startDate, endDate, reason })

  const handleSubmit = async (event) => {
    event.preventDefault()
    const errors = validateLeaveFormFields({ reason, startDate, endDate })
    if (Object.keys(errors).length) {
      applyErrors(errors, FIELD_IDS, LEAVE_FIELD_ORDER)
      return
    }

    resetErrors()
    setMutating(true)
    try {
      const res = await apiClient.post('/branch/leaves/me', {
        startDate,
        endDate,
        reason,
      })

      if (res.success) {
        toastSuccess('Leave request submitted for Admin approval')
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
      title="Apply for Leave"
      description="Submit your personal leave request for Admin approval"
      contentClassName="sm:max-w-lg"
      footer={
        <>
          <DialogCancelButton disabled={mutating} />
          <Button type="submit" form="my-leave-form" disabled={mutating} variant="brand">
            {mutating ? 'Submitting…' : 'Submit Request'}
          </Button>
        </>
      }
    >
      {formError ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
      ) : null}

      <form id="my-leave-form" className="space-y-4 py-1" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="my-leave-start">Start Date</Label>
            <Input
              id="my-leave-start"
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
            <Label htmlFor="my-leave-end">End Date</Label>
            <Input
              id="my-leave-end"
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
        <div className="space-y-1.5">
          <Label htmlFor="my-leave-reason">Reason / Note</Label>
          <Input
            id="my-leave-reason"
            placeholder="e.g. Sick Leave, Annual Leave"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </form>
    </FormDialog>
  )
}

export default MyLeaveFormDialog
