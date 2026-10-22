import { ROLES } from '@/lib/constants'

export const PERMISSIONS = {
  'dashboard:read': [ROLES.INVENTORY_MANAGER, ROLES.BRANCH_MANAGER],
  'items:read': [ROLES.INVENTORY_MANAGER, ROLES.BRANCH_MANAGER],
  'items:write': [ROLES.INVENTORY_MANAGER],
  'items:import': [ROLES.INVENTORY_MANAGER],
  'stock:in': [ROLES.INVENTORY_MANAGER],
  'stock:out': [ROLES.INVENTORY_MANAGER, ROLES.BRANCH_MANAGER],
  'stock:adjust': [ROLES.INVENTORY_MANAGER],
  'stock:damaged': [ROLES.INVENTORY_MANAGER],
  'suppliers:read': [ROLES.INVENTORY_MANAGER, ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
  'suppliers:write': [ROLES.INVENTORY_MANAGER, ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
  // Block / Unblock only (no hard delete for BM)
  'suppliers:moderate': [ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
  // Hard delete — B2B Admin only (BM never deletes; no soft-delete)
  'suppliers:delete': [ROLES.B2B_ADMIN],
  'orders:read': [ROLES.INVENTORY_MANAGER, ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
  'orders:generate': [ROLES.INVENTORY_MANAGER, ROLES.B2B_ADMIN],
  'orders:approve': [ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
  'activity-logs:read': [ROLES.BRANCH_MANAGER, ROLES.B2B_ADMIN],
}

export function hasPermission(role, permission) {
  const allowed = PERMISSIONS[permission]
  if (!allowed) return false
  return allowed.includes(role)
}

export function canAccessInventory(role) {
  return role === ROLES.INVENTORY_MANAGER
}

export function canAccessBranch(role) {
  return role === ROLES.BRANCH_MANAGER
}