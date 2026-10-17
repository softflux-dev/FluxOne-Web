// Pricing formula labels for UI (not stored in DB).
// as per company code policy — one Final formula everywhere: selling − discount + tax.

export const FINAL_PRICE_FORMULA =
  'Final = Selling × (1 − Discount%) × (1 + Tax%)'

export const PROFIT_PCT_FORMULA =
  'Profit % is target margin on purchase; bulk sets Selling = Purchase × (1 + Profit%). It is not added again on Final.'

export const MARGIN_FORMULA =
  'Margin = Selling − Purchase (actual). Margin % = (Selling − Purchase) ÷ Purchase × 100'

export const TAX_PCT_FORMULA =
  'Tax % is applied on discounted selling for Final (not baked into Selling).'

export const SELLING_PRICE_FORMULA =
  'Selling is the shelf price before tax (set manually or via Admin bulk profit).'

export const PURCHASE_COST_FORMULA = 'Purchase is cost basis for Profit % and actual margin.'

export const ADMIN_PRICING_LEGEND = `${FINAL_PRICE_FORMULA}. ${PROFIT_PCT_FORMULA}`
