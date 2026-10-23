import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Moon, ScrollText, Settings, Sun, UserRound } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BranchRoleCapsules } from '@/components/shared/BranchRoleCapsules'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useTheme } from '@/context/ThemeContext'
import { ROLES } from '@/lib/constants'
import { roleDisplayName } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { PATHS, profilePathForRole } from '@/router/paths'

export function UserMenu({ className }) {
  const navigate = useNavigate()
  const { user, role, logout } = useAuthSession()
  const { theme, toggleTheme } = useTheme()
  const name = user?.name || 'User'
  const roleLabel = roleDisplayName(role)
  const branchName = user?.branchName || null
  const userId = user?.email || user?.id || '—'
  const profilePath = profilePathForRole(role)
  const imageUrl = user?.imageUrl || null
  const isDark = theme === 'dark'

  return (
    <div className={cn('relative', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#8E238F]/40">
          <div className="flex items-center gap-2.5 py-1">
            <UserAvatar
              name={name}
              loginId={user?.email}
              imageUrl={imageUrl}
              className="size-10"
            />
            <div className="hidden min-w-0 text-left sm:block">
              <p className="truncate text-sm leading-tight font-semibold text-slate-900 dark:text-slate-100">
                {name}
              </p>
              <BranchRoleCapsules
                role={role}
                roleLabel={roleLabel}
                branchName={branchName}
                className="mt-1"
              />
            </div>
            <ChevronDown className="size-4 shrink-0 text-slate-400" strokeWidth={1.75} />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="mt-2 w-72 rounded-2xl border border-border bg-white p-0 shadow-[0_12px_40px_rgba(15,23,42,0.12)] dark:bg-card dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <UserAvatar
              name={name}
              loginId={user?.email}
              imageUrl={imageUrl}
              className="size-11"
              fallbackClassName="text-sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {name}
              </p>
              {/* <BranchRoleCapsules
                role={role}
                roleLabel={roleLabel}
                branchName={branchName}
                className="mt-1"
              /> */}
              <p className="mt-1 truncate text-xs font-medium text-[#412283] dark:text-[#c084c1]">
                {userId}
              </p>
            </div>
          </div>

          <DropdownMenuSeparator className="my-0" />

          <div className="p-1.5">
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-700 dark:text-slate-200"
              onClick={() => navigate(profilePath)}
            >
              <UserRound className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-700 dark:text-slate-200"
              onClick={toggleTheme}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {isDark ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            {role === ROLES.BRANCH_MANAGER && (
              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-700 dark:text-slate-200"
                onClick={() => navigate(PATHS.branch.logs)}
              >
                <ScrollText className="size-4" />
                Logs
              </DropdownMenuItem>
            )}
            {role === ROLES.B2B_ADMIN && (
              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-700 dark:text-slate-200"
                onClick={() => navigate('/admin/settings')}
              >
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              onClick={() => {
                logout()
                navigate(PATHS.login, { replace: true })
              }}
            >
              <LogOut className="size-4" />
              Logout
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
