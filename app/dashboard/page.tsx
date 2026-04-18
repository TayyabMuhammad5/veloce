
import prisma from '@/lib/prisma'
import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import KanbanBoard from '@/components/dashboard/kanban-board'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const limit = 12
  const briefs = await prisma.brief.findMany({
    take: limit + 1,
    where: {
      isArchived: false,
      ...(session.user.role === 'ADMIN' ? {} : { assigneeId: session.user.id })
    },
    orderBy: { createdAt: 'desc' },
    include: { analysis: true, assignee: true }
  })

  let initialNextCursor: string | undefined = undefined
  if (briefs.length > limit) {
    const nextItem = briefs.pop()
    initialNextCursor = nextItem!.id
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 px-8 py-4 flex justify-between items-center text-white shrink-0 shadow-md">
        <h1 className="text-xl font-bold">Agency Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-400">{session.user.email}</span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }) }}>
            <button type="submit" className="bg-red-600 px-4 py-2 rounded-lg text-sm font-bold">Log Out</button>
          </form>
        </div>
      </header>

      <main className="p-8 flex-1 flex flex-col">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900">Project Pipeline</h2>
        </div>
        <KanbanBoard initialBriefs={briefs} initialNextCursor={initialNextCursor} />
      </main>
    </div>
  )
}