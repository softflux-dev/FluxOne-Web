import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'

// UI-only tab ids (thresholds is not a ledger movement type).
export const CONTROL_UI_TAB = {
  IN: MOVEMENT_TYPES.IN,
  OUT: MOVEMENT_TYPES.OUT,
  ADJUSTMENT: MOVEMENT_TYPES.ADJUSTMENT,
  THRESHOLDS: 'thresholds',
}

// Adjustment tab lists manual adjustments plus stock-out reason buckets.
export const ADJUSTMENT_LEDGER_TYPES = [
  MOVEMENT_TYPES.ADJUSTMENT,
  MOVEMENT_TYPES.DAMAGED,
  MOVEMENT_TYPES.EXPIRED,
  MOVEMENT_TYPES.OTHER,
]

export const LEDGER_KIND_OPTIONS = [
  { id: '', label: 'All types' },
  { id: MOVEMENT_TYPES.DAMAGED, label: 'Damaged' },
  { id: MOVEMENT_TYPES.EXPIRED, label: 'Expired' },
  { id: MOVEMENT_TYPES.OTHER, label: 'Other' },
  { id: MOVEMENT_TYPES.ADJUSTMENT, label: 'Adjustment' },
]
