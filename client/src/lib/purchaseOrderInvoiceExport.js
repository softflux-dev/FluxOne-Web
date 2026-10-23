// TL §10 — purchase order invoice PDF + Excel (one supplier per invoice)
import { jsPDF } from 'jspdf'
import { formatDateLine } from '@/lib/formatDateTime'
import { exportRowsToStyledExcel } from '@/lib/csvExport'

const DOWNLOAD_STATUSES = new Set(['approved', 'partially_received', 'received'])

export function canDownloadPurchaseOrderInvoices(status) {
  return DOWNLOAD_STATUSES.has(String(status || ''))
}

function safeFilename(value, fallback = 'invoice') {
  const base = String(value || fallback)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80)
  return base || fallback
}

function money(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function urlToDataUrl(url) {
  if (!url) return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Failed to read signature image'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function invoiceItems(invoice) {
  return Array.isArray(invoice?.items) ? invoice.items : []
}

function sheetNameForInvoice(invoice, index) {
  const raw = String(invoice?.invoiceNumber || `Invoice-${index + 1}`)
    .replace(/[\\/*?:\[\]]/g, '-')
    .slice(0, 31)
  return raw || `Invoice-${index + 1}`
}

// Build jsPDF doc for one supplier invoice (TL §10.2)
export async function buildPurchaseOrderInvoicePdf(invoice) {
  if (!invoice) throw new Error('Invoice is missing')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 16
  const pageWidth = 210
  let y = 18

  const supplier = invoice.supplier || {}
  const branch = invoice.branch || {}
  const items = invoiceItems(invoice)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Purchase Order Invoice', margin, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Invoice #: ${invoice.invoiceNumber || '—'}`, margin, y)
  y += 5
  doc.text(`Invoice date: ${formatDateLine(invoice.invoiceDate)}`, margin, y)
  y += 5
  if (invoice.orderNumber) {
    doc.text(`Order #: ${invoice.orderNumber}`, margin, y)
    y += 5
  }

  y += 3
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // Supplier block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Supplier', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const supplierLines = [
    supplier.companyName || '—',
    supplier.location ? `Address: ${supplier.location}` : null,
    supplier.registrationNumber ? `Registration: ${supplier.registrationNumber}` : null,
    supplier.representativeName ? `Representative: ${supplier.representativeName}` : null,
    supplier.representativeEmail ? `Email: ${supplier.representativeEmail}` : null,
  ].filter(Boolean)
  for (const line of supplierLines) {
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2)
    doc.text(wrapped, margin, y)
    y += wrapped.length * 5
  }

  y += 4
  // Branch block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Issuing branch', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const branchLines = [
    branch.name || '—',
    branch.location ? `Location: ${branch.location}` : null,
    branch.contact ? `Contact: ${branch.contact}` : null,
  ].filter(Boolean)
  for (const line of branchLines) {
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2)
    doc.text(wrapped, margin, y)
    y += wrapped.length * 5
  }

  y += 6
  // Items table
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const cols = [
    { label: 'Item', x: margin, w: 62 },
    { label: 'Variant', x: margin + 64, w: 28 },
    { label: 'Qty', x: margin + 94, w: 18 },
    { label: 'Prev. price', x: margin + 114, w: 28 },
    { label: 'Line total', x: margin + 144, w: 30 },
  ]
  cols.forEach((col) => doc.text(col.label, col.x, y))
  y += 2
  doc.setDrawColor(180)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  let grandTotal = 0
  for (const line of items) {
    if (y > 250) {
      doc.addPage()
      y = 18
    }
    const qty = Number(line.quantity) || 0
    const unit = Number(line.previousUnitPrice) || 0
    const total = Number(line.lineTotal) || qty * unit
    grandTotal += total

    const nameLines = doc.splitTextToSize(String(line.itemName || 'Item'), cols[0].w)
    doc.text(nameLines, cols[0].x, y)
    doc.text(String(line.variantLabel || '—').slice(0, 18), cols[1].x, y)
    doc.text(String(qty), cols[2].x, y)
    doc.text(money(unit), cols[3].x, y)
    doc.text(money(total), cols[4].x, y)
    y += Math.max(nameLines.length * 5, 7)
  }

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.text(`Grand total: ${money(grandTotal)}`, pageWidth - margin, y, { align: 'right' })
  y += 12

  // Digital signature
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Supplier signature', margin, y)
  y += 4
  const signatureDataUrl = await urlToDataUrl(supplier.signatureUrl)
  if (signatureDataUrl) {
    try {
      const props = doc.getImageProperties(signatureDataUrl)
      const maxW = 50
      const maxH = 22
      const ratio = props.width / Math.max(props.height, 1)
      let imgW = maxW
      let imgH = imgW / ratio
      if (imgH > maxH) {
        imgH = maxH
        imgW = imgH * ratio
      }
      if (y + imgH > 280) {
        doc.addPage()
        y = 18
      }
      const format = String(signatureDataUrl).includes('image/jpeg') ? 'JPEG' : 'PNG'
      doc.addImage(signatureDataUrl, format, margin, y, imgW, imgH)
      y += imgH + 4
    } catch {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Signature on file (unable to embed image)', margin, y + 4)
      y += 10
    }
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text('No digital signature on supplier record', margin, y + 4)
    doc.setTextColor(0)
    y += 10
  }

  const filename = `${safeFilename(invoice.invoiceNumber || 'invoice')}.pdf`
  return { doc, filename }
}

export async function downloadPurchaseOrderInvoicePdf(invoice) {
  const { doc, filename } = await buildPurchaseOrderInvoicePdf(invoice)
  doc.save(filename)
  return { filename }
}

// Base64 PDF for send-to-supplier API
export async function purchaseOrderInvoicePdfBase64(invoice) {
  const { doc, filename } = await buildPurchaseOrderInvoicePdf(invoice)
  const dataUri = doc.output('datauristring')
  const base64 = String(dataUri).includes(',') ? String(dataUri).split(',')[1] : String(dataUri)
  return { base64, filename }
}

function invoiceItemRows(invoice) {
  return invoiceItems(invoice).map((line) => [
    line.itemName || '',
    line.variantLabel || '',
    line.scale || '',
    line.quantity ?? '',
    money(line.previousUnitPrice),
    money(line.lineTotal),
  ])
}

const ITEM_HEADERS = ['Item', 'Variant', 'Scale', 'Qty', 'Previous unit price', 'Line total']

// Single-invoice items Excel — INV-2026-00143-items.xls
export function exportPurchaseOrderInvoiceItemsExcel(invoice) {
  if (!invoice) throw new Error('Invoice is missing')
  const rows = invoiceItemRows(invoice)
  if (!rows.length) throw new Error('No invoice items to export')
  const filename = `${safeFilename(invoice.invoiceNumber || 'invoice')}-items.xls`
  exportRowsToStyledExcel({
    filename,
    headers: ITEM_HEADERS,
    rows,
    sheetName: sheetNameForInvoice(invoice, 0),
    freezeHeader: true,
    enableFilter: true,
  })
  return { filename, count: rows.length }
}

// One workbook per order — one sheet per supplier invoice
export function exportPurchaseOrderInvoicesWorkbook(invoices = [], { orderNumber = '' } = {}) {
  const list = Array.isArray(invoices) ? invoices.filter(Boolean) : []
  if (!list.length) throw new Error('No invoices to export')

  const worksheets = list
    .map((invoice, index) => {
      const rows = invoiceItemRows(invoice)
      const name = escapeXml(sheetNameForInvoice(invoice, index))
      const headerCells = ITEM_HEADERS.map(
        (h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`,
      ).join('')
      const metaRows = [
        ['Invoice #', invoice.invoiceNumber || ''],
        ['Invoice date', formatDateLine(invoice.invoiceDate)],
        ['Supplier', invoice.supplier?.companyName || ''],
        ['Order #', invoice.orderNumber || orderNumber || ''],
        [],
      ]
        .map((pair) => {
          if (!pair.length) {
            return '<Row></Row>'
          }
          return `<Row><Cell><Data ss:Type="String">${escapeXml(pair[0])}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(pair[1])}</Data></Cell></Row>`
        })
        .join('')

      const dataRows = rows
        .map((row) => {
          const cells = row
            .map((cell, i) => {
              const isNum = i >= 3
              const type = isNum && cell !== '' && !Number.isNaN(Number(cell)) ? 'Number' : 'String'
              return `<Cell><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`
            })
            .join('')
          return `<Row>${cells}</Row>`
        })
        .join('')

      return `<Worksheet ss:Name="${name}">
  <Table>
    ${metaRows}
    <Row>${headerCells}</Row>
    ${dataRows}
  </Table>
</Worksheet>`
    })
    .join('\n')

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${worksheets}
</Workbook>`

  const filename = `${safeFilename(orderNumber || 'order')}-invoices.xls`
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
  return { filename, sheetCount: list.length }
}
