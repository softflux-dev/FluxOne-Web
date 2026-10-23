// Normalize notification display — short header + full gray detail body + branch capsule
export function displayNotification(n = {}) {
  const type = String(n.type || '')
  const meta = n.meta && typeof n.meta === 'object' ? n.meta : {}
  const branchName = meta.branchName || null

  if (type === 'leave_request') {
    const employeeName =
      meta.managerName || meta.employeeName || meta.staffName || n.name || 'Employee'
    const detail =
      n.body && n.body !== n.title
        ? n.body
        : n.body || n.title || ''
    return {
      title: `New Leave Request From ${employeeName}`,
      body: detail,
      branchName: meta.branchName || null,
    }
  }

  if (type === 'stock_request') {
    const product = meta.productName || 'product'
    const qty = meta.requiredQuantity
    return {
      title: n.title || 'Stock request',
      body:
        n.body && n.body !== n.title
          ? n.body
          : `${qty != null ? `${qty} unit(s) of ` : ''}${product}`,
      branchName,
    }
  }

  if (type === 'holiday_created') {
    return {
      title: n.title || 'Holiday Announced',
      body: n.body && n.body !== n.title ? n.body : n.body || '',
      branchName,
    }
  }

  if (type === 'custom_variant_catalog') {
    return {
      title: n.title || 'New Custom Variant Added to Catalog',
      body: n.body && n.body !== n.title ? n.body : n.body || '',
      branchName,
    }
  }

  return {
    title: n.title || 'Notification',
    body: n.body && n.body !== n.title ? n.body : n.body || '',
    branchName,
  }
}
