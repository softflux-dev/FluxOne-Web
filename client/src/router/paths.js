export const PATHS = {
  splash: '/',
  login: '/login',
  profile: '/profile',
  inventory: {
    root: '/inventory',
    dashboard: '/inventory',
    products: '/inventory/products',
    bundles: '/inventory/bundles',
    bundlesEdit: (id) => `/inventory/bundles/${id}/edit`,
    // Add Item page (Normal / Variant) — replaces Single Item dialog
    productsNew: '/inventory/products/new',
    // Edit non-bundle item — same layout as Add Item
    productsEdit: (id) => `/inventory/products/${id}/edit`,
    control: '/inventory/control',
    suppliers: '/inventory/suppliers',
    orders: '/inventory/orders',
    categories: '/inventory/categories',
    notifications: '/inventory/notifications',
    profile: '/inventory/profile',
  },
  branch: {
    root: '/branch',
    dashboard: '/branch',
    staff: '/branch/staff',
    attendance: '/branch/attendance',
    holidays: '/branch/holidays',
    leaves: '/branch/leaves',
    performance: '/branch/performance',
    sales: '/branch/sales',
    customer: '/branch/customer',
    inventory: '/branch/inventory',
    reports: '/branch/reports',
    resources: '/branch/resources',
    discounts: '/branch/discounts',
    logs: '/branch/logs',
    notifications: '/branch/notifications',
    profile: '/branch/profile',
  },
  // Phase 2 roles — shell only (logo + profile + logout)
  workspace: {
    root: '/workspace',
    home: '/workspace',
    profile: '/workspace/profile',
  },
  admin: {
    root: '/admin',
    dashboard: '/admin/dashboard',
    reports: '/admin/reports',
    branches: '/admin/branches',
    leaves: '/admin/leaves',
    notifications: '/admin/notifications',
    invoices: '/admin/invoices',
    taxProfit: '/admin/tax-profit',
    company: '/admin/company',
    settings: '/admin/settings',
    profile: '/admin/profile',
  },
}

export const ADMIN_ROLES = ['b2b_admin']
export const INVENTORY_ROLES = ['inventory_manager']
export const BRANCH_ROLES = ['branch_manager']
export const PHASE2_ROLES = ['cashier','production_staff', 'delivery_staff', 'website_manager']

export function homePathForRole(role) {
  if (ADMIN_ROLES.includes(role)) return PATHS.admin.dashboard
  if (INVENTORY_ROLES.includes(role)) return PATHS.inventory.root
  if (BRANCH_ROLES.includes(role)) return PATHS.branch.root
  if (PHASE2_ROLES.includes(role)) return PATHS.workspace.root
  return PATHS.profile
}

// Profile lives inside each role layout so the top nav stays visible.
export function profilePathForRole(role) {
  if (ADMIN_ROLES.includes(role)) return PATHS.admin.profile
  if (INVENTORY_ROLES.includes(role)) return PATHS.inventory.profile
  if (BRANCH_ROLES.includes(role)) return PATHS.branch.profile
  if (PHASE2_ROLES.includes(role)) return PATHS.workspace.profile
  return PATHS.profile
}
