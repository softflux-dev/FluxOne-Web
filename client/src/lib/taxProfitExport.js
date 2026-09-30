import { jsPDF } from 'jspdf'
import { exportRowsToCsv } from '@/lib/csvExport'
import { formatAmount, normalizeCurrency } from '@/lib/currency'
import { formatDateTimeInline } from '@/lib/formatDateTime'

function categoryLabel(row = {}) {
  const cat = row.category || 'Uncategorized'
  if (!row.subcategory) return cat
  // Stacked: category then subcategory (CSV / PDF cell)
  return `${cat}\n${row.subcategory}`
}

function productLabel(row = {}) {
  if (row.variantLabel) return `${row.name} (${row.variantLabel})`
  return row.name || '—'
}

function buildRows(items = []) {
  return items.map((p) => {
    const finalPrice =
      p.finalPrice ??
      Math.round(
        Number(p.baseCost || 0) +
          (Number(p.baseCost || 0) * Number(p.profitPct || 0)) / 100 +
          (Number(p.baseCost || 0) * Number(p.taxPct || 0)) / 100,
      )
    return {
      sku: p.itemCode || p.id || '',
      product: productLabel(p),
      barcode: p.barcode || '',
      category: categoryLabel(p),
      purchaseCost: formatAmount(p.baseCost),
      profitPct: `${Number(p.profitPct || 0)}%`,
      taxPct: `${Number(p.taxPct || 0)}%`,
      finalPrice: formatAmount(finalPrice),
      margin: formatAmount(Number(finalPrice) - Number(p.baseCost || 0)),
    }
  })
}

// CSV export for Tax & Profit catalog table (TC-054)
export function exportTaxProfitCsv({ items = [], currency = 'PKR' } = {}) {
  const code = normalizeCurrency(currency)
  const rows = buildRows(items)
  if (!rows.length) throw new Error('No rows to export')

  const headers = [
    'SKU ID',
    'Product',
    'Barcode',
    'Category',
    `Purchase Cost (${code})`,
    'Profit %',
    'Tax %',
    `Final Price (${code})`,
    `Margin (${code})`,
  ]

  exportRowsToCsv({
    filename: `tax-profit-catalog-${code}.csv`,
    headers,
    rows: rows.map((r) => [
      r.sku,
      r.product,
      r.barcode,
      r.category,
      r.purchaseCost,
      r.profitPct,
      r.taxPct,
      r.finalPrice,
      r.margin,
    ]),
  })
}

// PDF export for Tax & Profit catalog table (TC-054)
export function exportTaxProfitPdf({ items = [], currency = 'PKR' } = {}) {
  const code = normalizeCurrency(currency)
  const rows = buildRows(items)
  if (!rows.length) throw new Error('No rows to export')

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const margin = 12
  const pageW = doc.internal.pageSize.getWidth()
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Catalog Pricing & Profit Margins', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Currency: ${code}  ·  Generated: ${formatDateTimeInline(new Date())}`, margin, y)
  y += 4
  doc.text('Final Price = (Purchase Cost + Profit) + Tax on Subtotal', margin, y)
  y += 6

  const cols = [
    { label: 'SKU', w: 32 },
    { label: 'Product', w: 48 },
    { label: 'Barcode', w: 28 },
    { label: 'Category', w: 36 },
    { label: 'Cost', w: 22 },
    { label: 'Profit%', w: 18 },
    { label: 'Tax%', w: 16 },
    { label: 'Final', w: 22 },
    { label: 'Margin', w: 22 },
  ]
  const startX = margin
  const rowH = 6

  function drawHeader() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    let x = startX
    for (const col of cols) {
      doc.text(col.label, x, y)
      x += col.w
    }
    y += 3
    doc.setDrawColor(180)
    doc.line(margin, y, pageW - margin, y)
    y += 4
    doc.setFont('helvetica', 'normal')
  }

  drawHeader()

  for (const r of rows) {
    if (y > doc.internal.pageSize.getHeight() - 14) {
      doc.addPage()
      y = 14
      drawHeader()
    }
    const cells = [
      r.sku,
      r.product,
      r.barcode,
      r.category,
      r.purchaseCost,
      r.profitPct,
      r.taxPct,
      r.finalPrice,
      r.margin,
    ]
    let x = startX
    doc.setFontSize(7.5)
    let maxLines = 1
    for (let i = 0; i < cols.length; i += 1) {
      const text = String(cells[i] ?? '')
      const lines = text.split('\n').map((line) => (line.length > 28 ? `${line.slice(0, 27)}…` : line))
      maxLines = Math.max(maxLines, lines.length)
      lines.forEach((line, lineIndex) => {
        doc.text(line, x, y + lineIndex * 3.2)
      })
      x += cols[i].w
    }
    y += Math.max(rowH, maxLines * 3.2 + 1.5)
  }

  doc.save(`tax-profit-catalog-${code}.pdf`)
}
