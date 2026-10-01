import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

export const ADMIN_DEVICES_PAGE_SIZE = 8

// Live B2B Admin System Access — assigned BM hardware (/api/admin/settings/devices).
export function useAdminDevices({
  q = '',
  status = 'all',
  branchId = 'all',
  type = 'all',
  page = 1,
  limit = ADMIN_DEVICES_PAGE_SIZE,
} = {}) {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, blocked: 0 })
  const [pagination, setPagination] = useState({
    page: 1,
    limit,
    total: 0,
    pageCount: 1,
  })
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await apiClient.get(endpoints.admin.settings.devices, {
      q: q?.trim() || undefined,
      status: status && status !== 'all' ? status : undefined,
      branchId: branchId && branchId !== 'all' ? branchId : undefined,
      type: type && type !== 'all' ? type : undefined,
      page,
      limit,
    })
    if (!result.success) {
      setItems([])
      setStats({ total: 0, active: 0, blocked: 0 })
      setPagination({ page: 1, limit, total: 0, pageCount: 1 })
      setError(result.error || 'Failed to load devices')
      setLoading(false)
      return result
    }
    setItems(result.data?.items || [])
    setStats({
      total: result.data?.stats?.total || 0,
      active: result.data?.stats?.active || 0,
      blocked: result.data?.stats?.blocked || 0,
    })
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
  }, [q, status, branchId, type, page, limit])

  useEffect(() => {
    void load()
  }, [load])

  const setDeviceStatus = useCallback(
    async (id, nextStatus) => {
      setMutating(true)
      const result = await apiClient.patch(endpoints.admin.settings.deviceStatus(id), {
        status: nextStatus,
      })
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  return {
    items,
    stats,
    pagination,
    loading,
    mutating,
    error,
    reload: load,
    setDeviceStatus,
  }
}

export async function changeAdminPassword({ currentPassword, newPassword }) {
  return apiClient.post(endpoints.auth.changePassword, {
    currentPassword,
    newPassword,
  })
}

// Admin Settings → Currency (tenant default display currency)
export function useAdminCurrency() {
  const [defaultCurrency, setDefaultCurrency] = useState('PKR')
  const [currencyLocked, setCurrencyLocked] = useState(false)
  const [options, setOptions] = useState([])
  const [ratesToPkr, setRatesToPkr] = useState({ PKR: 1 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await apiClient.get(endpoints.admin.settings.currency)
    if (!result.success) {
      setError(result.error || 'Failed to load currency settings')
      setLoading(false)
      return result
    }
    setDefaultCurrency(result.data?.defaultCurrency || 'PKR')
    setCurrencyLocked(Boolean(result.data?.currencyLocked))
    setOptions(result.data?.options || [])
    setRatesToPkr(result.data?.ratesToPkr || { PKR: 1 })
    setLoading(false)
    return result
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const saveCurrency = useCallback(async (nextCurrency, rateToPkr) => {
    setSaving(true)
    const body = { defaultCurrency: nextCurrency }
    if (nextCurrency !== 'PKR' && rateToPkr != null && rateToPkr !== '') {
      body.rateToPkr = Number(rateToPkr)
    }
    const result = await apiClient.patch(endpoints.admin.settings.currency, body)
    setSaving(false)
    if (result.success) {
      setDefaultCurrency(result.data?.defaultCurrency || nextCurrency)
      setCurrencyLocked(Boolean(result.data?.currencyLocked ?? true))
      if (result.data?.options?.length) setOptions(result.data.options)
      if (result.data?.ratesToPkr) setRatesToPkr(result.data.ratesToPkr)
    }
    return result
  }, [])

  return {
    defaultCurrency,
    currencyLocked,
    options,
    ratesToPkr,
    loading,
    saving,
    error,
    reload: load,
    saveCurrency,
  }
}
