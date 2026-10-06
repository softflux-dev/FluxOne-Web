import { jsPDF } from 'jspdf'
import { DEFAULT_CURRENCY, formatMoney, normalizeCurrency } from '@/lib/currency'
import { formatClockTime, formatDateTimeInline } from '@/lib/formatDateTime'

function safeFilename(value, fallback = 'download') {
  const base = String(value || fallback)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80)
  return base || fallback
}

// Peak window API is 24h ("10:00–11:00") → PDF shows 12h AM/PM
function formatPeakWindowPdf(peakHour) {
  if (!peakHour || peakHour === '—') return '—'
  const parts = String(peakHour).split(/[–-]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return formatClockTime(peakHour) || peakHour
  const start = formatClockTime(parts[0]) || parts[0]
  const end = formatClockTime(parts[1]) || parts[1]
  return `${start}–${end}`
}

async function blobUrlToDataUrl(url) {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read barcode image'))
    reader.readAsDataURL(blob)
  })
}

// Download product barcode as a one-page PDF (no printer required).
export async function downloadBarcodePdf({ product, pngUrl }) {
  if (!pngUrl) throw new Error('Barcode image is missing')

  const dataUrl = await blobUrlToDataUrl(pngUrl)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [100, 60],
  })

  const name = product?.name || 'Product'
  const code = product?.itemCode || ''
  const barcode = product?.barcode || ''

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(name.slice(0, 48), 50, 10, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text([code, barcode].filter(Boolean).join('  ·  '), 50, 16, { align: 'center' })

  const imgW = 70
  const imgH = 28
  doc.addImage(dataUrl, 'PNG', (100 - imgW) / 2, 22, imgW, imgH)

  const filename = `${safeFilename(barcode || code || name, 'barcode')}.pdf`
  doc.save(filename)
  return { filename }
}

// Download purchase order as PDF from structured order detail.
export function downloadPurchaseOrderPdf(order) {
  if (!order) throw new Error('Order is missing')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  let y = 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(`Purchase Order ${order.orderNumber || ''}`, margin, y)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const meta = [
    `Company: ${order.companyName || '—'}`,
    `Representative: ${order.representativeName || '—'} (${order.representativePhone || '—'})`,
    `Status: ${order.status || '—'}`,
  ]
  if (order.explanation) meta.push(`Explanation: ${order.explanation}`)

  for (const line of meta) {
    const wrapped = doc.splitTextToSize(line, 180)
    doc.text(wrapped, margin, y)
    y += wrapped.length * 5 + 2
  }

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const cols = [
    { label: 'Item', x: margin, w: 80 },
    { label: 'Scale', x: margin + 82, w: 22 },
    { label: 'Qty', x: margin + 106, w: 22 },
    { label: 'Unit cost', x: margin + 130, w: 30 },
  ]
  cols.forEach((col) => doc.text(col.label, col.x, y))
  y += 2
  doc.setDrawColor(180)
  doc.line(margin, y, 196, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  const lines = Array.isArray(order.lines) ? order.lines : []
  for (const line of lines) {
    if (y > 275) {
      doc.addPage()
      y = 18
    }
    const title = `${line.name || 'Item'}${line.itemCode ? ` (${line.itemCode})` : ''}`
    const titleLines = doc.splitTextToSize(title, 78)
    doc.text(titleLines, cols[0].x, y)
    doc.text(String(line.scale || '—'), cols[1].x, y)
    doc.text(String(line.quantity ?? '—'), cols[2].x, y)
    doc.text(String(line.unitCost ?? '—'), cols[3].x, y)
    y += Math.max(titleLines.length * 5, 7)
  }

  const filename = `${safeFilename(order.orderNumber || 'purchase-order')}.pdf`
  doc.save(filename)
  return { filename }
}

// SaaS billing invoice receipt PDF (Subscription & Invoices).
export function downloadBillingInvoicePdf(invoice, company = {}) {
  if (!invoice) throw new Error('Invoice is missing')

  const currency = normalizeCurrency(invoice.currency || company.currency || DEFAULT_CURRENCY)
  const money = (amount) => formatMoney(amount, currency)
  const totalLabel = invoice.formattedPrice || money(invoice.price)

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 16
  let y = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(company.name || 'FluxOne Enterprise Solutions', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  if (company.supportEmail) doc.text(String(company.supportEmail), margin, y)
  y += 5
  if (company.registrationTaxId) {
    doc.text(`Tax ID: ${company.registrationTaxId}`, margin, y)
    y += 5
  }
  doc.setTextColor(0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`Invoice ${invoice.trackingId || ''}`, 196 - margin, 20, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(String(invoice.dateTime || ''), 196 - margin, 26, { align: 'right' })
  doc.text(`Status: ${invoice.status || '—'}`, 196 - margin, 32, { align: 'right' })

  y = Math.max(y, 40)
  doc.setDrawColor(200)
  doc.line(margin, y, 196 - margin, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Plan / Source', margin, y)
  doc.setFont('helvetica', 'normal')
  y += 5
  doc.text(String(invoice.source || '—'), margin, y)
  y += 7
  if (invoice.billingCycle) {
    doc.text(`Billing cycle: ${invoice.billingCycle}`, margin, y)
    y += 5
  }
  if (invoice.paymentMethod) {
    doc.text(`Payment: ${invoice.paymentMethod}`, margin, y)
    y += 5
  }

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Description', margin, y)
  doc.text('Amount', 196 - margin, y, { align: 'right' })
  y += 2
  doc.line(margin, y, 196 - margin, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  const items = Array.isArray(invoice.items) ? invoice.items : []
  if (items.length === 0) {
    doc.text(String(invoice.source || 'Subscription charge'), margin, y)
    doc.text(String(totalLabel), 196 - margin, y, { align: 'right' })
    y += 7
  } else {
    for (const item of items) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      const desc = doc.splitTextToSize(String(item.description || 'Line item'), 130)
      doc.text(desc, margin, y)
      doc.text(money(item.amount), 196 - margin, y, { align: 'right' })
      y += Math.max(desc.length * 5, 7)
    }
  }

  y += 2
  doc.setDrawColor(30)
  doc.line(margin, y, 196 - margin, y)
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total', margin, y)
  doc.text(String(totalLabel), 196 - margin, y, { align: 'right' })

  const filename = `${safeFilename(invoice.trackingId || 'invoice')}.pdf`
  doc.save(filename)
  return { filename }
}

function ensurePageSpace(doc, y, needed = 20, margin = 14) {
  if (y + needed <= 285) return y
  doc.addPage()
  return margin
}

function drawBwSectionTitle(doc, title, y, margin = 14) {
  y = ensurePageSpace(doc, y, 12, margin)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text(title, margin, y)
  y += 2
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.line(margin, y, 196 - margin, y)
  doc.setLineWidth(0.2)
  return y + 6
}

function drawBwRow(doc, cells, y, margin = 14, { bold = false } = {}) {
  y = ensurePageSpace(doc, y, 8, margin)
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  const colW = (196 - margin * 2) / Math.max(cells.length, 1)
  cells.forEach((cell, index) => {
    const text = String(cell ?? '—')
    const clipped = doc.splitTextToSize(text, colW - 2)[0] || text
    doc.text(clipped, margin + index * colW, y)
  })
  return y + 6
}

/** Branch manager dashboard report — B&W direct download (company → branch → content). */
export function downloadBranchDashboardPdf({
  companyName = 'Company',
  branchName = 'Branch',
  managerName = 'Branch Manager',
  date,
  from,
  to,
  kpis = {},
  dailySummary = {},
  topProducts = [],
  lowProducts = [],
  staff = [],
  counters = [],
  formatCurrency: money = (v) => String(v ?? '—'),
  formatPct: pct = (v) => String(v ?? '—'),
} = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  let y = 18

  const reportFrom = from || date || new Date().toISOString().slice(0, 10)
  const reportTo = to || date || reportFrom
  const rangeLabel =
    reportFrom === reportTo ? reportFrom : `${reportFrom} → ${reportTo}`
  const generatedAt = formatDateTimeInline(new Date())
  const company = String(companyName || 'Company').trim() || 'Company'
  const branch = String(branchName || 'Branch').trim() || 'Branch'

  // Header: Company → Branch → report meta (black & white only)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text(company, margin, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`Branch: ${branch}`, margin, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Branch Performance & Daily Analytics Report', margin, y)
  y += 5
  doc.text(`Branch Manager: ${managerName}`, margin, y)
  y += 5
  doc.text(`Report range: ${rangeLabel}  |  Generated: ${generatedAt}`, margin, y)
  y += 4
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(margin, y, 196 - margin, y)
  doc.setLineWidth(0.2)
  y += 10

  y = drawBwSectionTitle(doc, 'Key performance', y, margin)
  // Key KPIs — Profit only (no Average Ticket)
  y = drawBwRow(
    doc,
    [`Total sales: ${money(kpis.totalSales)}`, `Profit: ${money(kpis.profit)}`],
    y,
    margin,
  )
  y = drawBwRow(
    doc,
    [`Sales change: ${pct(kpis.salesChangePct)}`, `Profit change: ${pct(kpis.profitChangePct)}`],
    y,
    margin,
  )
  y = drawBwRow(
    doc,
    [`Transactions: ${Number(kpis.saleCount || dailySummary.orders || 0).toLocaleString()}`],
    y,
    margin,
  )
  y += 4

  y = drawBwSectionTitle(doc, 'Daily sales throughput', y, margin)
  y = drawBwRow(
    doc,
    [
      `Revenue: ${money(dailySummary.revenue || kpis.totalSales)}`,
      `Items sold: ${Number(dailySummary.itemsSold || 0).toLocaleString()}`,
    ],
    y,
    margin,
  )
  y = drawBwRow(
    doc,
    [
      `Peak window: ${formatPeakWindowPdf(dailySummary.peakHour)}`,
      `Peak revenue: ${dailySummary.peakHourSales ? money(dailySummary.peakHourSales) : '—'}`,
    ],
    y,
    margin,
  )
  y += 4

  const counterList = Array.isArray(counters) ? counters : []
  if (counterList.length) {
    y = drawBwSectionTitle(doc, 'POS counters', y, margin)
    y = drawBwRow(doc, ['Counter', 'Sales', 'Orders'], y, margin, { bold: true })
    for (const c of counterList) {
      // Prefer configured code/name — never print raw UUID
      const code = String(c.code || '').trim()
      const name = String(c.name || '').trim()
      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      const label =
        (code && !uuidRe.test(code) && code) ||
        (name && !uuidRe.test(name) && name) ||
        'Unassigned till'
      y = drawBwRow(
        doc,
        [label, money(c.sales), `${Number(c.orders || 0)} orders`],
        y,
        margin,
      )
    }
    y += 4
  }

  const topList = (Array.isArray(topProducts) ? topProducts : []).slice(0, 8)
  y = drawBwSectionTitle(doc, 'Top higher sales products', y, margin)
  if (!topList.length) {
    y = drawBwRow(doc, ['No sales for this date'], y, margin)
  } else {
    y = drawBwRow(doc, ['Product', 'Units', 'Sales', 'Change'], y, margin, { bold: true })
    for (const p of topList) {
      y = drawBwRow(
        doc,
        [p.name || '—', `${Number(p.units || 0)}`, money(p.sales), pct(p.changePct)],
        y,
        margin,
      )
    }
  }
  y += 4

  const lowList = (Array.isArray(lowProducts) ? lowProducts : []).slice(0, 8)
  y = drawBwSectionTitle(doc, 'Lowest volume products', y, margin)
  if (!lowList.length) {
    y = drawBwRow(doc, ['No sales for this date'], y, margin)
  } else {
    y = drawBwRow(doc, ['Product', 'Units', 'Sales', 'Change'], y, margin, { bold: true })
    for (const p of lowList) {
      y = drawBwRow(
        doc,
        [p.name || '—', `${Number(p.units || 0)}`, money(p.sales), pct(p.changePct)],
        y,
        margin,
      )
    }
  }
  y += 4

  const staffList = (Array.isArray(staff) ? staff : []).slice(0, 12)
  y = drawBwSectionTitle(doc, 'Staff score rating', y, margin)
  if (!staffList.length) {
    y = drawBwRow(doc, ['No staff assigned'], y, margin)
  } else {
    y = drawBwRow(doc, ['Staff', 'Role', 'Status', 'Score'], y, margin, { bold: true })
    for (const s of staffList) {
      y = drawBwRow(
        doc,
        [
          s.name || s.fullName || '—',
          s.role || s.designation || 'Staff',
          s.status || 'Active',
          `${Number(s.rating ?? s.points ?? 0).toFixed(2)}%`,
        ],
        y,
        margin,
      )
    }
  }

  y = ensurePageSpace(doc, y, 16, margin)
  y += 6
  doc.setDrawColor(0, 0, 0)
  doc.line(margin, y, 196 - margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.text(
    `${company} · ${branch} · Branch Analytics Report`,
    105,
    y,
    { align: 'center' },
  )

  const filename = `${safeFilename(`${company}_${branch}_Report_${reportFrom === reportTo ? reportFrom : `${reportFrom}_to_${reportTo}`}`)}.pdf`
  doc.save(filename)
  return { filename }
}
