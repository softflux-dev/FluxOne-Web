import { z } from 'zod'
import { empty, idParams, optionalString, optionalUuid } from '../shared.validator.js'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const listSalesSchema = z.object({
  body: empty,
  params: empty,
  query: z.object({
    q: optionalString,
    date: isoDate.optional(),
    categoryId: optionalUuid,
    subcategoryId: optionalUuid,
    productId: optionalUuid,
    variantId: optionalUuid,
  }),
})

export const refundSaleSchema = z.object({
  body: empty,
  query: empty,
  params: idParams,
})
