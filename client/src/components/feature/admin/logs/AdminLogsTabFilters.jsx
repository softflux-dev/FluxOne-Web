import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { SearchableMultiSelect } from '@/components/feature/products/add-item/SearchableMultiSelect'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import {
  ADMIN_LOG_BUNDLE_ACTIONS,
  ADMIN_LOG_EMPLOYEE_ACTIONS,
  ADMIN_LOG_HARDWARE_ACTIONS,
  ADMIN_LOG_ORDER_STATUSES,
  ADMIN_LOG_ORDER_SUPPLIER_ACTIONS,
  ADMIN_LOG_PRICING_CHANGE_TYPES,
  ADMIN_LOG_PRODUCT_ACTIONS,
  ADMIN_LOG_PRODUCT_TYPE_OPTIONS,
  ADMIN_LOG_SETTING_CATEGORIES,
  ADMIN_LOG_STOCK_MOVEMENTS,
  ADMIN_LOG_VARIANT_ACTIONS,
} from '@/lib/adminLogsFilterConfig'

function useFilterOptions(kind, branchId, productType) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!branchId || !kind) {
      setOptions([])
      return undefined
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      const params = { branchId, kind }
      if (kind === 'products' && productType) params.productType = productType
      const res = await apiClient.get(endpoints.admin.logs.filterOptions, params)
      if (cancelled) return
      setLoading(false)
      if (res.success) {
        setOptions(res.data?.items || [])
      } else {
        setOptions([])
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [branchId, kind, productType])

  return { options, loading }
}

function ActionSelect({ id, label, value, options, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

// Child: tab-specific filters — Parent: AdminLogsFilters
export function AdminLogsTabFilters({ tab, filters, onChange }) {
  const branchId = filters.branchId || ''
  const productType = filters.productType || ''

  const productTabs = ['stock', 'pricing', 'products']
  const { options: products, loading: productsLoading } = useFilterOptions(
    productTabs.includes(tab) ? 'products' : null,
    branchId,
    productType,
  )
  const { options: bundles, loading: bundlesLoading } = useFilterOptions(
    tab === 'bundles' ? 'bundles' : null,
    branchId,
  )
  const { options: suppliers, loading: suppliersLoading } = useFilterOptions(
    tab === 'orders_suppliers' ? 'suppliers' : null,
    branchId,
  )
  const { options: variantTypes, loading: variantTypesLoading } = useFilterOptions(
    tab === 'variants' ? 'variant_types' : null,
    branchId,
  )

  const needsBranchForProduct = ['stock', 'pricing', 'products', 'bundles', 'orders_suppliers'].includes(
    tab,
  )
  const productDisabled = needsBranchForProduct && !branchId

  if (!tab || tab === 'all') return null

  return (
    <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
      {tab === 'stock' ? (
        <>
          <div className="space-y-1.5 sm:col-span-2">
            <SearchableMultiSelect
              label="Movement Type"
              options={ADMIN_LOG_STOCK_MOVEMENTS.map((m) => ({ id: m.value, label: m.label }))}
              value={filters.actions || []}
              onChange={(next) => onChange({ actions: next, action: '' })}
              placeholder="All movement types"
              emptyText="No movement types"
            />
          </div>
          <ActionSelect
            id="admin-logs-product-type"
            label="Product Type"
            value={filters.productType}
            options={ADMIN_LOG_PRODUCT_TYPE_OPTIONS.filter((o) => o.value)}
            onChange={(value) => onChange({ productType: value, entityId: '' })}
          />
          <div className="space-y-1.5">
            <Label htmlFor="admin-logs-stock-product">Product</Label>
            <NativeSelect
              id="admin-logs-stock-product"
              value={filters.entityId || ''}
              disabled={productDisabled || productsLoading}
              onChange={(e) => onChange({ entityId: e.target.value })}
            >
              <option value="">
                {productDisabled ? 'Select branch first' : 'All products'}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </>
      ) : null}

      {tab === 'pricing' ? (
        <>
          <ActionSelect
            id="admin-logs-pricing-action"
            label="Change Type"
            value={filters.action}
            options={ADMIN_LOG_PRICING_CHANGE_TYPES}
            onChange={(value) => onChange({ action: value, actions: [] })}
          />
          <ActionSelect
            id="admin-logs-pricing-product-type"
            label="Product Type"
            value={filters.productType}
            options={ADMIN_LOG_PRODUCT_TYPE_OPTIONS.filter((o) => o.value)}
            onChange={(value) => onChange({ productType: value, entityId: '' })}
          />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="admin-logs-pricing-product">Product</Label>
            <NativeSelect
              id="admin-logs-pricing-product"
              value={filters.entityId || ''}
              disabled={productDisabled || productsLoading}
              onChange={(e) => onChange({ entityId: e.target.value })}
            >
              <option value="">
                {productDisabled ? 'Select branch first' : 'All products'}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </>
      ) : null}

      {tab === 'products' ? (
        <>
          <ActionSelect
            id="admin-logs-products-action"
            label="Action Type"
            value={filters.action}
            options={ADMIN_LOG_PRODUCT_ACTIONS}
            onChange={(value) => onChange({ action: value, actions: [] })}
          />
          <ActionSelect
            id="admin-logs-products-product-type"
            label="Product Type"
            value={filters.productType}
            options={ADMIN_LOG_PRODUCT_TYPE_OPTIONS.filter((o) => o.value)}
            onChange={(value) => onChange({ productType: value, entityId: '' })}
          />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="admin-logs-products-product">Product</Label>
            <NativeSelect
              id="admin-logs-products-product"
              value={filters.entityId || ''}
              disabled={productDisabled || productsLoading}
              onChange={(e) => onChange({ entityId: e.target.value })}
            >
              <option value="">
                {productDisabled ? 'Select branch first' : 'All products'}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </>
      ) : null}

      {tab === 'bundles' ? (
        <>
          <ActionSelect
            id="admin-logs-bundles-action"
            label="Action Type"
            value={filters.action}
            options={ADMIN_LOG_BUNDLE_ACTIONS}
            onChange={(value) => onChange({ action: value, actions: [] })}
          />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="admin-logs-bundle">Bundle</Label>
            <NativeSelect
              id="admin-logs-bundle"
              value={filters.entityId || ''}
              disabled={productDisabled || bundlesLoading}
              onChange={(e) => onChange({ entityId: e.target.value })}
            >
              <option value="">
                {productDisabled ? 'Select branch first' : 'All bundles'}
              </option>
              {bundles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </>
      ) : null}

      {tab === 'variants' ? (
        <>
          <ActionSelect
            id="admin-logs-variants-action"
            label="Action Type"
            value={filters.action}
            options={ADMIN_LOG_VARIANT_ACTIONS}
            onChange={(value) => onChange({ action: value, actions: [] })}
          />
          <div className="space-y-1.5">
            <Label htmlFor="admin-logs-variant-type">Variant Type</Label>
            <NativeSelect
              id="admin-logs-variant-type"
              value={filters.variantTypeId || ''}
              disabled={!branchId || variantTypesLoading}
              onChange={(e) => onChange({ variantTypeId: e.target.value })}
            >
              <option value="">{branchId ? 'All variant types' : 'Select branch first'}</option>
              {variantTypes.map((vt) => (
                <option key={vt.id} value={vt.id}>
                  {vt.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </>
      ) : null}

      {tab === 'employees' ? (
        <ActionSelect
          id="admin-logs-employees-action"
          label="Action Type"
          value={filters.action}
          options={ADMIN_LOG_EMPLOYEE_ACTIONS}
          onChange={(value) => onChange({ action: value, actions: [] })}
        />
      ) : null}

      {tab === 'settings' ? (
        <ActionSelect
          id="admin-logs-settings-category"
          label="Setting Category"
          value={filters.settingCategory}
          options={ADMIN_LOG_SETTING_CATEGORIES}
          onChange={(value) =>
            onChange({ settingCategory: value, action: '', actions: [] })
          }
        />
      ) : null}

      {tab === 'hardware' ? (
        <ActionSelect
          id="admin-logs-hardware-action"
          label="Action Type"
          value={filters.action}
          options={ADMIN_LOG_HARDWARE_ACTIONS}
          onChange={(value) => onChange({ action: value, actions: [] })}
        />
      ) : null}

      {tab === 'orders_suppliers' ? (
        <>
          <ActionSelect
            id="admin-logs-orders-action"
            label="Action Type"
            value={filters.action}
            options={ADMIN_LOG_ORDER_SUPPLIER_ACTIONS}
            onChange={(value) => onChange({ action: value, actions: [] })}
          />
          <ActionSelect
            id="admin-logs-order-status"
            label="Order Status"
            value={filters.orderStatus}
            options={ADMIN_LOG_ORDER_STATUSES}
            onChange={(value) => onChange({ orderStatus: value })}
          />
          <div className="space-y-1.5">
            <Label htmlFor="admin-logs-supplier">Supplier</Label>
            <NativeSelect
              id="admin-logs-supplier"
              value={filters.supplierId || ''}
              disabled={productDisabled || suppliersLoading}
              onChange={(e) => onChange({ supplierId: e.target.value })}
            >
              <option value="">
                {productDisabled ? 'Select branch first' : 'All suppliers'}
              </option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-logs-order-q">Order</Label>
            <Input
              id="admin-logs-order-q"
              value={filters.q || ''}
              placeholder="Order ID / number"
              onChange={(e) => onChange({ q: e.target.value })}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

export default AdminLogsTabFilters
