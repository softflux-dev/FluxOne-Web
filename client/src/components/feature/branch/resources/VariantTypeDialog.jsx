import { useEffect, useState } from 'react'
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
import { FieldError } from '@/components/shared/FieldError'
import { BRAND } from '@/lib/constants'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { validateVariantTypeFormFields } from '@/lib/validation/branchForms'
import { cn } from '@/lib/utils'

export function VariantTypeDialog({
  open,
  onOpenChange,
  mode = 'create',
  initial = null,
  loading = false,
  onSubmit,
}) {
  const isEdit = mode === 'edit'
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  useEffect(() => {
    if (!open) return
    resetErrors()
    const snapshot = {
      name: initial?.name || '',
      isActive: initial?.isActive !== false,
    }
    setName(snapshot.name)
    setIsActive(snapshot.isActive)
    captureBaseline(snapshot)
  }, [open, initial, captureBaseline, resetErrors])

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = validateVariantTypeFormFields({ name })
    if (Object.keys(errors).length) {
      applyErrors(errors, { name: 'variant-type-name' }, ['name'])
      return
    }
    resetErrors()
    try {
      const result = await onSubmit?.({ name: name.trim(), isActive })
      if (result?.success) onOpenChange?.(false)
      else setFormError(result?.error || 'Save failed. Please try again.')
    } catch (err) {
      setFormError(err?.message || 'Save failed. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty({ name, isActive })}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit variant type' : 'Add variant type'}</DialogTitle>
          <DialogDescription>
            Configure a variant type name and active status for inventory selection.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="variant-type-name">Variant Type Name</Label>
            <Input
              id="variant-type-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                clearField('name')
              }}
              placeholder="e.g. Color, Flavour, Size, Weight"
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

export default VariantTypeDialog
