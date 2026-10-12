// Shared CSV / Excel-compatible export helpers (reuse across admin & branch pages).
import { BRAND } from '@/lib/constants'

export function escapeCsvCell(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function rowsToCsv(headers = [], rows = []) {
  const lines = [headers.map(escapeCsvCell).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','))
  }
  return lines.join('\n')
}

// UTF-8 BOM so Excel opens international characters correctly
export function downloadCsv(filename, csvContent) {
  const safeName = String(filename || 'export.csv').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeName.endsWith('.csv') ? safeName : `${safeName}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportRowsToCsv({ filename, headers, rows }) {
  if (!rows?.length) {
    throw new Error('No rows to export')
  }
  downloadCsv(filename, rowsToCsv(headers, rows))
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// FluxOne branded Excel-compatible HTML (.xls) — purple header + zebra rows
export function exportRowsToStyledExcel({
  filename,
  headers = [],
  rows = [],
  sheetName = 'Export',
}) {
  if (!rows?.length) {
    throw new Error('No rows to export')
  }

  const headerBg = BRAND.deep || '#412283'
  const zebraBg = BRAND.soft || '#f3e8f5'

  const headCells = headers
    .map(
      (h) =>
        `<th style="background:${headerBg};color:#ffffff;font-weight:700;padding:10px 12px;border:1px solid #d1d5db;text-align:left;white-space:nowrap;">${escapeHtml(h)}</th>`,
    )
    .join('')

  const bodyRows = rows
    .map((row, index) => {
      const bg = index % 2 === 1 ? zebraBg : '#ffffff'
      const cells = row
        .map(
          (cell) =>
            `<td style="background:${bg};color:#1e293b;padding:8px 12px;border:1px solid #e2e8f0;vertical-align:middle;">${escapeHtml(cell)}</td>`,
        )
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]><xml>
 <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
  <x:Name>${escapeHtml(sheetName)}</x:Name>
  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
 </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
</xml><![endif]-->
</head>
<body>
<table>
  <thead><tr>${headCells}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>
</body>
</html>`

  const safeName = String(filename || 'export.xls').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeName.endsWith('.xls') || safeName.endsWith('.xlsx')
    ? safeName
    : `${safeName}.xls`
  anchor.click()
  URL.revokeObjectURL(url)
}
