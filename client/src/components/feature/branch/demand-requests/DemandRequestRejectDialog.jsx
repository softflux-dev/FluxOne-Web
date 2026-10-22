import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { displayOrderRef } from '@/lib/formatDisplayId'

// Child: Reject pending demand request with optional notes
export function DemandRequestRejectDialog({
  open,
  onOpenChange,
  order = null,
  loading = false,
  onConfirm,
}) {
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) setNotes('')
  }, [open, order?.id])

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject demand request</DialogTitle>
          <DialogDescription>
            {displayOrderRef(order)}
            {order.createdByName ? ` · ${order.createdByName}` : ''}
            — the Inventory Manager will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="demand-reject-notes">Rejection notes (optional)</Label>
          <Textarea
            id="demand-reject-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explain why this order request is rejected"
            className="min-h-24"
            maxLength={2000}
          />
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer sm:w-auto"
            disabled={loading}
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full cursor-pointer sm:w-auto"
            disabled={loading}
            onClick={() => onConfirm?.(notes.trim())}
          >
            {loading ? 'Rejecting…' : 'Reject request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DemandRequestRejectDialog
