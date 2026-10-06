import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

const DEFAULT_PAGE_SIZE = 50

// JSON body, or multipart FormData when a new branch/manager image File is selected.
export function buildAdminBranchPayload(fields) {
  const workingDays = Array.isArray(fields.workingDays)
    ? fields.workingDays.map((d) => String(d).trim().toLowerCase()).filter(Boolean)
    : []

  const base = {
    name: String(fields.name || '').trim(),
    location: String(fields.location || '').trim(),
    managerName: String(fields.managerName || '').trim(),
    managerEmail: String(fields.managerEmail || '').trim(),
    managerContact: String(fields.managerContact || '').trim(),
    managerOtherContact: fields.managerOtherContact?.trim() || undefined,
    managerGender: fields.managerGender || undefined,
    managerAddress: fields.managerAddress?.trim() || undefined,
    status: fields.status || undefined,
    openingTime: fields.openingTime != null ? String(fields.openingTime).trim() : '',
    closingTime: fields.closingTime != null ? String(fields.closingTime).trim() : '',
    workingDays,
  }

  const branchImage = fields.image instanceof File && fields.image.size > 0 ? fields.image : null
  const managerImage =
    fields.profileImage instanceof File && fields.profileImage.size > 0
      ? fields.profileImage
      : null

  if (branchImage || managerImage) {
    const form = new FormData()
    Object.entries(base).forEach(([key, value]) => {
      if (key === 'workingDays') return
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value))
      }
    })
    // Always send hour fields (empty clears) so multipart updates match JSON.
    form.set('openingTime', base.openingTime)
    form.set('closingTime', base.closingTime)
    // JSON string — server preprocess also accepts comma-separated
    form.set('workingDays', JSON.stringify(base.workingDays))
    if (branchImage) form.append('image', branchImage)
    if (managerImage) form.append('profile_image', managerImage)
    return form
  }

  return base
}

// Live B2B Admin branches (`/api/admin/branches`).
// Password is auto-generated on create / reset-password (email + stub log).
export function useAdminBranches({ q = '', status = 'all', page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, pageCount: 1 })
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = {
      q: q?.trim() || undefined,
      status: status && status !== 'all' ? status : undefined,
      page,
      limit,
    }
    const result = await apiClient.get(endpoints.admin.branches.list, params)
    if (!result.success) {
      setItems([])
      setPagination({ page: 1, limit, total: 0, pageCount: 1 })
      setError(result.error || 'Failed to load branches')
      setLoading(false)
      return
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
  }, [q, status, page, limit])

  useEffect(() => {
    void load()
  }, [load])

  const createBranch = useCallback(
    async (fields) => {
      setMutating(true)
      const result = await apiClient.post(
        endpoints.admin.branches.create,
        buildAdminBranchPayload(fields),
      )
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  const updateBranch = useCallback(
    async (id, fields) => {
      setMutating(true)
      const result = await apiClient.patch(
        endpoints.admin.branches.update(id),
        buildAdminBranchPayload(fields),
      )
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  const setBranchStatus = useCallback(
    async (id, nextStatus) => {
      setMutating(true)
      const result = await apiClient.patch(endpoints.admin.branches.status(id), {
        status: nextStatus,
      })
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  const resetManagerPassword = useCallback(
    async (id) => {
      setMutating(true)
      const result = await apiClient.post(endpoints.admin.branches.resetPassword(id), {})
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  const deleteBranch = useCallback(
    async (id) => {
      setMutating(true)
      const result = await apiClient.delete(endpoints.admin.branches.remove(id))
      setMutating(false)
      if (result.success) await load()
      return result
    },
    [load],
  )

  return {
    items,
    pagination,
    loading,
    mutating,
    error,
    reload: load,
    createBranch,
    updateBranch,
    setBranchStatus,
    resetManagerPassword,
    deleteBranch,
  }
}

export { DEFAULT_PAGE_SIZE as ADMIN_BRANCHES_PAGE_SIZE }
