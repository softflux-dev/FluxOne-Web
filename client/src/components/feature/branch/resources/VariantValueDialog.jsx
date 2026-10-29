import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { FieldError } from '@/components/shared/FieldError'
import { BRAND } from '@/lib/constants'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { validateVariantValueFormFields } from '@/lib/validation/branchForms'
import { cn } from '@/lib/utils'

export function VariantValueDialog({
  open,
  onOpenChange,
  mode = 'create',
  initial = null,
  types = [],
  lockedTypeId = null,
  loading = false,
  onSubmit,
}) {
  const isEdit = mode === 'edit'
  const [variantTypeId, setVariantTypeId] = useState('')
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  const typeOptions = useMemo(() => {
    const active = (types || []).filter((t) => t.isActive !== false)
    if (isEdit && initial?.variantTypeId) {
      const current = (types || []).find((t) => t.id === initial.variantTypeId)
      if (current && !active.some((t) => t.id === current.id)) {
        return [...active, current]
      }
    }
    if (lockedTypeId) {
      const locked = (types || []).find((t) => t.id === lockedTypeId)
      if (locked && !active.some((t) => t.id === locked.id)) {
        return [...active, locked]
      }
    }
    return active
  }, [types, isEdit, initial?.variantTypeId, lockedTypeId])

  useEffect(() => {
    if (!open) return
    resetErrors()
    const snapshot = {
      variantTypeId: lockedTypeId || initial?.variantTypeId || '',
      name: initial?.name || '',
      isActive: initial?.isActive !== false,
    }
    setVariantTypeId(snapshot.variantTypeId)
    setName(snapshot.name)
    setIsActive(snapshot.isActive)
    captureBaseline(snapshot)
  }, [open, initial, lockedTypeId, captureBaseline, resetErrors])

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = validateVariantValueFormFields({ name, variantTypeId })
    if (Object.keys(errors).length) {
      applyErrors(
        errors,
        { name: 'variant-value-name', variantTypeId: 'variant-value-type' },
        ['variantTypeId', 'name'],
      )
      return
    }
    resetErrors()
    try {
      const result = await onSubmit?.({
        variantTypeId,
        name: name.trim(),
        isActive,
      })
      if (result?.success) onOpenChange?.(false)
      else setFormError(result?.error || 'Save failed. Please try again.')
    } catch (err) {
      setFormError(err?.message || 'Save failed. Please try again.')
    }
  }

  const typeLocked = Boolean(lockedTypeId) && !isEdit

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={isDirty({ variantTypeId, name, isActive })}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit variant value' : 'Add variant value'}</DialogTitle>
          <DialogDescription>
            Map a value to a variant type (e.g. Red under Color, 250g under Weight).
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="variant-value-type">Variant Type</Label>
            <NativeSelect
              id="variant-value-type"
              value={variantTypeId}
              disabled={typeLocked}
              onChange={(event) => {
                setVariantTypeId(event.target.value)
                clearField('variantTypeId')
              }}
              aria-invalid={Boolean(fieldErrors.variantTypeId)}
              className={cn('cursor-pointer', fieldErrorClass(fieldErrors.variantTypeId))}
            >
              <option value="">Select variant type</option>
              {typeOptions.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                  {type.isActive === false ? ' (Inactive)' : ''}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={fieldErrors.variantTypeId} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="variant-value-name">Value Name</Label>
            <Input
              id="variant-value-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                clearField('name')
              }}
              placeholder="e.g. Red, Vanilla, 250g"
              aria-invalid={Boolean(fieldErrors.name)}
              className={fieldErrorClass(fieldErrors.name)}
            />
            <FieldError message={fieldErrors.name} />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={cn(
                  'cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                    : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={cn(
                  'cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors',
                  !isActive
                    ? 'bg-slate-100 text-slate-700 ring-slate-300'
                    : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                )}
              >
                Inactive
              </button>
            </div>
          </div>

          <DialogFooter>
            <DialogCancelButton className="cursor-pointer" />
            <Button
              type="submit"
              className="cursor-pointer text-white"
              style={{ background: BRAND.purple }}
              loading={loading}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default VariantValueDialog
