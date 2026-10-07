import { z } from 'zod'
import { empty } from '../../branch-manager/shared.validator.js'
import { looseUuidWithMessage } from '../../../utils/zodFields.util.js'

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .optional()

const looseUuid = looseUuidWithMessage('Invalid branch id')

// Accept UUID branch id, or "all" / empty for consolidated.
const branchIdQuery = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined || value === 'all') {
    return undefined
  }
  return value
}, looseUuid.optional())

export const adminDashboardQuerySchema = z.object({
  body: empty,
  params: empty,
  query: z.object({
    date: dateString,
    branchId: branchIdQuery,
    year: z.coerce.number().int().min(2000).max(2100).optional(),
  }),
})
