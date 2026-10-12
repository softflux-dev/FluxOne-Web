import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Moon, ScrollText, Sun, UserRound, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useTheme } from '@/context/ThemeContext'
import { BRAND, ROLES } from '@/lib/constants'
import { roleDisplayName } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { PATHS, profilePathForRole } from '@/router/paths'

// Transform-only tween — smoother than spring, and no backdrop-blur (that caused the lag)
const EASE = [0.22, 1, 0.36, 1]

function SideNavLinks({ items, onNavigate }) {
  if (!items?.length) return <div className="flex-1" />

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'relative shrink-0 cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold transition-colors duration-200 active:scale-[0.99]',
              isActive
                ? 'bg-[#f3e8f5]/60 text-[#8E238F] dark:bg-accent dark:text-[#c084c1]'
                : 'text-slate-700 hover:bg-slate-50 hover:text-[#8E238F] dark:text-slate-300 dark:hover:bg-muted dark:hover:text-[#c084c1]',
            )
          }
        >
          {({ isActive }) => (
            <>
              {item.label}
              {isActive ? (
                <span
                  className="absolute right-2 bottom-0 left-2 h-[3px] rounded-full"
                  style={{ background: BRAND.purple }}
                />
              ) : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function AccountHeader() {
  const { user, role } = useAuthSession()
  const name = user?.name || 'User'
  const roleLabel = roleDisplayName(role)
  const userId = user?.email || user?.id || '—'

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4">
      <UserAvatar
        name={name}
        loginId={user?.email}
        imageUrl={user?.imageUrl || null}
        className="size-11"
        fallbackClassName="text-sm"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{roleLabel}</p>
        <p className="mt-0.5 truncate text-xs font-medium text-[#412283] dark:text-[#c084c1]">
          {userId}
        </p>
      </div>
    </div>
  )
}

function AccountActions({ onClose }) {
  const navigate = useNavigate()
  const { role, logout } = useAuthSession()
  const { theme, toggleTheme } = useTheme()
  const profilePath = profilePathForRole(role)
  const isDark = theme === 'dark'
  const itemClass =
    'flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.99] dark:text-slate-300 dark:hover:bg-muted'

  return (
    <div className="mt-auto space-y-1 border-t border-border p-3">
      {role === ROLES.B2B_ADMIN ? null : (
        <button
          type="button"
          className={itemClass}
          onClick={() => {
            onClose()
            navigate(profilePath)
          }}
        >
          <UserRound className="size-4" />
          Profile
        </button>
      )}
      <button type="button" className={itemClass} onClick={toggleTheme}>
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        {isDark ? 'Light mode' : 'Dark mode'}
      </button>
      {role === ROLES.BRANCH_MANAGER ? (
        <button
          type="button"
          className={itemClass}
          onClick={() => {
            onClose()
            navigate(PATHS.branch.logs)
          }}
        >
          <ScrollText className="size-4" />
          Logs
        </button>
      ) : null}
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 active:scale-[0.99] dark:text-red-400 dark:hover:bg-red-950/40"
        onClick={() => {
          onClose()
          logout()
          navigate(PATHS.login, { replace: true })
        }}
      >
        <LogOut className="size-4" />
        Logout
      </button>
    </div>
  )
}

function SideDrawer({ open, onClose, items, showAccount }) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="nav-overlay"
            type="button"
            aria-label="Close side menu"
            className="fixed inset-0 z-50 bg-slate-900/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={onClose}
          />
          <motion.aside
            key="nav-drawer"
            className="fixed top-0 left-0 z-50 flex h-dvh w-[min(20rem,88vw)] flex-col bg-white shadow-2xl dark:bg-card"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.32, ease: EASE }}
            style={{ willChange: 'transform' }}
            role="dialog"
            aria-modal="true"
            aria-label="Side navigation"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <BrandLogo size="sm" asLink={false} />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {BRAND.product.split(' ')[0]}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close side navigation"
                onClick={onClose}
                className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border text-slate-600 transition-colors hover:bg-slate-50 active:scale-95 dark:text-slate-300 dark:hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            {showAccount ? <AccountHeader /> : null}
            <SideNavLinks items={items} onNavigate={onClose} />
            {showAccount ? <AccountActions onClose={onClose} /> : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}

// Single hamburger, left of the logo. Parent decides which links to pass.
export function AppSideNav({ items, open, onOpenChange, showAccount = false }) {
  return (
    <>
      <button
        type="button"
        aria-label="Open side menu"
        aria-expanded={open}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 dark:text-slate-300 dark:hover:bg-muted"
        onClick={() => onOpenChange(true)}
      >
        <Menu className="size-5" />
      </button>

      <SideDrawer
        open={open}
        onClose={() => onOpenChange(false)}
        items={items}
        showAccount={showAccount}
      />
    </>
  )
}

export default AppSideNav
