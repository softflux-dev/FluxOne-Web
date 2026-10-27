import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { StaffAttendanceTab } from '@/components/feature/branch/staff/StaffAttendanceTab'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { TableRowsSkeleton } from '@/components/ui/skeleton'

export function AttendancePage() {
  const [designations, setDesignations] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Operations"
          title="Attendance Management"
          description="View daily shift records, monthly aggregates, and record daily status."
        />
      </MotionHeader>

      <MotionReveal>
        {loading ? (
          <TableRowsSkeleton rows={5} />
        ) : (
          <StaffAttendanceTab designations={designations} staff={staff} />
        )}
      </MotionReveal>
    </div>
  )
}
export default AttendancePage
