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

// FluxOne branded Excel-compatible HTML (.xls) — purple header + optional row colors
export function exportRowsToStyledExcel({
  filename,
  headers = [],
  rows = [],
  sheetName = 'Export',
  rowStyles = null, // optional [{ background }] per data row
  freezeHeader = false,
  enableFilter = false,
}) {
  if (!rows?.length) {
    throw new Error('No rows to export')
  }

  const headerBg = BRAND.deep || '#412283'
  const zebraBg = BRAND.soft || '#f3e8f5'
  const colCount = headers.length
  const lastColLetter = excelColLetter(Math.max(colCount, 1))

  const headCells = headers
    .map(
      (h) =>
        `<th style="background:${headerBg};color:#ffffff;font-weight:700;padding:10px 12px;border:1px solid #d1d5db;text-align:left;white-space:nowrap;">${escapeHtml(h)}</th>`,
    )
    .join('')

  const bodyRows = rows
    .map((row, index) => {
      // Prefer explicit row style; else zebra striping
      const styleBg = Array.isArray(rowStyles) ? rowStyles[index]?.background : null
      const bg = styleBg || (index % 2 === 1 ? zebraBg : '#ffffff')
      const cells = row
        .map(
          (cell) =>
            `<td style="background:${bg};color:#1e293b;padding:8px 12px;border:1px solid #e2e8f0;vertical-align:middle;">${escapeHtml(cell)}</td>`,
        )
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  // Excel XML options — freeze top row + autofilter when requested
  const freezeXml = freezeHeader
    ? `<x:FreezePanes/><x:FrozenNoSplit/><x:SplitHorizontal>1</x:SplitHorizontal><x:TopRowBottomPane>1</x:TopRowBottomPane><x:ActivePane>2</x:ActivePane>`
    : ''
  const filterAttr = enableFilter
    ? ` x:autofilterrange="A1:${lastColLetter}${rows.length + 1}"`
    : ''

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]><xml>
 <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
  <x:Name>${escapeHtml(sheetName)}</x:Name>
  <x:WorksheetOptions><x:DisplayGridlines/>${freezeXml}</x:WorksheetOptions>
 </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
</xml><![endif]-->
</head>
<body>
<table${filterAttr}>
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

// 1 → A, 26 → Z, 27 → AA
function excelColLetter(n) {
  let num = Math.max(1, Number(n) || 1)
  let letters = ''
  while (num > 0) {
    const rem = (num - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    num = Math.floor((num - 1) / 26)
  }
  return letters
}
