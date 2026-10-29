// Orders Slice — Express /api/inventory/purchase-orders → RTK → usePurchaseOrders
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { mapPurchaseHistory, mapPurchaseOrder } from '@/lib/mapPurchaseOrder'
import { mapSupplier } from '@/lib/mapSupplier'
import { mapProduct } from '@/lib/mapProduct'
import { downloadPurchaseOrderPdf } from '@/lib/pdfDownload'
import {
  canDownloadPurchaseOrderInvoices,
  downloadPurchaseOrderInvoicePdf,
} from '@/lib/purchaseOrderInvoiceExport'

export const ORDERS_PAGE_SIZE = 8

function defaultFilters(overrides = {}) {
  return {
    q: '',
    supplierId: '',
    status: '',
    page: 1,
    limit: ORDERS_PAGE_SIZE,
    ...overrides,
  }
}

const initialState = {
  items: [],
  pagination: {
    page: 1,
    limit: ORDERS_PAGE_SIZE,
    total: 0,
    pageCount: 1,
  },
  filters: defaultFilters(),
  loading: false,
  mutating: false,
  error: null,
  selected: null,
  // Dedicated detail fetch state (page + popup share this — avoids double fire)
  detailLoading: false,
  detailLoadingId: null,
  detailError: null,
  history: null,
  supplierOptions: [],
  productOptions: [],
}

export const fetchOrders = createAsyncThunk(
  'orders/fetchList',
  async (filters, { rejectWithValue }) => {
    const next = filters || defaultFilters()
    const result = await apiClient.get(endpoints.orders.list, {
      page: next.page || 1,
      limit: next.limit || ORDERS_PAGE_SIZE,
      q: next.q || undefined,
      supplierId: next.supplierId || undefined,
      status: next.status || undefined,
    })
    if (!result.success) {
      return rejectWithValue(result.error || 'Failed to load orders')
    }
    const data = result.data || {}
    const rows = Array.isArray(data.items) ? data.items : []
    return {
      items: rows.map(mapPurchaseOrder),
      pagination:
        data.pagination || {
          page: next.page || 1,
          limit: next.limit || ORDERS_PAGE_SIZE,
          total: rows.length,
          pageCount: 1,
        },
    }
  },
)

export const loadOrderFormOptions = createAsyncThunk('orders/loadFormOptions', async () => {
  const [supRes, prodCollected] = await Promise.all([
    apiClient.get(endpoints.suppliers.list, { page: 1, limit: 50, active: 'active' }),
    (async () => {
      const all = []
      let page = 1
      let pageCount = 1
      do {
        const result = await apiClient.get(endpoints.products.list, {
          type: 'single',
          status: 'active',
          page,
          limit: 50,
        })
        if (!result.success) break
        const data = result.data || {}
        const rows = Array.isArray(data.items) ? data.items : []
        all.push(...rows.map(mapProduct))
        pageCount = data.pagination?.pageCount || 1
        page += 1
      } while (page <= pageCount)
      return all
    })(),
  ])

  const suppliers =
    supRes.success && Array.isArray(supRes.data?.items)
      ? supRes.data.items.map(mapSupplier)
      : []
  return { suppliers, products: prodCollected }
})

function resolveDetailArg(arg) {
  if (arg && typeof arg === 'object') {
    return { id: arg.id, force: Boolean(arg.force) }
  }
  return { id: arg, force: false }
}

export const fetchOrderDetail = createAsyncThunk(
  'orders/fetchDetail',
  async (arg, { rejectWithValue }) => {
    const { id } = resolveDetailArg(arg)
    const result = await apiClient.get(endpoints.orders.detail(id))
    if (!result.success) return rejectWithValue(result.error || 'Not found')
    return { success: true, data: mapPurchaseOrder(result.data) }
  },
  {
    // Skip duplicate GETs (Strict Mode remount / double click). Pass { id, force: true } to refresh.
    condition: (arg, { getState }) => {
      const { id, force } = resolveDetailArg(arg)
      if (!id) return false
      if (force) return true
      const { detailLoading, detailLoadingId, selected } = getState().orders
      if (detailLoading && detailLoadingId === id) return false
      if (selected?.id === id) return false
      return true
    },
  },
)

export const fetchOrderHistory = createAsyncThunk(
  'orders/fetchHistory',
  async (id, { rejectWithValue }) => {
    const result = await apiClient.get(endpoints.orders.history(id))
    if (!result.success) return rejectWithValue(result.error || 'History failed')
    return { success: true, data: mapPurchaseHistory(result.data) }
  },
)

export const generateOrder = createAsyncThunk(
  'orders/generate',
  async (payload, { getState, dispatch, rejectWithValue }) => {
    // Supports legacy { supplierId, lines } and multi-company { companies }
    const body = payload.companies?.length
      ? {
          companies: payload.companies,
          explanation: payload.explanation || undefined,
          sendSms: Boolean(payload.sendSms),
        }
      : {
          supplierId: payload.supplierId,
          explanation: payload.explanation || undefined,
          sendSms: Boolean(payload.sendSms),
          lines: payload.lines,
        }
    const result = await apiClient.post(endpoints.orders.create, body)
    if (!result.success) return rejectWithValue(result.error || 'Generate failed')
    const filters = { ...getState().orders.filters, page: 1 }
    dispatch(setOrderFilters(filters))
    void dispatch(fetchOrders(filters))
    return { success: true, data: mapPurchaseOrder(result.data) }
  },
)

export const updatePendingOrder = createAsyncThunk(
  'orders/updatePending',
  async ({ id, ...payload }, { getState, dispatch, rejectWithValue }) => {
    const result = await apiClient.patch(endpoints.orders.update(id), payload)
    if (!result.success) return rejectWithValue(result.error || 'Update failed')
    void dispatch(fetchOrders(getState().orders.filters))
    return { success: true, data: mapPurchaseOrder(result.data) }
  },
)

export const approveOrder = createAsyncThunk(
  'orders/approve',
  async (id, { getState, dispatch, rejectWithValue }) => {
    const result = await apiClient.post(endpoints.orders.approve(id), {})
    if (!result.success) return rejectWithValue(result.error || 'Approve failed')
    void dispatch(fetchOrders(getState().orders.filters))
    return { success: true, data: mapPurchaseOrder(result.data) }
  },
)

export const rejectOrder = createAsyncThunk(
  'orders/reject',
  async ({ id, rejectionNotes }, { getState, dispatch, rejectWithValue }) => {
    const result = await apiClient.post(endpoints.orders.reject(id), {
      rejectionNotes: rejectionNotes || undefined,
    })
    if (!result.success) return rejectWithValue(result.error || 'Reject failed')
    void dispatch(fetchOrders(getState().orders.filters))
    return { success: true, data: mapPurchaseOrder(result.data) }
  },
)

export const recordOrderReceival = createAsyncThunk(
  'orders/recordReceival',
  async ({ id, lines, notes }, { getState, dispatch, rejectWithValue }) => {
    const result = await apiClient.post(endpoints.orders.receivals(id), {
      lines,
      notes: notes || undefined,
    })
    if (!result.success) {
      // Backend is source of truth — pull fresh remaining after validation failure
      void dispatch(fetchOrderDetail({ id, force: true }))
      return rejectWithValue(result.error || 'Receival failed')
    }
    void dispatch(fetchOrders(getState().orders.filters))
    const order = result.data?.order
      ? mapPurchaseOrder(result.data.order)
      : mapPurchaseOrder(result.data)
    return { success: true, data: order, receival: result.data }
  },
)

export const completeOrderReceival = createAsyncThunk(
  'orders/completeReceival',
  async (id, { getState, dispatch, rejectWithValue }) => {
    const result = await apiClient.post(endpoints.orders.complete(id), {})
    if (!result.success) return rejectWithValue(result.error || 'Mark complete failed')
    void dispatch(fetchOrders(getState().orders.filters))
    return { success: true, data: mapPurchaseOrder(result.data) }
  },
)

// Table printer: formal per-supplier invoices when available; else legacy PO dump
export const printOrder = createAsyncThunk(
  'orders/print',
  async (idOrOrder, { rejectWithValue }) => {
    try {
      let order = idOrOrder && typeof idOrOrder === 'object' ? idOrOrder : null
      const id = order?.id || idOrOrder
      if (!order?.lines?.length && id) {
        const result = await apiClient.get(endpoints.orders.detail(id))
        if (!result.success) {
          return rejectWithValue(result.error || 'Failed to load order for PDF')
        }
        order = mapPurchaseOrder(result.data)
      }
      if (!order) return rejectWithValue('Order not found')

      if (canDownloadPurchaseOrderInvoices(order.status) && id) {
        const listRes = await apiClient.get(endpoints.orders.invoices(id))
        if (listRes.success) {
          const invoices = Array.isArray(listRes.data?.items) ? listRes.data.items : []
          if (invoices.length) {
            const filenames = []
            for (const row of invoices) {
              const detailRes = await apiClient.get(endpoints.orders.invoiceDetail(id, row.id))
              if (!detailRes.success) {
                return rejectWithValue(detailRes.error || 'Failed to load invoice for PDF')
              }
              const { filename } = await downloadPurchaseOrderInvoicePdf(detailRes.data)
              filenames.push(filename)
            }
            return {
              success: true,
              data: { downloaded: true, mode: 'invoices', count: filenames.length, filenames },
            }
          }
        }
      }

      downloadPurchaseOrderPdf(order)
      return { success: true, data: { downloaded: true, mode: 'legacy' } }
    } catch (err) {
      return rejectWithValue(err?.message || 'PDF download failed')
    }
  },
)

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrderFilters(state, action) {
      state.filters = action.payload
    },
    patchOrderFilters(state, action) {
      const patch = action.payload || {}
      const next = { ...state.filters, ...patch }
      const resets =
        patch.q !== undefined ||
        patch.supplierId !== undefined ||
        patch.status !== undefined ||
        patch.limit !== undefined
      if (resets && patch.page === undefined) next.page = 1
      state.filters = next
    },
    clearOrderDetail(state) {
      state.selected = null
      state.history = null
      state.detailLoading = false
      state.detailLoadingId = null
      state.detailError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items
        state.pagination = action.payload.pagination
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false
        state.items = []
        state.error = action.payload || action.error.message
      })
      .addCase(loadOrderFormOptions.fulfilled, (state, action) => {
        state.supplierOptions = action.payload.suppliers
        state.productOptions = action.payload.products
      })
      .addCase(fetchOrderDetail.pending, (state, action) => {
        const { id } = resolveDetailArg(action.meta.arg)
        state.detailLoading = true
        state.detailLoadingId = id
        state.detailError = null
      })
      .addCase(fetchOrderDetail.fulfilled, (state, action) => {
        state.detailLoading = false
        state.detailLoadingId = null
        state.detailError = null
        state.selected = action.payload.data
      })
      .addCase(fetchOrderDetail.rejected, (state, action) => {
        // Skipped by condition — do not clear loading/error from a real in-flight request
        if (action.error?.name === 'ConditionError') return
        state.detailLoading = false
        state.detailLoadingId = null
        state.detailError = action.payload || action.error?.message || 'Failed to load order'
      })
      .addCase(fetchOrderHistory.fulfilled, (state, action) => {
        state.history = action.payload.data
      })
      .addCase(generateOrder.pending, (state) => {
        state.mutating = true
      })
      .addCase(generateOrder.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(generateOrder.rejected, (state) => {
        state.mutating = false
      })
      .addCase(updatePendingOrder.pending, (state) => {
        state.mutating = true
      })
      .addCase(updatePendingOrder.fulfilled, (state, action) => {
        state.mutating = false
        state.selected = action.payload.data
      })
      .addCase(updatePendingOrder.rejected, (state) => {
        state.mutating = false
      })
      .addCase(approveOrder.pending, (state) => {
        state.mutating = true
      })
      .addCase(approveOrder.fulfilled, (state, action) => {
        state.mutating = false
        state.selected = action.payload.data
      })
      .addCase(approveOrder.rejected, (state) => {
        state.mutating = false
      })
      .addCase(rejectOrder.pending, (state) => {
        state.mutating = true
      })
      .addCase(rejectOrder.fulfilled, (state, action) => {
        state.mutating = false
        state.selected = action.payload.data
      })
      .addCase(rejectOrder.rejected, (state) => {
        state.mutating = false
      })
      .addCase(recordOrderReceival.pending, (state) => {
        state.mutating = true
      })
      .addCase(recordOrderReceival.fulfilled, (state, action) => {
        state.mutating = false
        state.selected = action.payload.data
        // Keep list row in sync (status / remaining) even if user left mid-request
        const next = action.payload.data
        if (next?.id) {
          state.items = state.items.map((row) => (row.id === next.id ? { ...row, ...next } : row))
        }
      })
      .addCase(recordOrderReceival.rejected, (state) => {
        state.mutating = false
      })
      .addCase(completeOrderReceival.pending, (state) => {
        state.mutating = true
      })
      .addCase(completeOrderReceival.fulfilled, (state, action) => {
        state.mutating = false
        state.selected = action.payload.data
        // Immediate list patch so UI shows Received before refetch settles
        const next = action.payload.data
        if (next?.id) {
          state.items = state.items.map((row) => (row.id === next.id ? { ...row, ...next } : row))
        }
      })
      .addCase(completeOrderReceival.rejected, (state) => {
        state.mutating = false
      })
  },
})

export const { setOrderFilters, patchOrderFilters, clearOrderDetail } = ordersSlice.actions
export default ordersSlice.reducer
