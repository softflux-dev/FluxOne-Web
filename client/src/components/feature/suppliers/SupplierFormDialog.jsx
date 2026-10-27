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
import { NativeSelect } from '@/components/ui/select'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { FieldError } from '@/components/shared/FieldError'
import { PhoneInput } from '@/components/shared/PhoneInput'
import { BRAND } from '@/lib/constants'
import {
  SUPPLIER_FIELD_ORDER,
  validateSupplierFormFields,
} from '@/lib/validation/supplierForm'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useFormBaseline } from '@/hooks/useFormBaseline'

const EMPTY = {
  companyName: '',
  companyPhone: '',
  representativeName: '',
  representativePhone: '',
  representativeEmail: '',
  location: '',
  taxPaid: false,
  registrationNumber: '',
  bankAccountNumber: '',
  image: null,
  signature: null,
}

const FIELD_IDS = {
  companyName: 'sup-company',
  companyPhone: 'sup-phone',
  representativeName: 'sup-rep-name',
  representativePhone: 'sup-rep-phone',
  representativeEmail: 'sup-rep-email',
  location: 'sup-location',
  registrationNumber: 'sup-reg',
}

// Add / Edit supplier — fields align with tech lead + createSupplierSchema.
export function SupplierFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialSupplier = null,
  loading = false,
  onSubmit,
}) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)
  const busy = loading || submitting

  // Reset only when dialog opens / switches supplier — not on every parent re-render
  // (avoids wiping File previews when list refresh replaces initialSupplier reference).
  const editSupplierId = isEdit ? initialSupplier?.id || null : null
  useEffect(() => {
    if (!open) return
    resetErrors()
    setSubmitting(false)
    if (isEdit && initialSupplier) {
      const nextForm = {
        companyName: initialSupplier.companyName || '',
        companyPhone: initialSupplier.companyPhone || '',
        representativeName: initialSupplier.representativeName || '',
        representativePhone: initialSupplier.representativePhone || '',
        representativeEmail: initialSupplier.representativeEmail || '',
        location: initialSupplier.location || '',
        taxPaid: Boolean(initialSupplier.taxPaid),
        registrationNumber: initialSupplier.registrationNumber || '',
        bankAccountNumber: initialSupplier.bankAccountNumber || '',
        image: null,
        signature: null,
      }
      setForm(nextForm)
      captureBaseline(nextForm)
    } else {
      const nextForm = { ...EMPTY }
      setForm(nextForm)
      captureBaseline(nextForm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed by editSupplierId
  }, [open, isEdit, editSupplierId, captureBaseline, resetErrors])

  // Patch one field only — image and signature stay independent
  function patch(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    clearField(field)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return

    const errors = validateSupplierFormFields(form)
    if (Object.keys(errors).length) {
      applyErrors(errors, FIELD_IDS, SUPPLIER_FIELD_ORDER)
      return
    }

    resetErrors()
    setSubmitting(true)
    try {
      const result = await onSubmit?.(form)
      if (result?.success) {
        // Parent setter closes immediately (bypasses Discard) + toast from page
        onOpenChange?.(false)
        return
      }
      setFormError(result?.error || 'Save failed. Please try again.')
    } catch (err) {
      setFormError(err?.message || 'Save failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty(form)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit supplier' : 'Add supplier'}</DialogTitle>
          <DialogDescription>
            Vendor master data used by purchase orders and product purchase history.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sup-company">Company name</Label>
              <Input
                id="sup-company"
                value={form.companyName}
                onChange={(e) => patch('companyName', e.target.value)}
                placeholder="Company name"
                aria-invalid={Boolean(fieldErrors.companyName)}
                className={fieldErrorClass(fieldErrors.companyName)}
                disabled={busy}
              />
              <FieldError message={fieldErrors.companyName} />
            </div>

            <ImageUploadField
              key="sup-company-image"
              id="sup-image"
              name="image"
              label="Image"
              optionalLabel="(optional)"
              value={form.image}
              existingImageUrl={isEdit ? initialSupplier?.imageUrl : null}
              onChange={(file) => patch('image', file)}
            />

            <div className="space-y-1.5">
              <Label htmlFor="sup-phone">Company contact number</Label>
              <PhoneInput
                id="sup-phone"
                value={form.companyPhone}
                onChange={(val) => patch('companyPhone', val)}
                className={fieldErrorClass(fieldErrors.companyPhone)}
              />
              <FieldError message={fieldErrors.companyPhone} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sup-rep-name">Representative person name</Label>
              <Input
                id="sup-rep-name"
                value={form.representativeName}
                onChange={(e) => patch('representativeName', e.target.value)}
                aria-invalid={Boolean(fieldErrors.representativeName)}
                className={fieldErrorClass(fieldErrors.representativeName)}
                disabled={busy}
              />
              <FieldError message={fieldErrors.representativeName} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sup-rep-phone">Representative contact number</Label>
              <PhoneInput
                id="sup-rep-phone"
                value={form.representativePhone}
                onChange={(val) => patch('representativePhone', val)}
                className={fieldErrorClass(fieldErrors.representativePhone)}
              />
              <FieldError message={fieldErrors.representativePhone} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sup-rep-email">Representative email</Label>
              <Input
                id="sup-rep-email"
                type="email"
                value={form.representativeEmail}
                onChange={(e) => patch('representativeEmail', e.target.value)}
                aria-invalid={Boolean(fieldErrors.representativeEmail)}
                className={fieldErrorClass(fieldErrors.representativeEmail)}
                disabled={busy}
              />
              <FieldError message={fieldErrors.representativeEmail} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sup-location">Company location</Label>
              <Input
                id="sup-location"
                value={form.location}
                onChange={(e) => patch('location', e.target.value)}
                aria-invalid={Boolean(fieldErrors.location)}
                className={fieldErrorClass(fieldErrors.location)}
                disabled={busy}
              />
              <FieldError message={fieldErrors.location} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sup-tax">Tax paid or not</Label>
              <NativeSelect
                id="sup-tax"
                value={form.taxPaid ? 'yes' : 'no'}
                onChange={(e) => patch('taxPaid', e.target.value === 'yes')}
                disabled={busy}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sup-reg">Registration number</Label>
              <Input
                id="sup-reg"
                value={form.registrationNumber}
                onChange={(e) => patch('registrationNumber', e.target.value)}
                aria-invalid={Boolean(fieldErrors.registrationNumber)}
                className={fieldErrorClass(fieldErrors.registrationNumber)}
                disabled={busy}
              />
              <FieldError message={fieldErrors.registrationNumber} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sup-bank">Bank account number (optional)</Label>
              <Input
                id="sup-bank"
                value={form.bankAccountNumber}
                onChange={(e) => patch('bankAccountNumber', e.target.value)}
                disabled={busy}
              />
            </div>

            <ImageUploadField
              key="sup-digital-signature"
              id="sup-signature"
              name="signature"
              label="Digital signature"
              optionalLabel="(optional)"
              className="sm:col-span-2"
              value={form.signature}
              existingImageUrl={isEdit ? initialSupplier?.signatureUrl : null}
              onChange={(file) => patch('signature', file)}
            />
          </div>

          <DialogFooter>
            <DialogCancelButton className="cursor-pointer" disabled={busy} />
            <Button
              type="submit"
              className="cursor-pointer text-white"
              style={{ background: BRAND.purple }}
              loading={busy}
            >
              {isEdit ? 'Save changes' : 'Add supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default SupplierFormDialog
