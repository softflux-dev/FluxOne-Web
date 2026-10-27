import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ProfileCard } from '@/components/feature/profile/ProfileCard'
import { ProfileEditDialog } from '@/components/feature/profile/ProfileEditDialog'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { useAuthSession } from '@/hooks/useAuthSession'
import { formatLoginExpires, getTokenExpiryDate } from '@/lib/authToken'
import { roleDisplayName } from '@/lib/nav'
import { homePathForRole, INVENTORY_ROLES, BRANCH_ROLES, PHASE2_ROLES, PATHS } from '@/router/paths'
import { useAppDispatch } from '@/rtk/hooks'
import { updateProfile } from '@/rtk/features/auth/authSlice'
import { toastError, toastSuccess } from '@/lib/toast'

//
// Shared profile page for Branch Manager and Inventory Manager.
// Matches the signed-in details card layout (no email row).
//
export function ProfilePage() {
  const dispatch = useAppDispatch()
  const { user, role, expiresAt, isAuthenticated } = useAuthSession()
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const imageUrl = user?.imageUrl || null
  const allowed =
    BRANCH_ROLES.includes(role) ||
    INVENTORY_ROLES.includes(role) ||
    PHASE2_ROLES.includes(role)

  const loginExpires = useMemo(() => {
    return formatLoginExpires(getTokenExpiryDate())
  }, [expiresAt])

  if (!isAuthenticated) {
    return <Navigate to={PATHS.login} replace />
  }

  if (!allowed) {
    return <Navigate to={homePathForRole(role)} replace />
  }

  const name = user?.name || user?.fullName || 'User'
  const loginId = user?.email || ''
  const roleLabel = roleDisplayName(role).toLowerCase()

  async function handleSave(fields) {
    setSaving(true)
    try {
      const result = await dispatch(updateProfile(fields))
      if (updateProfile.fulfilled.match(result)) {
        toastSuccess(
          result.payload?.passwordUpdated
            ? 'Profile updated. New password saved — use it next time you sign in.'
            : 'Profile updated',
        )
        return { success: true, data: result.payload }
      }
      const error = result.payload || result.error?.message || 'Update failed'
      toastError(error)
      return {
        success: false,
        error,
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-0 pb-8 pt-1 sm:gap-6 sm:pb-10 sm:pt-4">
      <MotionHeader className="w-full text-left">
        <p className="text-sm text-slate-400">Signed-in {roleLabel} details.</p>
      </MotionHeader>

      <MotionReveal className="flex w-full justify-center px-0">
        <ProfileCard
          name={name}
          loginId={loginId}
          role={role}
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

export default ProfilePage
