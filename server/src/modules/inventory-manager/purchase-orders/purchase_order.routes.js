import { Router } from 'express'
import {
  approve,
  cancel,
  completeReceival,
  detail,
  generate,
  history,
  list,
  print,
  recordReceival,
  reject,
  sendSmsToSupplier,
  updatePending,
} from './purchase_order.controller.js'
import { asyncHandler } from '../../../middlewares/error.middleware.js'
import { requirePermission } from '../../../middlewares/role.middleware.js'
import { validate } from '../../../middlewares/validate.middleware.js'
import {
  generateOrderSchema,
  listOrdersSchema,
  orderIdParamsSchema,
  recordReceivalSchema,
  rejectOrderSchema,
  updatePendingOrderSchema,
} from './purchase_order.validator.js'

const router = Router()

router.get('/', requirePermission('orders:read'), validate(listOrdersSchema), asyncHandler(list))
router.post('/', requirePermission('orders:generate'), validate(generateOrderSchema), asyncHandler(generate))
router.get('/:id', requirePermission('orders:read'), validate(orderIdParamsSchema), asyncHandler(detail))
router.get('/:id/history', requirePermission('orders:read'), validate(orderIdParamsSchema), asyncHandler(history))
router.get('/:id/print', requirePermission('orders:read'), validate(orderIdParamsSchema), asyncHandler(print))

// BM only (orders:approve) — IM has no post-submit edit; Pending-only enforced in model
router.patch(
  '/:id',
  requirePermission('orders:approve'),
  validate(updatePendingOrderSchema),
  asyncHandler(updatePending),
)
router.post('/:id/approve', requirePermission('orders:approve'), validate(orderIdParamsSchema), asyncHandler(approve))
router.post('/:id/reject', requirePermission('orders:approve'), validate(rejectOrderSchema), asyncHandler(reject))

// IM may withdraw a Pending request; BM may also cancel via this path if needed
router.post('/:id/cancel', requirePermission('orders:generate'), validate(orderIdParamsSchema), asyncHandler(cancel))
router.post(
  '/:id/send-sms',
  requirePermission('orders:generate'),
  validate(orderIdParamsSchema),
  asyncHandler(sendSmsToSupplier),
)

// IM Stock Receival — multi-round then Mark Complete (TL §6.1)
router.post(
  '/:id/receivals',
  requirePermission('orders:generate'),
  validate(recordReceivalSchema),
  asyncHandler(recordReceival),
)
router.post(
  '/:id/complete',
  requirePermission('orders:generate'),
  validate(orderIdParamsSchema),
  asyncHandler(completeReceival),
)

export default router
