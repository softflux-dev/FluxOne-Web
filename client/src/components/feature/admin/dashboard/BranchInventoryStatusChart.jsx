import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Layers } from 'lucide-react'

export function BranchInventoryStatusChart({ data = {} }) {
  const summary = data.summary || {}
  const branches = data.branchBreakdown || []

  const chartData = branches.map((b) => ({
    name: String(b.branchName || '')
      .replace(' Branch', '')
      .replace(' Flagship', '')
      .replace(/^Company [AB] - /, ''),
    fullName: b.branchName,
    Healthy: b.healthyStock || 0,
    'Low Stock': b.lowStock || 0,
    'Critical / Out': (b.criticalStock || 0) + (b.outOfStock || 0),
    total: b.totalSkus || 0,
    valuation: b.valuationFormatted || b.valuation,
  }))

  const optimal = summary.optimalRate ?? 0
  const valuationLabel =
    summary.totalValuationFormatted ||
    (typeof summary.totalValuation === 'number'
      ? `Rs. ${summary.totalValuation.toLocaleString()}`
      : summary.totalValuation) ||
    'Rs. 0'

  return (
    <SurfaceCard
      title="Branch Inventory Status"
      description={data.timestamp || "Today's stock health across each branch"}
    >
      <div className="h-64 w-full pt-2">
        {!chartData.length ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No branches yet — create branches to see inventory status.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#334155"
                fontSize={12}
                fontWeight={600}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip
                formatter={(value, name) => [`${value} SKUs`, name]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="Healthy" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Low Stock" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Critical / Out" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </SurfaceCard>
  )
}

export default BranchInventoryStatusChart
