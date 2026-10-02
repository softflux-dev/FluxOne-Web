// Mirrors server hardwarePolicy — keep role modes in sync with backend.

export const HARDWARE_MODES = {
  EXCLUSIVE: 'exclusive',
  SHARED: 'shared',
  OPTIONAL: 'optional',
}

export function hardwareModeForRole(role) {
  if (role === 'inventory_manager') return HARDWARE_MODES.EXCLUSIVE
  if (role === 'cashier') return HARDWARE_MODES.SHARED
  return HARDWARE_MODES.OPTIONAL
}

export function roleUsesHardwareScheduleGate(role) {
  const mode = hardwareModeForRole(role)
  return mode === HARDWARE_MODES.EXCLUSIVE || mode === HARDWARE_MODES.SHARED
}

export function roleRequiresShiftForHardware(role) {
  return roleUsesHardwareScheduleGate(role)
}

export function hardwareModeHint(role) {
  const mode = hardwareModeForRole(role)
  if (mode === HARDWARE_MODES.EXCLUSIVE) {
    return 'Inventory Manager devices are locked exclusively — no other staff can use them.'
  }
  if (mode === HARDWARE_MODES.SHARED) {
    return 'Cashiers share devices by shift. Set working days and shift first to see free slots.'
  }
  return 'Hardware is optional for this role.'
}
