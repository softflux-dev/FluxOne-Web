import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { LeavesPanel } from '@/components/feature/branch/staff/LeavesPanel'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { TableRowsSkeleton } from '@/components/ui/skeleton'

export function LeavesPage() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') === 'staff' ? 'staff' : 'mine'

  const [designations, setDesignations] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [leaveSubTab, setLeaveSubTab] = useState(tabParam)

  useEffect(() => {
    setLeaveSubTab(tabParam)
  }, [tabParam])

  const loadData = async () => {
    setLoading(true)
    const [resDesig, resStaff] = await Promise.all([
      apiClient.get(endpoints.branch.designations.list, { limit: 100 }),
      apiClient.get(endpoints.branch.staff.list, { limit: 100, status: 'active' }),
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

  const isMine = leaveSubTab === 'mine'

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Operations"
          title="Leave Management"
          description="Apply for your own leave, or appoint leave for branch employees."
          actions={
            <Button
              type="button"
              variant="brand"
              onClick={() => setCreateOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="size-4" />
              {isMine ? 'Apply for Leave' : 'Add Leaves'}
            </Button>
          }
        />
      </MotionHeader>

      <MotionReveal>
        {loading ? (
          <TableRowsSkeleton rows={5} />
        ) : (
          <LeavesPanel
            designations={designations}
            staff={staff}
            createOpen={createOpen}
            onCreateOpenChange={setCreateOpen}
            onSubTabChange={setLeaveSubTab}
            initialSubTab={tabParam}
          />
        )}
      </MotionReveal>
    </div>
  )
}

export default LeavesPage
