import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { AppSideNav } from '@/layouts/Navbar/AppSideNav'
import { UserMenu } from '@/layouts/Navbar/UserMenu'
import { NotificationBell } from '@/layouts/Navbar/NotificationBell'
import { useAuthSession } from '@/hooks/useAuthSession'
import { BRAND, ROLES } from '@/lib/constants'
import { getNavItemsForRole, getSideNavItemsForRole } from '@/lib/nav'
import { cn } from '@/lib/utils'

const DESKTOP_QUERY = '(min-width: 768px)'

function useIsDesktop() {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia(DESKTOP_QUERY).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return matches
}

function mergeNav(primary, side) {
  const seen = new Set()
  const merged = []
  for (const item of [...primary, ...side]) {
    if (seen.has(item.to)) continue
    seen.add(item.to)
    merged.push(item)
  }
  return merged
}

function DesktopNavLinks({ items }) {
  return (
    <nav className="hidden h-full min-w-0 flex-1 items-stretch gap-1 overflow-x-auto md:flex">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'relative flex shrink-0 cursor-pointer items-center px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-200',
              isActive
                ? 'text-[#8E238F] dark:text-[#c084c1]'
                : 'text-slate-800 hover:text-[#8E238F] dark:text-slate-200 dark:hover:text-[#c084c1]',
            )
          }
        >
          {({ isActive }) => (
            <>
              {item.label}
              {isActive ? (
                <span
                  className="absolute right-0 bottom-0 left-0 h-[3px]"
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

export function AppTopNav({ className }) {
  const { role } = useAuthSession()
  const isDesktop = useIsDesktop()
  const items = getNavItemsForRole(role)
  const sideItems = getSideNavItemsForRole(role)
  const showBell =
    role === ROLES.B2B_ADMIN ||
    role === ROLES.BRANCH_MANAGER ||
    role === ROLES.INVENTORY_MANAGER
  const [sideOpen, setSideOpen] = useState(false)

  // Desktop: utility links only. Small screens: every module link in the same drawer.
  const drawerItems = useMemo(
    () => (isDesktop ? sideItems : mergeNav(items, sideItems)),
    [isDesktop, items, sideItems],
  )

  // Admin always has a hamburger. Other roles only need it below md (top links hide).
  const showHamburger = isDesktop ? sideItems.length > 0 : true

  useEffect(() => {
    setSideOpen(false)
  }, [isDesktop])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center border-b border-border bg-white px-3 sm:h-[4.25rem] sm:px-6 dark:bg-card',
        className,
      )}
    >
      <div className="flex h-full w-full min-w-0 items-center gap-2 sm:gap-4 lg:gap-8">
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {showHamburger ? (
            <AppSideNav
              items={drawerItems}
              open={sideOpen}
              onOpenChange={setSideOpen}
              showAccount={!isDesktop}
            />
          ) : null}
          <BrandLogo size="sm" asLink={false} className="size-10 sm:size-12" />
        </div>
        <DesktopNavLinks items={items} />
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          {showBell ? <NotificationBell /> : null}
          <UserMenu className="hidden md:block" />
        </div>
      </div>
    </header>
  )
}
