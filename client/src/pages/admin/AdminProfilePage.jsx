import { useMemo, useState } from 'react'
import { ProfileCard } from '@/components/feature/profile/ProfileCard'
import { ProfileEditDialog } from '@/components/feature/profile/ProfileEditDialog'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { useAuthSession } from '@/hooks/useAuthSession'
import { formatLoginExpires, getTokenExpiryDate } from '@/lib/authToken'
import { updateProfile } from '@/rtk/features/auth/authSlice'
import { useAppDispatch } from '@/rtk/hooks'
import { toastSuccess, toastError } from '@/lib/toast'

export function AdminProfilePage() {
  const dispatch = useAppDispatch()
  const { user, expiresAt } = useAuthSession()
  const [name, setName] = useState(user?.name || 'Admin')
  const [loginId, setLoginId] = useState(user?.email || user?.id || '')
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  // Prefer live session (updates after save via authSlice)
  const imageUrl = user?.imageUrl || null
  const loginExpires = useMemo(() => {
    return formatLoginExpires(getTokenExpiryDate())
  }, [expiresAt])

  async function handleSave(fields) {
    setSaving(true)
    try {
      const result = await dispatch(
        updateProfile({
          name: fields.name?.trim(),
          id: (fields.id || fields.loginId || '').trim(),
          password: fields.password || undefined,
          currentPassword: fields.currentPassword || undefined,
          image: fields.image,
        }),
      )
      if (updateProfile.rejected.match(result)) {
        toastError(result.payload || 'Failed to update profile')
        return { success: false, error: result.payload }
      }
      const data = result.payload
      setName(data?.name || fields.name)
      setLoginId(data?.email || fields.id || fields.loginId)
      toastSuccess(
        data?.passwordUpdated
          ? 'Profile updated. New password saved — use it next time you sign in.'
          : 'Profile updated successfully',
      )
      setEditOpen(false)
      return { success: true }
    } catch {
      toastError('Failed to update profile')
      return { success: false, error: 'Failed to update profile' }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-0 pb-8 pt-4 sm:gap-6 sm:pb-12 sm:pt-6">
      <MotionHeader className="w-full text-center">
        <p className="text-sm text-slate-400">Signed-in admin details.</p>
      </MotionHeader>

      <MotionReveal className="flex w-full justify-center px-0">
        <ProfileCard
          name={name}
          loginId={loginId}
          role="b2b_admin"
          loginExpires={loginExpires}
          onEdit={() => setEditOpen(true)}
          imageUrl={imageUrl}
        />
      </MotionReveal>

      <ProfileEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initialName={name}
        initialLoginId={loginId}
        initialImageUrl={imageUrl}
        loading={saving}
        onSubmit={handleSave}
      />
    </div>
  )
}

export default AdminProfilePage
