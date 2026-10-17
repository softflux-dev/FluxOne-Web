import { jsPDF } from 'jspdf'
import { exportRowsToCsv } from '@/lib/csvExport'
import { formatAmount, normalizeCurrency } from '@/lib/currency'
import { formatDateTimeInline } from '@/lib/formatDateTime'
import {
  actualMarginAmount,
  actualMarginPercent,
  finalPriceFromSelling,
} from '@/lib/pricing'
import { FINAL_PRICE_FORMULA, MARGIN_FORMULA } from '@/lib/pricingFormulaCopy'

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
    const sellingPrice = Number(p.sellingPrice ?? 0)
    const discountPercent = Number(p.discountPercent ?? 0)
    const taxPct = Number(p.taxPct ?? 0)
    const baseCost = Number(p.baseCost ?? 0)
    const finalPrice =
      p.finalPrice ?? finalPriceFromSelling(sellingPrice, discountPercent, taxPct)
    const marginAmount = p.marginAmount ?? actualMarginAmount(baseCost, sellingPrice)
    const marginPercent = p.marginPercent ?? actualMarginPercent(baseCost, sellingPrice)
    return {
      sku: p.itemCode || p.id || '',
      product: productLabel(p),
      barcode: p.barcode || '',
      category: categoryLabel(p),
      purchaseCost: formatAmount(baseCost),
      profitPct: `${Number(p.profitPct || 0)}%`,
      taxPct: `${taxPct}%`,
      sellingPrice: formatAmount(sellingPrice),
      margin: formatAmount(marginAmount),
      marginPct: `${marginPercent}%`,
      finalPrice: formatAmount(finalPrice),
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
    `Purchase (${code})`,
    'Profit %',
    'Tax %',
    `Selling (${code})`,
    `Margin (${code})`,
    'Margin %',
    `Final incl. tax (${code})`,
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
      r.sellingPrice,
      r.margin,
      r.marginPct,
      r.finalPrice,
    ]),
  })
}

// PDF export for Tax & Profit catalog table (TC-054)
export function exportTaxProfitPdf({ items = [], currency = 'PKR' } = {}) {
  const code = normalizeCurrency(currency)
  const rows = buildRows(items)
  if (!rows.length) throw new Error('No rows to export')

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const margin = 10
  const pageW = doc.internal.pageSize.getWidth()
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Catalog Pricing & Profit Margins', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Currency: ${code}  ·  Generated: ${formatDateTimeInline(new Date())}`, margin, y)
  y += 4
  doc.text(FINAL_PRICE_FORMULA, margin, y)
  y += 3.5
  doc.text(MARGIN_FORMULA, margin, y)
  y += 6

  const cols = [
    { label: 'SKU', w: 28 },
    { label: 'Product', w: 40 },
    { label: 'Barcode', w: 24 },
    { label: 'Category', w: 30 },
    { label: 'Purchase', w: 20 },
    { label: 'Profit%', w: 16 },
    { label: 'Tax%', w: 14 },
    { label: 'Selling', w: 20 },
    { label: 'Margin', w: 18 },
    { label: 'Final', w: 20 },
  ]
  const startX = margin
  const rowH = 6

  function drawHeader() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
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
      r.sellingPrice,
      `${r.margin} (${r.marginPct})`,
      r.finalPrice,
    ]
    let x = startX
    doc.setFontSize(7)
    let maxLines = 1
    for (let i = 0; i < cols.length; i += 1) {
      const text = String(cells[i] ?? '')
      const lines = text.split('\n').map((line) => (line.length > 26 ? `${line.slice(0, 25)}…` : line))
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
