import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ForgotPasswordForm } from '@/components/feature/auth/ForgotPasswordForm'
import { AuthLayout } from '@/layouts/AuthLayout'
import { useAuthSession } from '@/hooks/shared/useAuthSession'
import { homePathForRole } from '@/router/paths'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuthSession()

  useEffect(() => {
    if (isAuthenticated) {
      navigate(homePathForRole(role), { replace: true })
    }
  }, [isAuthenticated, role, navigate])

  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
