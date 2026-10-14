import { useEffect, useMemo, useState } from 'react'
import { FormDialog, DialogCancelButton } from '@/components/shared/FormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { referenceFromUuid, displayStaffRef } from '@/lib/formatDisplayId'
import { formatDateLine } from '@/lib/formatDateTime'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { cn } from '@/lib/utils'

// TC-BM-leave-002 — Admin decides Pending leave; Pending is system status only (not selectable)
const DECISION_OPTIONS = [
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

// Empty = no decision yet (Confirm stays disabled until Approved / Rejected)
const UNSET_DECISION = ''

function displayLeaveRef(row = {}) {
  return row.id ? referenceFromUuid(row.id, 'LV') : '—'
}

function displayLeaveStaffRef(row = {}) {
  return displayStaffRef({ id: row.requestedBy || row.staffId })
}

function formatRange(start, end) {
  return `${formatDateLine(start)} - ${formatDateLine(end)}`
}

function resolveDayCount(row = {}) {
  if (row.dayCount != null) return Number(row.dayCount) || 0
  if (!row.startDate || !row.endDate) return 0
  const a = new Date(row.startDate)
  const b = new Date(row.endDate)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  return Math.round((b - a) / 86400000) + 1
}

function dayLabel(count) {
  const n = Number(count) || 0
  return `${n} ${n === 1 ? 'Day' : 'Days'}`
}

function statusBadgeClass(status) {
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="w-28 shrink-0 text-xs text-slate-500 sm:pt-0.5">{label}</span>
      <div className="min-w-0 flex-1 text-sm text-slate-800">{children}</div>
    </div>
  )
}

// use reusable FormDialog — dirty / discard / no outside close
// mode="admin" → decide pending leaves · mode="self" → BM read-only details
export function LeaveDetailDialog({
  open,
  onOpenChange,
  row,
  mode = 'admin',
  // presetDecision: 'approved' | 'rejected' | null — from table Approve / Reject icons
  presetDecision = null,
  submitting = false,
  onConfirm,
}) {
  const isSelf = mode === 'self'
  const isPending = !isSelf && row?.status === 'pending'
  const [decisionStatus, setDecisionStatus] = useState(UNSET_DECISION)
  const [decisionReason, setDecisionReason] = useState('')
  const { captureBaseline, isDirty } = useFormBaseline(open)

  useEffect(() => {
    if (!open || !row) return
    // Only pre-fill when table icon passed Approved / Rejected
    const nextStatus =
      isPending && (presetDecision === 'approved' || presetDecision === 'rejected')
        ? presetDecision
        : UNSET_DECISION
    setDecisionStatus(nextStatus)
    setDecisionReason('')
    // Baseline = unset decision so choosing Approved/Rejected counts as dirty
    captureBaseline({ status: UNSET_DECISION, reason: '' })
  }, [open, row, presetDecision, isPending, captureBaseline])

  const formSnapshot = useMemo(
    () => ({ status: decisionStatus, reason: decisionReason }),
    [decisionStatus, decisionReason],
  )
  const dirty = isPending ? isDirty(formSnapshot) : false

  const hasDecision = decisionStatus === 'approved' || decisionStatus === 'rejected'
  const showReasonBox = isPending && hasDecision
  const reasonRequired = decisionStatus === 'rejected'

  // Confirm disabled until Admin picks Approved or Rejected (+ rejection reason if needed)
  const confirmDisabled =
    submitting ||
    !hasDecision ||
    (decisionStatus === 'rejected' && !decisionReason.trim())

  const handleConfirm = () => {
    if (!isPending || !hasDecision) return
    onConfirm?.({
      status: decisionStatus,
      decisionReason: decisionReason.trim(),
    })
  }

  const days = resolveDayCount(row || {})

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty}
      title={`Leave Details — ${displayLeaveRef(row || {})}`}
      description={
        isSelf ? 'Review your leave request and Admin decision comments.' : undefined
      }
      footer={
        isPending ? (
          <>
            <DialogCancelButton>Cancel</DialogCancelButton>
            <Button
              type="button"
              variant="brand"
              disabled={confirmDisabled}
              onClick={handleConfirm}
              title={
                !hasDecision
                  ? 'Select Approved or Rejected before confirming'
                  : reasonRequired && !decisionReason.trim()
                    ? 'Enter a rejection reason before confirming'
                    : undefined
              }
              className={
                decisionStatus === 'rejected'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : undefined
              }
            >
              {submitting ? 'Saving…' : 'Confirm'}
            </Button>
          </>
        ) : (
          <Button type="button" variant="brand" onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
        )
      }
    >
      {row ? (
        <div className="space-y-4 py-1">
          <div className="space-y-3 rounded-xl border border-border bg-slate-50/60 p-3 sm:p-4">
            {isSelf ? (
              <>
                <DetailRow label="Reason">{row.reason || '—'}</DetailRow>
                <DetailRow label="Dates">
                  {formatRange(row.startDate, row.endDate)}
                  {days > 0 ? ` (${dayLabel(days)})` : ''}
                </DetailRow>
                <DetailRow label="Applied">
                  <DateTimeLines value={row.createdAt} />
                </DetailRow>
                <DetailRow label="Status">
                  <Badge className={cn('border capitalize', statusBadgeClass(row.status))}>
                    {row.status}
                  </Badge>
                </DetailRow>
                {row.decidedAt ? (
                  <DetailRow label="Decided">
                    <DateTimeLines value={row.decidedAt} />
                  </DetailRow>
                ) : null}
                <DetailRow label="Admin note">{row.decisionReason || '—'}</DetailRow>
              </>
            ) : (
              <>
                <DetailRow label="Employee">
                  <strong>{row.managerName || 'Branch Manager'}</strong>
                  <span className="text-slate-500"> ({displayLeaveStaffRef(row)})</span>
                </DetailRow>
                <DetailRow label="Branch">
                  {row.branchName || '—'}
                  {row.branchLocation ? ` / ${row.branchLocation}` : ''}
                </DetailRow>
                <DetailRow label="Dates">
                  {formatRange(row.startDate, row.endDate)} ({dayLabel(days)})
                </DetailRow>
                <DetailRow label="Applied">
                  <DateTimeLines value={row.createdAt} />
                </DetailRow>
                <DetailRow label="Reason">{row.reason || '—'}</DetailRow>

                <DetailRow label="Status">
                  {isPending ? (
                    // Only Approved / Rejected — Pending stays the existing record status
                    <NativeSelect
                      value={decisionStatus}
                      onChange={(e) => setDecisionStatus(e.target.value)}
                      className="max-w-xs"
                      aria-label="Leave decision status"
                    >
                      <option value={UNSET_DECISION} disabled>
                        Select decision…
                      </option>
                      {DECISION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Badge className={cn('border capitalize', statusBadgeClass(row.status))}>
                      {row.status}
                    </Badge>
                  )}
                </DetailRow>

                {!isPending && row.decisionReason ? (
                  <DetailRow label="Admin note">{row.decisionReason}</DetailRow>
                ) : null}
              </>
            )}
          </div>

          {/* Approved → optional note · Rejected → required rejection reason */}
          {showReasonBox ? (
            <div className="space-y-2">
              <Label htmlFor="leave-decision-reason">
                {reasonRequired ? 'Rejection reason *' : 'Note (optional)'}
              </Label>
              <Textarea
                id="leave-decision-reason"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={
                  reasonRequired
                    ? 'Explain why this leave is rejected'
                    : 'Optional note for the branch manager'
                }
                className="min-h-24"
              />
              {reasonRequired ? (
                <p className="text-[11px] text-slate-500">
                  A rejection reason is required before you can confirm.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </FormDialog>
  )
}

export default LeaveDetailDialog
