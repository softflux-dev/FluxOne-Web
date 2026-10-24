import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import {
  ADMIN_LOGS_EXPORT_MAX_ROWS,
  ADMIN_LOGS_PAGE_SIZE,
  localDateInputValue,
} from '@/lib/adminLogs'
import { ADMIN_LOG_TAB_FILTER_KEYS } from '@/lib/adminLogsFilterConfig'

function todayRange() {
  const today = localDateInputValue()
  return { from: today, to: today }
}

const EMPTY_FILTERS = {
  page: 1,
  limit: ADMIN_LOGS_PAGE_SIZE,
  tab: 'all',
  from: '',
  to: '',
  branchId: '',
  actorRole: '',
  actorUserId: '',
  categories: [],
  action: '',
  actions: [],
  entityId: '',
  productType: '',
  variantTypeId: '',
  supplierId: '',
  orderStatus: '',
  settingCategory: '',
  q: '',
}

function normalizeFilters(patch = {}) {
  const today = todayRange()
  return {
    ...EMPTY_FILTERS,
    from: today.from,
    to: today.to,
    ...patch,
    page: Math.max(1, Number(patch.page) || 1),
    limit: Math.min(200, Math.max(1, Number(patch.limit) || ADMIN_LOGS_PAGE_SIZE)),
    categories: Array.isArray(patch.categories) ? patch.categories : EMPTY_FILTERS.categories,
    actions: Array.isArray(patch.actions) ? patch.actions : EMPTY_FILTERS.actions,
  }
}

function toApiParams(filters, extra = {}) {
  const params = {
    page: filters.page,
    limit: filters.limit,
    ...extra,
  }
  if (filters.from) params.from = new Date(`${filters.from}T00:00:00`).toISOString()
  if (filters.to) params.to = new Date(`${filters.to}T23:59:59.999`).toISOString()
  if (filters.branchId) params.branchId = filters.branchId
  if (filters.actorRole) params.actorRole = filters.actorRole
  if (filters.actorUserId) params.actorUserId = filters.actorUserId
  if (filters.action) params.action = filters.action
  if (filters.actions?.length) params.actions = filters.actions.join(',')
  if (filters.entityId) params.entityId = filters.entityId
  if (filters.productType) params.productType = filters.productType
  if (filters.variantTypeId) params.variantTypeId = filters.variantTypeId
  if (filters.supplierId) params.supplierId = filters.supplierId
  if (filters.orderStatus) params.orderStatus = filters.orderStatus
  if (filters.settingCategory) params.settingCategory = filters.settingCategory
  if (filters.q?.trim()) params.q = filters.q.trim()

  if (filters.tab && filters.tab !== 'all') {
    params.category = filters.tab
  } else if (Array.isArray(filters.categories) && filters.categories.length > 0) {
    params.categories = filters.categories.join(',')
  }

  return params
}

export function useAdminLogs(initialFilters = {}) {
  const [filters, setFilters] = useState(() => normalizeFilters(initialFilters))
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ADMIN_LOGS_PAGE_SIZE,
    total: 0,
    pageCount: 1,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchSeq = useRef(0)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchLogs = useCallback(async (nextFilters = filtersRef.current, extraParams = {}) => {
    const seq = ++fetchSeq.current
    setLoading(true)
    setError(null)
    const res = await apiClient.get(
      endpoints.admin.logs.list,
      toApiParams(nextFilters, extraParams),
    )
    if (seq !== fetchSeq.current) return null

    setLoading(false)
    if (!res.success) {
      setItems([])
      setError(res.error || 'Failed to load logs')
      setPagination({
        page: nextFilters.page,
        limit: nextFilters.limit,
        total: 0,
        pageCount: 1,
      })
      return null
    }

    const data = res.data || {}
    const rows = data.items || []
    const meta = data.pagination || {
      page: nextFilters.page,
      limit: nextFilters.limit,
      total: rows.length,
      pageCount: 1,
    }
    setItems(rows)
    setPagination(meta)
    return { items: rows, pagination: meta }
  }, [])

  useEffect(() => {
    void fetchLogs(filters)
  }, [filters, fetchLogs])

  const updateFilters = useCallback((patch) => {
    setFilters((prev) => {
      const next = normalizeFilters({ ...prev, ...patch })
      const pageResetKeys = [
        'from',
        'to',
        'branchId',
        'actorRole',
        'actorUserId',
        'tab',
        'categories',
        'action',
        'actions',
        'entityId',
        'productType',
        'variantTypeId',
        'supplierId',
        'orderStatus',
        'settingCategory',
        'q',
        'limit',
      ]
      const shouldResetPage = pageResetKeys.some(
        (key) => patch[key] !== undefined && patch[key] !== prev[key],
      )
      if (shouldResetPage && patch.page === undefined) next.page = 1
      return next
    })
  }, [])

  const clearFilters = useCallback(() => {
    const today = todayRange()
    setFilters((prev) => {
      const tabOnly = { tab: prev.tab, limit: prev.limit }
      const cleared = normalizeFilters({
        ...tabOnly,
        from: today.from,
        to: today.to,
        page: 1,
      })
      for (const key of ADMIN_LOG_TAB_FILTER_KEYS) cleared[key] = EMPTY_FILTERS[key]
      if (prev.tab === 'all') cleared.categories = []
      return cleared
    })
  }, [])

  /** Fetch all rows matching current filters (paginated API) for export / select-all. */
  const fetchAllMatching = useCallback(async (options = {}) => {
    const base = { ...filtersRef.current, page: 1, limit: 200 }
    const excludeIds = options.excludeIds instanceof Set ? options.excludeIds : new Set()
    const includeIds = options.includeIds instanceof Set ? options.includeIds : null

    if (includeIds?.size) {
      if (includeIds.size > ADMIN_LOGS_EXPORT_MAX_ROWS) {
        throw new Error(
          `Export limited to ${ADMIN_LOGS_EXPORT_MAX_ROWS} rows. Narrow filters or deselect rows.`,
        )
      }
      const ids = [...includeIds]
      const chunks = []
      for (let i = 0; i < ids.length; i += 200) {
        chunks.push(ids.slice(i, i + 200))
      }
      const collected = []
      for (const chunk of chunks) {
        const res = await apiClient.get(
          endpoints.admin.logs.list,
          toApiParams(base, { ids: chunk.join(',') }),
        )
        if (!res.success) throw new Error(res.error || 'Failed to load logs for export')
        collected.push(...(res.data?.items || []))
      }
      return collected
    }

    const first = await apiClient.get(endpoints.admin.logs.list, toApiParams(base))
    if (!first.success) throw new Error(first.error || 'Failed to load logs for export')
    const meta = first.data?.pagination || {}
    const total = Number(meta.total) || 0
    if (total - excludeIds.size > ADMIN_LOGS_EXPORT_MAX_ROWS) {
      throw new Error(
        `Export limited to ${ADMIN_LOGS_EXPORT_MAX_ROWS} rows (${total} match). Narrow the date range or filters.`,
      )
    }
    let all = [...(first.data?.items || [])]
    const pageCount = meta.pageCount || 1
    for (let page = 2; page <= pageCount; page += 1) {
      const res = await apiClient.get(
        endpoints.admin.logs.list,
        toApiParams({ ...base, page }),
      )
      if (!res.success) throw new Error(res.error || 'Failed to load logs for export')
      all = all.concat(res.data?.items || [])
      if (all.length >= ADMIN_LOGS_EXPORT_MAX_ROWS) break
    }
    if (excludeIds.size) {
      all = all.filter((row) => !excludeIds.has(row.id))
    }
    return all.slice(0, ADMIN_LOGS_EXPORT_MAX_ROWS)
  }, [])

  return {
    items,
    pagination,
    filters,
    loading,
    error,
    updateFilters,
    clearFilters,
    setPage: (page) => updateFilters({ page }),
    setTab: (tab) => {
      setFilters((prev) => {
        const next = normalizeFilters({ ...prev, tab, page: 1, categories: [] })
        for (const key of ADMIN_LOG_TAB_FILTER_KEYS) next[key] = EMPTY_FILTERS[key]
        return next
      })
    },
    reload: () => fetchLogs(filtersRef.current),
    fetchAllMatching,
  }
}
