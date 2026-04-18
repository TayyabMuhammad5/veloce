
import prisma from '@/lib/prisma'
import AnalyticsCharts from '@/components/dashboard/analytics-charts'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  // 1. Check Redis Cache First
  const CACHE_KEY = 'analytics:pipeline'
  const cachedData = await redis.get(CACHE_KEY)

  let stageData;
  let metrics;

  if (cachedData) {
    // CACHE HIT: Use the lightning-fast Redis data
    const parsed = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData
    stageData = parsed.stageData
    metrics = parsed.metrics
  } else {
    // CACHE MISS: Calculate everything from the database
    const allBriefs = await prisma.brief.findMany({
      where: { isArchived: false }, // Only analyze active briefs
      include: { analysis: true }
    })

    const totalBriefs = allBriefs.length
    const wonBriefs = allBriefs.filter(b => b.status === 'WON').length
    const conversionRate = totalBriefs > 0 ? ((wonBriefs / totalBriefs) * 100).toFixed(1) : '0'

    const analyzedBriefs = allBriefs.filter(b => b.analysis !== null)
    const totalComplexity = analyzedBriefs.reduce((sum, b) => sum + (b.analysis?.complexityScore || 0), 0)
    const avgComplexity = analyzedBriefs.length > 0 ? (totalComplexity / analyzedBriefs.length).toFixed(1) : '0'

    // Calculate Estimated Revenue (Assuming the high end of the budget string)
    let estRevenue = 0
    allBriefs.forEach(b => {
      if (b.budget.includes('$25k+')) estRevenue += 25000
      else if (b.budget.includes('$10k - $25k')) estRevenue += 25000
      else if (b.budget.includes('$5k - $10k')) estRevenue += 10000
    })

    metrics = { totalBriefs, wonBriefs, conversionRate, avgComplexity, estRevenue: `$${(estRevenue / 1000).toFixed(0)}k` }

    const stages = ['NEW', 'UNDER_REVIEW', 'PROPOSAL_SENT', 'WON']
    stageData = stages.map(stage => ({
      stage: stage.replace('_', ' '),
      count: allBriefs.filter(b => b.status === stage).length
    }))

    // 2. Save the result into Redis for next time (expires in 1 hour just in case)
    await redis.set(CACHE_KEY, JSON.stringify({ stageData, metrics }), { ex: 3600 })
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time metrics and AI performance</p>
      </header>


      <AnalyticsCharts stageData={stageData} metrics={metrics} />
    </div>
  )
}