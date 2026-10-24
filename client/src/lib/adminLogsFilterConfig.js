/** Tab-specific filter options — labels from docs/Admin Logs Module.md §3.2. */

export const ADMIN_LOG_STOCK_MOVEMENTS = Object.freeze([
  { value: 'stock_in', label: 'Stock In' },
  { value: 'stock_out', label: 'Stock Out' },
  { value: 'stock_adjustment', label: 'Adjustment' },
  { value: 'stock_damaged', label: 'Damaged' },
  { value: 'stock_expired', label: 'Expired' },
  { value: 'stock_other', label: 'Expired/other' },
])

export const ADMIN_LOG_PRICING_CHANGE_TYPES = Object.freeze([
  { value: 'selling_price_change', label: 'Selling Price' },
  { value: 'purchase_price_change', label: 'Purchase Price' },
  { value: 'offer_apply', label: 'Discount Offer Applied' },
  { value: 'offer_remove', label: 'Offer Removed' },
  { value: 'bundle_price_change', label: 'Bundle Price Changed' },
])

export const ADMIN_LOG_PRODUCT_ACTIONS = Object.freeze([
  { value: 'product_create', label: 'Product Added' },
  { value: 'product_update', label: 'Product Edited' },
  { value: 'product_deactivate', label: 'Product Deactivated' },
  { value: 'product_reactivate', label: 'Product Reactivated' },
  { value: 'variant_combination_add', label: 'Variant Combination Added' },
  { value: 'variant_combination_deactivate', label: 'Variant Combination Deactivated' },
])

export const ADMIN_LOG_BUNDLE_ACTIONS = Object.freeze([
  { value: 'bundle_create', label: 'Bundle Created' },
  { value: 'bundle_top_up', label: 'Stock Top-Up' },
  { value: 'bundle_deactivate', label: 'Bundle Deactivated' },
  { value: 'bundle_delete', label: 'Bundle Deleted' },
])

export const ADMIN_LOG_VARIANT_ACTIONS = Object.freeze([
  { value: 'variant_type_create', label: 'Variant Type Created / Custom Type Added' },
  { value: 'variant_type_update', label: 'Variant Type Edited' },
  { value: 'variant_type_delete', label: 'Variant Type Deleted' },
  { value: 'variant_value_create', label: 'Variant Value Added / Custom Value Added' },
  { value: 'variant_value_update', label: 'Variant Value Edited' },
  { value: 'variant_value_delete', label: 'Variant Value Deleted' },
])

export const ADMIN_LOG_EMPLOYEE_ACTIONS = Object.freeze([
  { value: 'staff_create', label: 'Employee Added' },
  { value: 'staff_role_change', label: 'Role Changed' },
  { value: 'staff_status', label: 'Employee Deactivated / Reactivated' },
])

export const ADMIN_LOG_SETTING_CATEGORIES = Object.freeze([
  { value: 'branch_settings', label: 'Branch Settings' },
  { value: 'tax_configuration', label: 'Tax Configuration' },
  { value: 'policy', label: 'Policy' },
  { value: 'notification', label: 'Notification' },
  { value: 'other', label: 'Other' },
])

export const ADMIN_LOG_HARDWARE_ACTIONS = Object.freeze([
  { value: 'hardware_register', label: 'Device Registered' },
  { value: 'hardware_remove', label: 'Device Removed' },
  { value: 'hardware_status', label: 'Device Status Changed' },
  { value: 'device_status', label: 'Device Status Changed (Admin)' },
])

export const ADMIN_LOG_ORDER_SUPPLIER_ACTIONS = Object.freeze([
  { value: 'supplier_create', label: 'Supplier Created' },
  { value: 'supplier_update', label: 'Supplier Edited' },
  { value: 'supplier_block', label: 'Supplier Blocked' },
  { value: 'supplier_unblock', label: 'Supplier Unblocked' },
  { value: 'supplier_delete', label: 'Supplier Deleted' },
  { value: 'order_generate', label: 'Order Submitted' },
  { value: 'order_edit', label: 'Order Edited by BM' },
  { value: 'order_approve', label: 'Order Approved' },
  { value: 'order_reject', label: 'Order Rejected' },
  { value: 'order_receival', label: 'Receival Recorded' },
  { value: 'order_complete', label: 'Order Completed' },
  { value: 'invoice_generate', label: 'Invoice Generated' },
  { value: 'invoice_send', label: 'Invoice Sent' },
])

export const ADMIN_LOG_ORDER_STATUSES = Object.freeze([
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'received', label: 'Received' },
])

export const ADMIN_LOG_PRODUCT_TYPE_OPTIONS = Object.freeze([
  { value: '', label: 'All' },
  { value: 'normal', label: 'Normal Product' },
  { value: 'variant', label: 'Variant Product' },
])

/** Reset tab-specific filter keys when switching tabs or clearing. */
export const ADMIN_LOG_TAB_FILTER_KEYS = Object.freeze([
  'action',
  'actions',
  'entityId',
  'productType',
  'variantTypeId',
  'supplierId',
  'orderStatus',
  'settingCategory',
  'q',
])
