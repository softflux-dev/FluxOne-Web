// Live purchase-order / order-request mapper (IM + BM API).
export function mapPurchaseOrder(row = {}) {
  const lines = Array.isArray(row.lines)
    ? row.lines.map((line) => ({
        id: line.id,
        supplierId: line.supplierId ?? line.supplier_id ?? null,
        supplierCompanyName: line.supplierCompanyName || line.supplier_company_name || '',
        productId: line.productId ?? line.product_id ?? line.itemId,
        name: line.name || '',
        itemCode: line.itemCode || line.item_code || '',
        scale: line.scale || 'unit',
        quantity: Number(line.quantity ?? 0),
        receivedQuantity: Number(line.receivedQuantity ?? line.received_quantity ?? 0),
        unitCost: Number(line.unitCost ?? line.unit_cost ?? 0),
        lastPurchasePrice: Number(line.lastPurchasePrice ?? line.last_purchase_price ?? 0),
      }))
    : []

  const companies = Array.isArray(row.companies)
    ? row.companies.map((company) => ({
        id: company.id,
        supplierId: company.supplierId ?? company.supplier_id ?? null,
        companyName: company.companyName || company.company_name || '',
        imageUrl: company.imageUrl || company.image_url || null,
        representativeName: company.representativeName || '',
        representativePhone: company.representativePhone || '',
        companyPhone: company.companyPhone || '',
        sortOrder: Number(company.sortOrder ?? company.sort_order ?? 0),
        lines: Array.isArray(company.lines)
          ? company.lines.map((line) => ({
              id: line.id,
              supplierId: line.supplierId ?? company.supplierId ?? null,
              productId: line.productId ?? line.product_id,
              name: line.name || '',
              itemCode: line.itemCode || line.item_code || '',
              scale: line.scale || 'unit',
              quantity: Number(line.quantity ?? 0),
              receivedQuantity: Number(line.receivedQuantity ?? line.received_quantity ?? 0),
              unitCost: Number(line.unitCost ?? line.unit_cost ?? 0),
              lastPurchasePrice: Number(line.lastPurchasePrice ?? line.last_purchase_price ?? 0),
            }))
          : lines.filter(
              (line) =>
                line.supplierId &&
                line.supplierId === (company.supplierId ?? company.supplier_id),
            ),
      }))
    : []

  const events = Array.isArray(row.events)
    ? row.events.map((event) => ({
        id: event.id,
        eventType: event.eventType || event.event_type || '',
        actorId: event.actorId ?? event.actor_id ?? null,
        actorName: event.actorName || event.actor_name || '',
        payload: event.payload || {},
        createdAt: event.createdAt || event.created_at || null,
      }))
    : []

  return {
    id: row.id,
    orderNumber: row.orderNumber || row.order_number || row.reference || '',
    supplierId: row.supplierId ?? row.supplier_id ?? null,
    companyName: row.companyName || row.company_name || row.supplierName || '',
    representativeName: row.representativeName || row.representative_name || '',
    representativePhone: row.representativePhone || row.representative_phone || '',
    companyPhone: row.companyPhone || row.company_phone || '',
    // New submits are Pending until BM approves
    status: row.status || 'pending',
    explanation: row.explanation || '',
    createdAt: row.createdAt || row.created_at || null,
    createdBy: row.createdBy ?? row.created_by ?? null,
    createdByName: row.createdByName || row.created_by_name || '',
    approvedBy: row.approvedBy ?? row.approved_by ?? null,
    approvedByName: row.approvedByName || '',
    approvedAt: row.approvedAt || row.approved_at || null,
    rejectedBy: row.rejectedBy ?? row.rejected_by ?? null,
    rejectedByName: row.rejectedByName || '',
    rejectedAt: row.rejectedAt || row.rejected_at || null,
    rejectionNotes: row.rejectionNotes || row.rejection_notes || '',
    receivedAt: row.receivedAt || row.received_at || null,
    companiesNumber: Number(
      row.companiesNumber ?? row.companies_number ?? companies.length ?? 0,
    ),
    itemsNumber: Number(
      row.itemsNumber ?? row.items_number ?? lines.length ?? 0,
    ),
    companies,
    lines,
    events,
  }
}

export function mapPurchaseHistory(data = {}) {
  return {
    orderId: data.orderId || data.order_id || null,
    orderNumber: data.orderNumber || data.order_number || '',
    companyName: data.companyName || data.company_name || '',
    lines: Array.isArray(data.lines)
      ? data.lines.map((line) => ({
          productId: line.productId,
          name: line.name || '',
          itemCode: line.itemCode || '',
          scale: line.scale || '',
          lastPurchasePrice: Number(line.lastPurchasePrice ?? 0),
          currentPurchasePrice: Number(line.currentPurchasePrice ?? 0),
          direction: line.direction || 'same',
        }))
      : [],
  }
}
