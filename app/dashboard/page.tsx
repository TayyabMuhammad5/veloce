
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

  // 1. Fetch only the first batch of records
  const briefs = await prisma.brief.findMany({
    take: limit + 1, // Fetch one extra to check for a next page
    where: {
      isArchived: false,
      ...(session.user.role === 'ADMIN' ? {} : { assigneeId: session.user.id })
    },
    orderBy: { createdAt: 'desc' },
    include: { analysis: true, assignee: true }
  })

  // 2. Calculate the initial cursor
  let initialNextCursor: string | undefined = undefined
  if (briefs.length > limit) {
    const nextItem = briefs.pop()
    initialNextCursor = nextItem!.id
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 px-8 py-4 flex justify-between items-center text-white shrink-0 shadow-md">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Agency Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="font-medium text-sm">{session.user.email}</div>
            <div className={`text-xs uppercase font-extrabold tracking-wider mt-0.5 ${session.user.role === 'ADMIN' ? 'text-purple-400' : 'text-blue-400'}`}>
              {session.user.role}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/dashboard/archived" className="text-sm font-bold text-gray-300 hover:text-white mr-4 transition-colors">
              View Archive
            </Link>

            {session.user.role === "ADMIN" && (
              <Link href="/dashboard/team" className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm">
                Manage Team
              </Link>
            )}

            <form action={async () => {
              "use server"
              await signOut({ redirectTo: "/" })
            }}>
              <button type="submit" className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm">
                Log Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="p-8 flex-1 flex flex-col overflow-hidden">
        <div className="mb-6 shrink-0">
          <h2 className="text-3xl font-extrabold text-gray-900">Pipeline</h2>
          <p className="text-gray-500 mt-1">
            {session.user.role === 'ADMIN' 
              ? "Manage all incoming client briefs and assignments." 
              : "View and evaluate your assigned client briefs."}
          </p>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <KanbanBoard 
            initialBriefs={briefs} 
            initialNextCursor={initialNextCursor} 
          />
        </div>
      </main>
    </div>
  )
}