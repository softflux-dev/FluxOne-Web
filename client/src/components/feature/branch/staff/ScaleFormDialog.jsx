import { useEffect, useMemo, useState } from 'react'
import { FormDialog, DialogCancelButton } from '@/components/shared/FormDialog'
import { FieldError } from '@/components/shared/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import {
  parseScaleMaxPoints,
  SCALE_SUM_TARGET,
  sumScalePoints,
} from '@/lib/performanceScales'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'

const EMPTY = { name: '', maxPoints: '' }

const FIELD_IDS = {
  name: 'scale-name',
  maxPoints: 'scale-points',
}

const SCALE_FIELD_ORDER = ['name', 'maxPoints']

// Add / Edit one criterion in the local draft (parent saves the full version)
export function ScaleFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialScale = null,
  scales = [],
  onApply,
}) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState(EMPTY)
  const [touchedPoints, setTouchedPoints] = useState(false)
  const { fieldErrors, formError, resetErrors, clearField, applyErrors } = useFieldErrors()

  const excludeId = isEdit ? initialScale?.id : null
  const otherUsed = useMemo(() => sumScalePoints(scales, excludeId), [scales, excludeId])

  useEffect(() => {
    if (!open) {
      setForm(EMPTY)
      setTouchedPoints(false)
      return
    }
    resetErrors()
    setTouchedPoints(false)
    if (isEdit && initialScale) {
      setForm({
        name: initialScale.name || '',
        maxPoints: String(initialScale.maxPoints ?? ''),
      })
    } else {
      setForm({ name: '', maxPoints: '' })
    }
  }, [open, isEdit, initialScale, resetErrors])

  const parsed = parseScaleMaxPoints(form.maxPoints)
  const pointsValue = parsed.ok ? parsed.value : null
  const rangeError =
    form.maxPoints !== '' && !parsed.ok
      ? parsed.error
      : touchedPoints && form.maxPoints === ''
        ? parsed.error
        : null

  const pointsHint = fieldErrors.maxPoints || rangeError
  const projectedTotal = pointsValue == null ? otherUsed : otherUsed + pointsValue
  const overBudget = projectedTotal > SCALE_SUM_TARGET
  const canSubmit = Boolean(form.name.trim()) && parsed.ok && !overBudget

  const dirty =
    isEdit && initialScale
      ? form.name !== (initialScale.name || '') ||
        String(form.maxPoints) !== String(initialScale.maxPoints ?? '')
      : Boolean(form.name || form.maxPoints)

  const handleSubmit = (e) => {
    e.preventDefault()
    setTouchedPoints(true)

    const errors = {}
    const name = form.name.trim()
    if (!name) errors.name = 'Criteria name is required'

    const check = parseScaleMaxPoints(form.maxPoints)
    if (!check.ok) errors.maxPoints = check.error
    else if (otherUsed + check.value > SCALE_SUM_TARGET) {
      errors.maxPoints = `Total cannot exceed ${SCALE_SUM_TARGET} (remaining ${Math.max(0, SCALE_SUM_TARGET - otherUsed)})`
    }

    if (Object.keys(errors).length) {
      applyErrors(errors, FIELD_IDS, SCALE_FIELD_ORDER)
      return
    }

    resetErrors()
    onApply?.({
      id: isEdit ? initialScale?.id : undefined,
      name,
      maxPoints: check.value,
      _localKey: isEdit ? initialScale?._localKey : `local-${Date.now()}`,
    })
    onOpenChange?.(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty}
      title={isEdit ? 'Edit Criterion' : 'Add Criterion'}
      description={`Maximums across all criteria must total exactly ${SCALE_SUM_TARGET}.`}
      contentClassName="sm:max-w-md"
      footer={
        <>
          <DialogCancelButton />
          <Button type="submit" form="scale-form" disabled={!canSubmit} variant="brand">
            {isEdit ? 'Update' : 'Add'}
          </Button>
        </>
      }
    >
      {formError ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
      ) : null}

      <form id="scale-form" className="space-y-4 py-1" onSubmit={handleSubmit} noValidate>
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            overBudget || pointsHint
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : projectedTotal === SCALE_SUM_TARGET
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          Projected total: <strong>{projectedTotal}</strong> / {SCALE_SUM_TARGET}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="scale-name">Criteria Name</Label>
          <Input
            id="scale-name"
            placeholder="e.g. Customer Service"
            value={form.name}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, name: e.target.value }))
              clearField('name')
            }}
            aria-invalid={Boolean(fieldErrors.name)}
            className={fieldErrorClass(fieldErrors.name)}
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="scale-points">Maximum Score Points</Label>
          <WholeNumberInput
            id="scale-points"
            min={1}
            max={SCALE_SUM_TARGET}
            placeholder="e.g. 25"
            value={form.maxPoints}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, maxPoints: e.target.value }))
              clearField('maxPoints')
            }}
            onBlur={() => setTouchedPoints(true)}
            aria-invalid={Boolean(fieldErrors.maxPoints || rangeError || overBudget)}
            className={fieldErrorClass(fieldErrors.maxPoints || rangeError || overBudget)}
          />
          <FieldError message={fieldErrors.maxPoints || (touchedPoints ? rangeError : null)} />
        </div>
      </form>
    </FormDialog>
  )
}

export default ScaleFormDialog
