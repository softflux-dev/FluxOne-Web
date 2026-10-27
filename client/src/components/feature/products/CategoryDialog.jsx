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
import { BRAND, CATEGORY_NAME_MAX, SUBCATEGORY_NAME_MAX } from '@/lib/constants'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useFormBaseline } from '@/hooks/useFormBaseline'

export function CategoryDialog({
  open,
  onOpenChange,
  mode = 'create',
  initial = null,
  title = 'Category',
  loading = false,
  onSubmit,
  // Parent list — shown when adding a sub category from the toolbar.
  parents = null,
  // Override when title alone is ambiguous (e.g. edit subcategory)
  maxNameLength = null,
}) {
  const isEdit = mode === 'edit'
  const showParentSelect = !isEdit && Array.isArray(parents)
  const isSubcategory =
    showParentSelect ||
    Boolean(initial?.parentId) ||
    /sub\s*categor/i.test(String(title || ''))
  const nameMax =
    maxNameLength ?? (isSubcategory ? SUBCATEGORY_NAME_MAX : CATEGORY_NAME_MAX)

  const [name, setName] = useState('')
  const [image, setImage] = useState(null)
  const [parentId, setParentId] = useState('')
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  useEffect(() => {
    if (!open) return
    resetErrors()
    const snapshot = {
      name: initial?.name || '',
      image: null,
      parentId: initial?.parentId || '',
    }
    setImage(null)
    setName(snapshot.name)
    setParentId(snapshot.parentId)
    captureBaseline(snapshot)
  }, [open, initial, captureBaseline, resetErrors])

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = {}
    const anchors = {}
    if (showParentSelect && !parentId) {
      errors.parentId = 'Parent category is required'
      anchors.parentId = 'category-parent'
    }
    if (!name.trim()) {
      errors.name = 'Name is required'
      anchors.name = 'category-name'
    } else if (name.trim().length > nameMax) {
      errors.name = `Name must be at most ${nameMax} characters`
      anchors.name = 'category-name'
    }
    if (Object.keys(errors).length) {
      applyErrors(errors, anchors, Object.keys(errors))
      return
    }
    resetErrors()
    try {
      const result = await onSubmit?.({
        name: name.trim(),
        image,
        parentId: parentId || undefined,
      })
      if (result?.success) onOpenChange?.(false)
      else setFormError(result?.error || 'Save failed. Please try again.')
    } catch (err) {
      setFormError(err?.message || 'Save failed. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty({ name, image, parentId })}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${title.toLowerCase()}` : `Add ${title.toLowerCase()}`}
          </DialogTitle>
          <DialogDescription>Set a name and optional image.</DialogDescription>
        </DialogHeader>

        {formError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {showParentSelect ? (
            <div className="space-y-1.5">
              <Label htmlFor="category-parent">Parent category</Label>
              <NativeSelect
                id="category-parent"
                value={parentId}
                aria-invalid={Boolean(fieldErrors.parentId)}
                className={fieldErrorClass(fieldErrors.parentId)}
                onChange={(event) => {
                  setParentId(event.target.value)
                  clearField('parentId')
                }}
              >
                <option value="">Select parent category</option>
                {parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </NativeSelect>
              <FieldError message={fieldErrors.parentId} />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="category-name">Name</Label>
              <span className="text-[11px] tabular-nums text-slate-400">
                {name.length}/{nameMax}
              </span>
            </div>
            <Input
              id="category-name"
              value={name}
              maxLength={nameMax}
              onChange={(event) => {
                setName(event.target.value)
                clearField('name')
              }}
              placeholder={`${title} name`}
              aria-invalid={Boolean(fieldErrors.name)}
              className={fieldErrorClass(fieldErrors.name)}
            />
            <FieldError message={fieldErrors.name} />
          </div>
          <ImageUploadField
            id="category-image"
            label="Image"
            optionalLabel="(optional)"
            value={image}
            existingImageUrl={isEdit ? initial?.imageUrl : null}
            onChange={setImage}
          />
          <DialogFooter>
            <DialogCancelButton className="cursor-pointer" />
            <Button
              type="submit"
              className="cursor-pointer text-white"
              style={{ background: BRAND.purple }}
              loading={loading}
            >
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SubCategoryDialog(props) {
  return (
    <CategoryDialog
      {...props}
      title="Sub category"
      maxNameLength={SUBCATEGORY_NAME_MAX}
    />
  )
}
