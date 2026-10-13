// Product catalog Excel export — friendly columns, parent/child colors (TC-IM-EXPORT-001)
// No itemCode in file — Import Ref links variants/bundles; server generates item codes on import.
import { exportRowsToStyledExcel } from '@/lib/csvExport'

export const PRODUCT_EXCEL_HEADERS = [
  'Product Name',
  'Import Ref',
  'Barcode',
  'Row Type',
  'Product Type',
  'Scale',
  'Variant Attributes',
  'Category',
  'Subcategory',
  'Purchase Cost',
  'Selling Price',
  'Tax %',
  'Discount %',
  'Offer Name',
  'Stock Qty',
  'Stock Threshold',
  'Daily Price Update',
  'Status',
  'Parent Ref',
  'Component Ref',
  'Component Qty',
  'Description',
]

const ROW_BG = {
  parentGroup: '#EDE4F5',
  variant: '#D6EAF8',
  bundleItem: '#FDEBD0',
  single: '#FFFFFF',
}

function titleCase(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

function rowTypeLabel(rowKind) {
  const kind = String(rowKind || 'product').toLowerCase()
  if (kind === 'variant') return 'Variant'
  if (kind === 'bundle_item' || kind === 'bundleitem') return 'Bundle Item'
  return 'Product'
}

function productTypeLabel(type) {
  const t = String(type || 'single').toLowerCase()
  if (t === 'variant') return 'Variant'
  if (t === 'bundle') return 'Bundle'
  return 'Single'
}

function statusLabel(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'inactive' || s === 'close') return 'Inactive'
  if (!s) return ''
  return 'Active'
}

function yesNo(value) {
  if (value == null || value === '') return ''
  if (value === true || value === 'true' || value === 1 || value === '1') return 'Yes'
  if (value === false || value === 'false' || value === 0 || value === '0') return 'No'
  return String(value)
}

function blankNum(value) {
  if (value == null || value === '') return ''
  return value
}

function formatVariantAttributes(raw) {
  const text = String(raw || '').trim()
  if (!text) return ''
  return text
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(':')
      if (idx <= 0) return part
      return `${part.slice(0, idx).trim()}: ${part.slice(idx + 1).trim()}`
    })
    .join(' | ')
}

function rowBackground(rowKind, type) {
  const kind = String(rowKind || 'product').toLowerCase()
  if (kind === 'variant') return ROW_BG.variant
  if (kind === 'bundle_item' || kind === 'bundleitem') return ROW_BG.bundleItem
  const t = String(type || 'single').toLowerCase()
  if (t === 'variant' || t === 'bundle') return ROW_BG.parentGroup
  return ROW_BG.single
}

function enrichRows(rows = []) {
  let lastParentName = ''
  return (rows || []).map((row) => {
    const kind = String(row.rowKind || 'product').toLowerCase()
    if (kind === 'product') {
      lastParentName = row.name || ''
      return row
    }
    if (kind === 'bundle_item' || kind === 'bundleitem') {
      return {
        ...row,
        name: row.name || lastParentName,
      }
    }
    return row
  })
}

function mapProductExportCells(row = {}) {
  return [
    row.name || '',
    row.importRef || '',
    row.barcode || '',
    rowTypeLabel(row.rowKind),
    productTypeLabel(row.type),
    titleCase(row.scale) || row.scale || '',
    formatVariantAttributes(row.variantOptions),
    row.category || '',
    row.subcategory || '',
    blankNum(row.purchasePrice),
    blankNum(row.sellingPrice),
    blankNum(row.taxPercent),
    blankNum(row.discountPercent),
    row.offerName || '',
    blankNum(row.stockQuantity ?? row.quantity),
    blankNum(row.threshold ?? row.reorderPoint),
    yesNo(row.dailyPriceChange),
    statusLabel(row.status),
    row.parentRef || row.parentItemCode || '',
    row.componentRef || row.componentItemCode || '',
    blankNum(row.componentQty),
    row.description || '',
  ]
}

export function exportProductsToStyledExcel(apiRows = []) {
  const rows = enrichRows(apiRows)
  if (!rows.length) {
    throw new Error('No products to export')
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const cellRows = []
  const rowStyles = []

  for (const row of rows) {
    cellRows.push(mapProductExportCells(row))
    rowStyles.push({ background: rowBackground(row.rowKind, row.type) })
  }

  exportRowsToStyledExcel({
    filename: `fluxone-products-${stamp}.xls`,
    sheetName: 'Products',
    headers: PRODUCT_EXCEL_HEADERS,
    rows: cellRows,
    rowStyles,
    freezeHeader: true,
    enableFilter: true,
  })

  return {
    exported: rows.filter((r) => String(r.rowKind || 'product').toLowerCase() === 'product').length,
  }
}
