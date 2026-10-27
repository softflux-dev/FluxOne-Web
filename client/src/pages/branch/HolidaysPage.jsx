import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { StaffHolidaysTab } from '@/components/feature/branch/staff/StaffHolidaysTab'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { TableRowsSkeleton } from '@/components/ui/skeleton'

export function HolidaysPage() {
  const [designations, setDesignations] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const [resDesig, resStaff] = await Promise.all([
      apiClient.get(endpoints.branch.designations.list, { limit: 200 }),
      apiClient.get(endpoints.branch.staff.list, { limit: 500, status: 'active' }),
    ])
    setLoading(false)

    if (resDesig.success) {
      setDesignations(resDesig.data.items || resDesig.data || [])
    }
    if (resStaff.success) {
      setStaff(resStaff.data.items || resStaff.data || [])
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Operations"
          title="Holiday Management"
          description="Schedule branch holidays and automatically update attendance templates for selected employees."
          actions={
            <Button
              type="button"
              variant="brand"
              onClick={() => setCreateOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="size-4" />
              Add Holidays
            </Button>
          }
        />
      </MotionHeader>

      <MotionReveal>
        {loading ? (
          <TableRowsSkeleton rows={5} />
        ) : (
          <StaffHolidaysTab
            designations={designations}
            staff={staff}
            createOpen={createOpen}
            onCreateOpenChange={setCreateOpen}
          />
        )}
      </MotionReveal>
    </div>
  )
}

export default HolidaysPage
