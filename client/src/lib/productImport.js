// Product catalog Import — Excel export (.xls HTML) + CSV.
// Item codes are never imported — server generates UUID + searchable itemCode on create.
// File-local Import Ref / Parent Ref / Component Ref link variants & bundles.

function parseCsvLine(line) {
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

function normalizeHeaderKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

const HEADER_FIELD_MAP = {
  productname: 'name',
  name: 'name',
  // File-local refs (preferred)
  importref: 'importRef',
  parentref: 'parentRef',
  componentref: 'componentRef',
  // Legacy SKU headers → refs (identity codes are ignored by server)
  skuitemcode: 'importRef',
  itemcode: 'importRef',
  sku: 'importRef',
  parentproductsku: 'parentRef',
  parentitemcode: 'parentRef',
  parentsku: 'parentRef',
  bundlecomponentsku: 'componentRef',
  componentitemcode: 'componentRef',
  barcode: 'barcode',
  rowtype: 'rowKind',
  rowkind: 'rowKind',
  producttype: 'type',
  type: 'type',
  scale: 'scale',
  variantattributes: 'variantOptions',
  variantoptions: 'variantOptions',
  variantlabel: 'variantLabel',
  category: 'category',
  categoryname: 'category',
  subcategory: 'subcategory',
  subcategoryname: 'subcategory',
  purchasecost: 'purchasePrice',
  purchaseprice: 'purchasePrice',
  sellingprice: 'sellingPrice',
  tax: 'taxPercent',
  taxpercent: 'taxPercent',
  discount: 'discountPercent',
  discountpercent: 'discountPercent',
  offername: 'offerName',
  stockqty: 'stockQuantity',
  stockquantity: 'stockQuantity',
  quantity: 'stockQuantity',
  stockthreshold: 'threshold',
  threshold: 'threshold',
  reorderpoint: 'threshold',
  dailypriceupdate: 'dailyPriceChange',
  dailypricechange: 'dailyPriceChange',
  status: 'status',
  componentqty: 'componentQty',
  description: 'description',
}

function numOrUndef(value) {
  if (value == null || value === '') return undefined
  const n = Number(String(value).replace(/,/g, '').trim())
  return Number.isNaN(n) ? undefined : n
}

function mapRowKind(value) {
  const raw = String(value || 'product')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
  if (raw === 'variant') return 'variant'
  if (raw === 'bundleitem') return 'bundle_item'
  return 'product'
}

function mapProductType(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  if (!raw) return undefined
  if (raw === 'variant') return 'variant'
  if (raw === 'bundle') return 'bundle'
  if (raw === 'single' || raw === 'normal' || raw === 'item') return 'single'
  return undefined
}

function mapStatus(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  if (!raw) return undefined
  if (raw === 'inactive' || raw === 'close' || raw === 'closed' || raw === 'blocked') {
    return 'inactive'
  }
  if (raw === 'active' || raw === 'open') return 'active'
  return undefined
}

function mapYesNo(value) {
  if (value == null || value === '') return undefined
  const raw = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y'].includes(raw)) return true
  if (['0', 'false', 'no', 'n'].includes(raw)) return false
  return undefined
}

function mapVariantOptions(value) {
  const text = String(value || '').trim()
  if (!text) return undefined
  return text
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(':')
      if (idx <= 0) return part
      return `${part.slice(0, idx).trim()}:${part.slice(idx + 1).trim()}`
    })
    .join('|')
}

function variantLabelFromOptions(variantOptions) {
  if (!variantOptions) return undefined
  const label = variantOptions
    .split('|')
    .map((part) => {
      const idx = part.indexOf(':')
      return (idx > 0 ? part.slice(idx + 1) : part).trim()
    })
    .filter(Boolean)
    .join('–')
  return label || undefined
}

function resolveFieldKey(header) {
  return HEADER_FIELD_MAP[normalizeHeaderKey(header)] || null
}

function cellsToFieldMap(headers, cells) {
  const out = {}
  for (let i = 0; i < headers.length; i += 1) {
    const field = resolveFieldKey(headers[i])
    if (!field) continue
    const cell = cells[i]
    if (cell == null || String(cell).trim() === '') continue
    out[field] = String(cell).trim()
  }
  return out
}

function buildApiRow(fields) {
  const rowKind = mapRowKind(fields.rowKind || 'product')
  const variantOptions = mapVariantOptions(fields.variantOptions)
  const variantLabel =
    fields.variantLabel ||
    (rowKind === 'variant' ? variantLabelFromOptions(variantOptions) : undefined)

  const row = {
    rowKind,
    importRef: fields.importRef || undefined,
    parentRef: fields.parentRef || undefined,
    componentRef: fields.componentRef || undefined,
    // Legacy aliases for server groupRows fallbacks
    parentItemCode: fields.parentRef || undefined,
    componentItemCode: fields.componentRef || undefined,
    name: fields.name || '',
    barcode: fields.barcode || undefined,
    type: mapProductType(fields.type),
    scale: fields.scale ? String(fields.scale).trim().toLowerCase() : undefined,
    status: mapStatus(fields.status),
    category: fields.category || undefined,
    subcategory: fields.subcategory || undefined,
    stockQuantity: numOrUndef(fields.stockQuantity),
    quantity: numOrUndef(fields.stockQuantity),
    purchasePrice: numOrUndef(fields.purchasePrice),
    sellingPrice: numOrUndef(fields.sellingPrice),
    threshold: numOrUndef(fields.threshold),
    reorderPoint: numOrUndef(fields.threshold),
    description: fields.description || undefined,
    discountPercent: numOrUndef(fields.discountPercent),
    offerName: fields.offerName || undefined,
    taxPercent: numOrUndef(fields.taxPercent),
    dailyPriceChange: mapYesNo(fields.dailyPriceChange),
    variantLabel: variantLabel || undefined,
    variantOptions: variantOptions || undefined,
    componentQty: numOrUndef(fields.componentQty),
  }

  if (row.rowKind === 'product' && !row.type) row.type = 'single'
  return row
}

function isValidImportRow(row) {
  if (row.rowKind === 'product') return Boolean(row.name)
  if (row.rowKind === 'variant') return Boolean(row.parentRef && (row.name || row.variantLabel || row.variantOptions))
  if (row.rowKind === 'bundle_item') return Boolean(row.parentRef && row.componentRef)
  return false
}

function looksLikeHeaderRow(normalizedKeys) {
  return normalizedKeys.some((key) => Boolean(HEADER_FIELD_MAP[key]))
}

function hasIdentityHeader(normalizedKeys) {
  return normalizedKeys.some((key) =>
    ['name', 'productname', 'importref', 'rowkind', 'rowtype'].includes(key),
  )
}

export function parseProductsFromExcelHtml(html) {
  if (typeof DOMParser === 'undefined') return []
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html')
  const table = doc.querySelector('table')
  if (!table) return []

  let headerEls = [...table.querySelectorAll('thead tr th, thead tr td')]
  let dataRows = [...table.querySelectorAll('tbody tr')]

  if (!headerEls.length) {
    const firstRow = table.querySelector('tr')
    if (!firstRow) return []
    headerEls = [...firstRow.children]
    dataRows = [...table.querySelectorAll('tr')].slice(1)
  }

  const headers = headerEls.map((el) => (el.textContent || '').trim())
  const normalized = headers.map(normalizeHeaderKey)
  if (!looksLikeHeaderRow(normalized) || !hasIdentityHeader(normalized)) return []

  const rows = []
  for (const tr of dataRows) {
    const cells = [...tr.children].map((el) => (el.textContent || '').trim())
    if (!cells.length || cells.every((c) => !c)) continue
    const row = buildApiRow(cellsToFieldMap(headers, cells))
    if (isValidImportRow(row)) rows.push(row)
  }
  return rows
}

function parseProductsFromCsvText(raw) {
  const text = String(raw || '').replace(/^\uFEFF/, '')
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return []

  const firstCells = parseCsvLine(lines[0])
  const firstKeys = firstCells.map(normalizeHeaderKey)
  const headerMode = looksLikeHeaderRow(firstKeys) && hasIdentityHeader(firstKeys)

  // Legacy positional: name,quantity?,scale? (no item code column)
  if (!headerMode) {
    const rows = []
    for (const line of lines) {
      const cells = parseCsvLine(line)
      if (!cells.length || cells.every((c) => !c)) continue
      // Prefer name-first; if old sku,name files still appear, treat col0 as name when col1 empty
      const name = cells[1] ? cells[1] : cells[0]
      const row = buildApiRow({
        rowKind: 'product',
        name: name || '',
        stockQuantity: cells[1] ? cells[2] : cells[1],
        scale: cells[1] ? cells[3] : cells[2],
        type: 'single',
      })
      if (isValidImportRow(row)) rows.push(row)
    }
    return rows
  }

  const headers = firstCells
  const rows = []
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i])
    if (!cells.length || cells.every((c) => !c)) continue
    const row = buildApiRow(cellsToFieldMap(headers, cells))
    if (isValidImportRow(row)) rows.push(row)
  }
  return rows
}

export function parseProductsImport(raw) {
  const text = String(raw || '').replace(/^\uFEFF/, '')
  if (!text.trim()) return []

  if (/<table[\s>]/i.test(text)) {
    const fromHtml = parseProductsFromExcelHtml(text)
    if (fromHtml.length) return fromHtml
  }

  return parseProductsFromCsvText(text)
}
