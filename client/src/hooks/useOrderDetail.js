import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import { asResult } from '@/rtk/asResult'
import {
  clearOrderDetail,
  fetchOrderDetail,
  recordOrderReceival,
  completeOrderReceival,
  printOrder as printOrderThunk,
} from '@/rtk/features/orders/ordersSlice'

/**
 * Detail-only order loader shared by IM full page + BM popup.
 * Does NOT fetch the orders list (unlike usePurchaseOrders).
 */
export function useOrderDetail(orderId, { autoFetch = true } = {}) {
  const dispatch = useAppDispatch()
  const selected = useAppSelector((state) => state.orders.selected)
  const detailLoading = useAppSelector((state) => state.orders.detailLoading)
  const detailLoadingId = useAppSelector((state) => state.orders.detailLoadingId)
  const detailError = useAppSelector((state) => state.orders.detailError)
  const mutating = useAppSelector((state) => state.orders.mutating)

  // TC-RECEVAL STOCK-92A — always force-refresh on open so remaining qty matches backend
  // (cached selected after a mid-flight leave caused "exceeds remaining (0)" while UI showed 1)
  useEffect(() => {
    if (!autoFetch || !orderId) return undefined
    void dispatch(fetchOrderDetail({ id: orderId, force: true }))
    return undefined
  }, [orderId, autoFetch, dispatch])

  const order = selected?.id === orderId ? selected : null
  const loading =
    Boolean(orderId) &&
    ((!order && detailLoading) || (detailLoading && detailLoadingId === orderId))

  const refetch = useCallback(
    (id = orderId) => {
      if (!id) return Promise.resolve({ success: false, error: 'Missing order id' })
      // force: bypass cache so receival / complete always reloads fresh detail
      return asResult(dispatch(fetchOrderDetail({ id, force: true })).unwrap())
    },
    [dispatch, orderId],
  )

  const clear = useCallback(() => {
    dispatch(clearOrderDetail())
  }, [dispatch])

  const recordReceival = useCallback(
    (id, payload) =>
      asResult(dispatch(recordOrderReceival({ id, ...payload })).unwrap()),
    [dispatch],
  )

  const completeReceival = useCallback(
    (id) => asResult(dispatch(completeOrderReceival(id)).unwrap()),
    [dispatch],
  )

  const printOrder = useCallback(
    (idOrOrder) => asResult(dispatch(printOrderThunk(idOrOrder)).unwrap()),
    [dispatch],
  )

  return {
    order,
    loading,
    error: orderId ? detailError : null,
    mutating,
    refetch,
    clear,
    recordReceival,
    completeReceival,
    printOrder,
  }
}

export default useOrderDetail
