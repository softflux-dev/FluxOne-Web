import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

// Live B2B Admin dashboard (`GET /api/admin/dashboard`).
// Refetches when From/To range or `branchId` changes.
export function useAdminDashboard({ from, to, branchId = 'all' } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = {
      from: from || undefined,
      to: to || undefined,
      branchId: !branchId || branchId === 'all' ? undefined : branchId,
    }
    const result = await apiClient.get(endpoints.admin.dashboard, params)
    if (!result.success) {
      setData(null)
      setError(result.error || 'Failed to load admin dashboard')
      setLoading(false)
      return
    }
    setData(result.data)
    setLoading(false)
  }, [from, to, branchId])

  useEffect(() => {
    void load()
  }, [load])

  return {
    data,
    loading,
    error,
    reload: load,
    branches: data?.branches || [{ id: 'all', name: 'All Branches (Consolidated)' }],
    kpis: data?.kpis || null,
    branchProfitOverview: data?.branchProfitOverview || null,
    branchInventoryStatus: data?.branchInventoryStatus || null,
    aiBusinessInsights: data?.aiBusinessInsights || null,
  }
}
