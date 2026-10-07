import { PATHS } from '@/router/paths'
import { ROLES } from '@/lib/constants'

// Shared top-nav links by role (used by AppTopNav / MobileNav)
const INVENTORY_NAV = [
  { to: PATHS.inventory.dashboard, label: 'Dashboard', end: true },
  { to: PATHS.inventory.categories, label: 'Categories', end: false },
  { to: PATHS.inventory.products, label: 'Products', end: false },
  // { to: PATHS.inventory.bundles, label: 'Bundles', end: false },
  { to: PATHS.inventory.control, label: 'Control', end: false },
  { to: PATHS.inventory.suppliers, label: 'Suppliers', end: false },
  { to: PATHS.inventory.orders, label: 'Orders', end: false },
]

// Primary top-nav modules only (utility pages live in Admin side nav)
const ADMIN_NAV = [
  { to: PATHS.admin.dashboard, label: 'Dashboard', end: false },
  { to: PATHS.admin.reports, label: 'Reports', end: false },
  { to: PATHS.admin.branches, label: 'Manage Branches', end: false },
  { to: PATHS.admin.invoices, label: 'Invoices', end: false },
  { to: PATHS.admin.taxProfit, label: 'Tax & Profit', end: false },
]

// Admin hamburger side menu (Leave, Notifications, Company, Profile, Settings)
const ADMIN_SIDE_NAV = [
  { to: PATHS.admin.leaves, label: 'Leave Management', end: false },
  { to: PATHS.admin.notifications, label: 'Notifications', end: false },
  { to: PATHS.admin.company, label: 'Company & Policies', end: false },
  { to: PATHS.admin.profile, label: 'Profile', end: false },
  { to: PATHS.admin.settings, label: 'Settings', end: false },
]

export const NAV_BY_ROLE = {
  [ROLES.BRANCH_MANAGER]: [
    { to: PATHS.branch.dashboard, label: 'Dashboard', end: true },
    { to: PATHS.branch.staff, label: 'Staff Management', end: false },
    { to: PATHS.branch.sales, label: 'Sales Management', end: false },
    // Phase 2 — restore when Customer Management ships
    // { to: PATHS.branch.customer, label: 'Customer Management', end: false },
    { to: PATHS.branch.inventory, label: 'Inventory Monitoring', end: false },
    { to: PATHS.branch.resources, label: 'Resources', end: false },
    { to: PATHS.branch.discounts, label: 'Discounts', end: false },
  ],
  [ROLES.INVENTORY_MANAGER]: INVENTORY_NAV,
  [ROLES.B2B_ADMIN]: ADMIN_NAV,
  // Phase 2: logo + profile + logout only (no module links yet)
  [ROLES.PRODUCTION_STAFF]: [],
  [ROLES.DELIVERY_STAFF]: [],
}

export const SIDE_NAV_BY_ROLE = {
  [ROLES.B2B_ADMIN]: ADMIN_SIDE_NAV,
}

export function getNavItemsForRole(role) {
  return NAV_BY_ROLE[role] || []
}

export function getSideNavItemsForRole(role) {
  return SIDE_NAV_BY_ROLE[role] || []
}

export function roleDisplayName(role) {
  if (role === ROLES.BRANCH_MANAGER) return 'Branch Manager'
  if (role === ROLES.INVENTORY_MANAGER) return 'Inventory Manager'
  if (role === ROLES.B2B_ADMIN) return 'B2B Admin'
  if (role === ROLES.CASHIER) return 'Cashier'
  if (role === ROLES.PRODUCTION_STAFF) return 'Production Staff'
  if (role === ROLES.DELIVERY_STAFF) return 'Delivery Staff'
  return role || 'User'
}

export function getInitials(name = '', email = '') {
  const source = (name || email || 'U').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}
