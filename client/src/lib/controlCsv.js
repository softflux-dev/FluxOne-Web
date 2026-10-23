// Control movement CSV helpers — Export (tab-specific, not Products CSV).
import { rowsToCsv, downloadCsv } from '@/lib/csvExport'

export const CONTROL_CSV_HEADERS = [
  'itemCode',
  'barcode',
  'quantity',
  'scale',
  'reason',
  'variantType',
  'variantValue',
  'unitCost',
  'damagedByEmail',
  'damagedLocation',
  'notes',
]

function splitVariantLabel(label) {
  const text = String(label || '')
  const idx = text.indexOf(':')
  if (idx <= 0) return { variantType: '', variantValue: text }
  return {
    variantType: text.slice(0, idx).trim(),
    variantValue: text.slice(idx + 1).trim(),
  }
}

// Map API export rows → CSV download for active tab.
export function downloadControlExport(rows, movementType) {
  const list = Array.isArray(rows) ? rows : []
  if (!list.length) throw new Error('No rows to export')

  const dataRows = list.map((row) => {
    const { variantType, variantValue } = splitVariantLabel(row.variantLabel)
    return [
      row.itemCode || '',
      row.barcode || '',
      row.quantity ?? '',
      row.scale || '',
      row.reason || '',
      variantType,
      variantValue,
      row.unitCost ?? '',
      row.damagedByEmail || '',
      row.damagedLocation || '',
      row.reason || '',
    ]
  })

  const csv = rowsToCsv(CONTROL_CSV_HEADERS, dataRows)
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(`fluxone-control-${movementType || 'export'}-${stamp}.csv`, csv)
}
