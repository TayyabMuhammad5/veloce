
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ArchivedPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const archivedBriefs = await prisma.brief.findMany({
    where: {
      isArchived: true,
      ...(session.user.role === 'ADMIN' ? {} : { assigneeId: session.user.id })
    },
    orderBy: { updatedAt: 'desc' },
    include: { assignee: true }
  })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 px-8 py-4 flex items-center gap-4 text-white shrink-0 shadow-md">
        <Link href="/dashboard" className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-sm transition">
          &larr; Back to Pipeline
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Archived Projects</h1>
      </header>

      <main className="p-8 max-w-6xl mx-auto w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {archivedBriefs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No archived projects found.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-4 font-bold">Project Title</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Assignee</th>
                  <th className="p-4 font-bold">Last Updated</th>
                  <th className="p-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {archivedBriefs.map((brief) => (
                  <tr key={brief.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{brief.title}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-bold">
                        {brief.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{brief.assignee?.email || "—"}</td>
                    <td className="p-4 text-gray-500">{new Date(brief.updatedAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <Link href={`/dashboard/${brief.id}`} className="text-blue-600 hover:underline font-medium">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}