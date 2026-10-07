import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { invalidateProductCatalog } from '@/lib/productCatalogCache'

export const ADMIN_TAX_PROFIT_PAGE_SIZE = 8

const EMPTY_META = {
  branches: [],
  categories: [],
  products: [],
  scales: [],
  taxes: [],
  defaults: {
    defaultProfitPercent: 0,
    defaultTaxPercent: 0,
  },
}

// Live B2B Admin Tax & Profit (/api/admin/tax-profit).
export function useAdminTaxProfit({
  q = '',
  branchId = '',
  categoryId = '',
  subcategoryId = '',
  productId = '',
  variantId = '',
  sort = 'all',
  page = 1,
  limit = ADMIN_TAX_PROFIT_PAGE_SIZE,
} = {}) {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(EMPTY_META)
  const [pagination, setPagination] = useState({
    page: 1,
    limit,
    total: 0,
    pageCount: 1,
  })
  const [loading, setLoading] = useState(true)
  const [metaLoading, setMetaLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState(null)

  const loadMeta = useCallback(async () => {
    setMetaLoading(true)
    const result = await apiClient.get(endpoints.admin.taxProfit.meta)
    if (!result.success) {
      setMeta(EMPTY_META)
      setMetaLoading(false)
      return result
    }
    setMeta({
      branches: result.data?.branches || [],
      categories: result.data?.categories || [],
      products: result.data?.products || [],
      scales: result.data?.scales || [],
      taxes: result.data?.taxes || [],
      defaults: {
        defaultProfitPercent: Number(result.data?.defaults?.defaultProfitPercent) || 0,
        defaultTaxPercent: Number(result.data?.defaults?.defaultTaxPercent) || 0,
      },
    })
    setMetaLoading(false)
    return result
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await apiClient.get(endpoints.admin.taxProfit.products, {
      q: q?.trim() || undefined,
      branchId: branchId || undefined,
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      productId: productId || undefined,
      variantId: variantId || undefined,
      sort: sort && sort !== 'all' ? sort : undefined,
      page,
      limit,
    })
    if (!result.success) {
      setItems([])
      setPagination({ page: 1, limit, total: 0, pageCount: 1 })
      setError(result.error || 'Failed to load tax & profit catalog')
      setLoading(false)
      return result
    }
    setItems(result.data?.items || [])
    setPagination(
      result.data?.pagination || {
        page,
        limit,
        total: result.data?.items?.length || 0,
        pageCount: 1,
      },
    )
    setLoading(false)
    return result
  }, [q, branchId, categoryId, subcategoryId, productId, variantId, sort, page, limit])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    void load()
  }, [load])

  const updateDefaults = useCallback(
    async ({ defaultProfitPercent, defaultTaxPercent }) => {
      setMutating(true)
      const payload = {}
      if (defaultProfitPercent !== undefined) {
        payload.defaultProfitPercent = Number(defaultProfitPercent)
      }
      if (defaultTaxPercent !== undefined) {
        payload.defaultTaxPercent = Number(defaultTaxPercent)
      }
      const result = await apiClient.patch(endpoints.admin.taxProfit.defaults, payload)
      setMutating(false)
      if (result.success) {
        // IM Add Item catalog cache must pick up new defaults for pre-fill
        invalidateProductCatalog()
        await Promise.all([load(), loadMeta()])
      }
      return result
    },
    [load, loadMeta],
  )

  const bulkSetProfit = useCallback(
    async (productIds, profitPercent) => {
      setMutating(true)
      const result = await apiClient.patch(endpoints.admin.taxProfit.bulkProfit, {
        productIds,
        profitPercent: Number(profitPercent),
      })
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  const bulkSetTax = useCallback(
    async (productIds, taxPercent) => {
      setMutating(true)
      const result = await apiClient.patch(endpoints.admin.taxProfit.bulkTax, {
        productIds,
        taxPercent: Number(taxPercent),
      })
      setMutating(false)
      if (result.success) {
        await Promise.all([load(), loadMeta()])
      }
      return result
    },
    [load, loadMeta],
  )

  // Fetch rows for CSV/PDF export (same filters, higher limit)
  const fetchExportRows = useCallback(
    async ({ limit: exportLimit = 200 } = {}) => {
      const result = await apiClient.get(endpoints.admin.taxProfit.products, {
        q: q?.trim() || undefined,
        branchId: branchId || undefined,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        productId: productId || undefined,
        variantId: variantId || undefined,
        sort: sort && sort !== 'all' ? sort : undefined,
        page: 1,
        limit: exportLimit,
      })
      if (!result.success) return result
      return { success: true, data: result.data?.items || [] }
    },
    [q, branchId, categoryId, subcategoryId, productId, variantId, sort],
  )

  return {
    items,
    meta,
    pagination,
    loading,
    metaLoading,
    mutating,
    error,
    reload: load,
    reloadMeta: loadMeta,
    updateDefaults,
    bulkSetProfit,
    bulkSetTax,
    fetchExportRows,
  }
}
