// Shared product CSV helpers — template serialize + parse.
// No itemCode in files — Import Ref links rows; server generates item codes on import.
import { parseProductsImport } from '@/lib/productImport'

export const PRODUCT_CSV_HEADERS = [
  'rowKind',
  'importRef',
  'name',
  'barcode',
  'type',
  'status',
  'category',
  'subcategory',
  'purchasePrice',
  'sellingPrice',
  'stockQuantity',
  'threshold',
  'description',
  'discountPercent',
  'offerName',
  'taxPercent',
  'dailyPriceChange',
  'parentRef',
  'variantLabel',
  'variantOptions',
  'componentRef',
  'componentQty',
]

export function escapeCsvCell(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

function csvValueForHeader(key, row) {
  if (key === 'stockQuantity') {
    const v = row.stockQuantity ?? row.quantity
    return v == null || v === '' ? '' : v
  }
  if (key === 'threshold') {
    const v = row.threshold ?? row.reorderPoint
    return v == null || v === '' ? '' : v
  }
  if (key === 'dailyPriceChange') {
    if (row.dailyPriceChange == null || row.dailyPriceChange === '') return ''
    return row.dailyPriceChange ? 'true' : 'false'
  }
  if (key === 'parentRef') return row.parentRef || row.parentItemCode || ''
  if (key === 'componentRef') return row.componentRef || row.componentItemCode || ''
  return row[key] ?? ''
}

export function productsToCsv(rows = []) {
  const lines = [PRODUCT_CSV_HEADERS.join(',')]
  for (const row of rows) {
    lines.push(
      PRODUCT_CSV_HEADERS.map((key) => escapeCsvCell(csvValueForHeader(key, row))).join(','),
    )
  }
  return `${lines.join('\n')}\n`
}

export function parseProductsCsv(raw) {
  return parseProductsImport(raw)
}

export function downloadTextFile(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function productCsvTemplate() {
  return productsToCsv([
    {
      rowKind: 'product',
      importRef: 'R1',
      name: 'Cola 1.5L',
      type: 'single',
      status: 'active',
      category: 'Beverages',
      subcategory: 'Soft Drinks',
      purchasePrice: 80,
      sellingPrice: 120,
      stockQuantity: 48,
      threshold: 10,
      description: 'Sample single item',
      discountPercent: 0,
      taxPercent: 10,
      dailyPriceChange: false,
    },
    {
      rowKind: 'product',
      importRef: 'R2',
      name: 'T-Shirt',
      type: 'variant',
      status: 'active',
      category: 'Apparel',
      subcategory: 'Tops',
      purchasePrice: 0,
      sellingPrice: 0,
      stockQuantity: 0,
      threshold: 10,
      description: 'Variant parent',
      taxPercent: 10,
    },
    {
      rowKind: 'variant',
      importRef: 'R2A',
      name: 'T-Shirt',
      type: 'single',
      status: 'active',
      parentRef: 'R2',
      variantLabel: 'Red–M',
      variantOptions: 'Color:Red|Size:M',
      purchasePrice: 200,
      sellingPrice: 350,
      stockQuantity: 12,
      threshold: 5,
      dailyPriceChange: false,
    },
    {
      rowKind: 'product',
      importRef: 'R3',
      name: 'Snack Bundle',
      type: 'bundle',
      status: 'active',
      category: 'Bundles',
      purchasePrice: 0,
      sellingPrice: 500,
      stockQuantity: 5,
      threshold: 2,
      description: 'Sample bundle',
      taxPercent: 10,
    },
    {
      rowKind: 'bundle_item',
      parentRef: 'R3',
      componentRef: 'R1',
      componentQty: 2,
    },
  ])
}
