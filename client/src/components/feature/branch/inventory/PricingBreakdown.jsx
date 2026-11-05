import { ArrowRight } from 'lucide-react'
import { formatMoney } from '@/lib/products/pricingBreakdown'

function Step({ label, value, hint, highlight }) {
  return (
    <div
      className={`min-w-[7.5rem] flex-1 rounded-xl border px-3 py-2 ${
        highlight ? 'border-violet-300 bg-violet-50' : 'border-border bg-white'
      }`}
    >
      <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="font-mono text-sm font-bold text-slate-900">{formatMoney(value)}</p>
      {hint ? <p className="text-[10px] text-slate-400">{hint}</p> : null}
    </div>
  )
}

const Arrow = () => <ArrowRight className="size-4 shrink-0 text-slate-300 max-sm:rotate-90" />

export function PricingBreakdown({ pricing }) {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Step label="Purchase Price" value={pricing.purchase} />
      <Arrow />
    <Step
        label="Selling Price"
        value={pricing.selling}
        hint={pricing.profitPct > 0 ? `+${pricing.profitPct}% profit` : 'No profit markup'}
        />
      <Arrow />
      <Step
        label="Discounted Price"
        value={pricing.discounted}
        hint={pricing.discountPct > 0 ? `-${pricing.discountPct}% discount` : 'No discount'}
        /> 
      <Arrow />
      <Step label="Tax Amount" value={pricing.taxAmount} hint={`${pricing.taxPct}% tax`} />
      <Arrow />
      <Step label="Final Price" value={pricing.final} hint="Incl. tax" highlight />
    </div>
  )
}

export default PricingBreakdown