import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { cn } from '@/lib/utils'

const EVENT_LABELS = {
  created: 'Order request submitted',
  edited_by_bm: 'Edited by Branch Manager',
  approved: 'Approved',
  rejected: 'Rejected',
  receival_recorded: 'Receival recorded (stock in)',
  completed: 'Marked complete (received)',
}

function eventSummary(event) {
  const payload = event?.payload || {}
  const parts = []
  if (event.eventType === 'rejected' && payload.rejectionNotes) {
    parts.push(payload.rejectionNotes)
  }
  if (event.eventType === 'receival_recorded') {
    if (payload.lineCount != null) parts.push(`${payload.lineCount} line(s)`)
    if (payload.totalUnits != null) parts.push(`${payload.totalUnits} unit(s)`)
    if (payload.notes) parts.push(payload.notes)
  }
  if (event.eventType === 'edited_by_bm') {
    if (payload.action === 'cancelled') parts.push('Cancelled')
    else if (payload.companiesNumber != null || payload.itemsNumber != null) {
      parts.push(
        `${payload.companiesNumber ?? '—'} companies · ${payload.itemsNumber ?? '—'} items`,
      )
    }
  }
  if (event.eventType === 'created') {
    if (payload.companiesNumber != null || payload.itemsNumber != null) {
      parts.push(
        `${payload.companiesNumber ?? '—'} companies · ${payload.itemsNumber ?? '—'} items`,
      )
    }
  }
  if (event.eventType === 'completed') {
    parts.push('Order closed — no further receivals')
  }
  if (event.eventType === 'approved' && Array.isArray(payload.invoiceNumbers) && payload.invoiceNumbers.length) {
    parts.push(`Invoices: ${payload.invoiceNumbers.join(', ')}`)
  }
  return parts.filter(Boolean).join(' · ')
}

// Parent: TL §8 order timeline (append-only purchase_order_events)
export function OrderTimeline({ events = [], className }) {
  const list = Array.isArray(events) ? events : []

  if (!list.length) {
    return (
      <p className={cn('text-sm text-slate-500', className)}>
        No timeline events yet.
      </p>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Order timeline
      </h3>
      <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-slate-200">
        {list.map((event) => {
          const summary = eventSummary(event)
          return (
            <li key={event.id} className="relative ml-6">
              <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-white bg-purple-500 ring-1 ring-purple-200" />
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {EVENT_LABELS[event.eventType] || event.eventType}
                  </p>
                  <DateTimeLines value={event.createdAt} className="text-xs text-slate-500" />
                </div>
                {event.actorName ? (
                  <p className="mt-0.5 text-xs text-slate-500">by {event.actorName}</p>
                ) : null}
                {summary ? (
                  <p className="mt-1 text-xs text-slate-600">{summary}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default OrderTimeline
