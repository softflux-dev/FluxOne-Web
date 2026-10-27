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
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { FieldError } from '@/components/shared/FieldError'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useFormBaseline } from '@/hooks/useFormBaseline'

const PROFILE_FIELD_IDS = {
  name: 'profile-name',
  loginId: 'profile-login-id',
  currentPassword: 'profile-current-password',
  password: 'profile-password',
  confirmPassword: 'profile-confirm-password',
}

const PROFILE_FIELD_ORDER = [
  'name',
  'loginId',
  'currentPassword',
  'password',
  'confirmPassword',
]

// Shared edit profile modal (Admin / BM / IM / etc.).
// View card never shows password — only this dialog does.
// Fields: Photo, Name, User ID or Email, Current Password (when changing), Password, Confirm.
export function ProfileEditDialog({
  open,
  onOpenChange,
  initialName = '',
  initialLoginId = '',
  initialImageUrl = null,
  onSubmit,
  loading = false,
}) {
  const [name, setName] = useState('')
  const [loginId, setLoginId] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [image, setImage] = useState(null)
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  useEffect(() => {
    if (!open) return
    const snapshot = {
      name: initialName || '',
      loginId: initialLoginId || '',
      currentPassword: '',
      password: '',
      confirmPassword: '',
      image: null,
    }
    setName(snapshot.name)
    setLoginId(snapshot.loginId)
    setCurrentPassword('')
    setPassword('')
    setConfirmPassword('')
    setImage(null)
    resetErrors()
    captureBaseline(snapshot)
  }, [open, initialName, initialLoginId, captureBaseline, resetErrors])

  function validateProfileForm() {
    const errors = {}
    const nextName = name.trim()
    const nextId = loginId.trim()
    const nextCurrent = currentPassword
    const nextPassword = password
    const nextConfirm = confirmPassword

    if (!nextName) errors.name = 'Name is required'
    if (!nextId || nextId.length < 3) {
      errors.loginId = 'User ID or Email must be at least 3 characters'
    }

    const changingPassword = Boolean(nextPassword || nextConfirm || nextCurrent)
    if (changingPassword) {
      if (!nextCurrent) {
        errors.currentPassword = 'Current password is required to set a new password'
      }
      if (!nextPassword || nextPassword.length < 8) {
        errors.password = 'Password must be at least 8 characters'
      } else if (nextPassword.length > 72) {
        errors.password = 'Password must be at most 72 characters'
      } else if (nextCurrent && nextPassword === nextCurrent) {
        errors.password = 'New password must be different from current password'
      } else if (nextPassword !== nextConfirm) {
        errors.confirmPassword = 'Password and Confirm Password do not match'
      }
    }

    return {
      errors,
      nextName,
      nextId,
      nextCurrent,
      nextPassword,
      changingPassword: Boolean(nextPassword || nextConfirm),
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const { errors, nextName, nextId, nextCurrent, nextPassword, changingPassword } =
      validateProfileForm()
    if (Object.keys(errors).length) {
      applyErrors(errors, PROFILE_FIELD_IDS, PROFILE_FIELD_ORDER)
      return
    }
    resetErrors()

    const payload = { name: nextName, id: nextId }
    if (changingPassword) {
      payload.password = nextPassword
      payload.currentPassword = nextCurrent
    }
    if (image instanceof File && image.size > 0) payload.image = image

    const result = await onSubmit?.(payload)
    if (result && result.success === false) {
      setFormError(result.error || 'Update failed')
      return
    }
    onOpenChange?.(false)
  }

  const dirty = isDirty({ name, loginId, currentPassword, password, confirmPassword, image })

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={dirty}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your photo, display name, and login ID. To change password, enter your current
            password plus a new one (leave blank to keep the current password). Role cannot be
            changed here.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            {formError}
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <ImageUploadField
            id="profile-image"
            label="Profile photo"
            optionalLabel="(optional)"
            value={image}
            existingImageUrl={initialImageUrl}
            onChange={setImage}
          />

          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                clearField('name')
              }}
              placeholder="Full name"
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.name)}
              className={fieldErrorClass(fieldErrors.name)}
            />
            <FieldError message={fieldErrors.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-login-id">User ID or Email</Label>
            <Input
              id="profile-login-id"
              value={loginId}
              onChange={(e) => {
                setLoginId(e.target.value)
                clearField('loginId')
              }}
              placeholder="Login ID or email"
              autoComplete="username"
              aria-invalid={Boolean(fieldErrors.loginId)}
              className={fieldErrorClass(fieldErrors.loginId)}
            />
            <p className="text-xs text-slate-500">Used with your password at login.</p>
            <FieldError message={fieldErrors.loginId} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-current-password">Current Password</Label>
            <Input
              id="profile-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value)
                clearField('currentPassword')
              }}
              placeholder="Required only when setting a new password"
              autoComplete="current-password"
              aria-invalid={Boolean(fieldErrors.currentPassword)}
              className={fieldErrorClass(fieldErrors.currentPassword)}
            />
            <FieldError message={fieldErrors.currentPassword} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-password">New Password</Label>
            <Input
              id="profile-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearField('password')
                clearField('confirmPassword')
              }}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
              className={fieldErrorClass(fieldErrors.password)}
            />
            <FieldError message={fieldErrors.password} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-confirm-password">Confirm New Password</Label>
            <Input
              id="profile-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                clearField('confirmPassword')
              }}
              placeholder="Repeat new password"
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              className={fieldErrorClass(fieldErrors.confirmPassword)}
            />
            <p className="text-xs text-slate-500">
              After a temporary password from email, set your own password here.
            </p>
            <FieldError message={fieldErrors.confirmPassword} />
          </div>

          <DialogFooter>
            <DialogCancelButton disabled={loading} className="w-full sm:w-auto" />
            <Button
              type="submit"
              loading={loading}
              variant="brand"
              className="w-full sm:w-auto"
            >
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
