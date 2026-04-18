
import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { overrideAIEstimate } from '@/actions/brief'

export const dynamic = 'force-dynamic'

export default async function BriefDetailPage({ params }: { params: Promise<{ briefId: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { briefId } = await params

  const brief = await prisma.brief.findUnique({
    where: { id: briefId },
    include: {
      analysis: true,
      assignee: true,
      events: { orderBy: { createdAt: 'desc' } },
      notes: {
        include: { author: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!brief) return notFound()

  if (session.user.role === "REVIEWER" && brief.assigneeId !== session.user.id) {
    redirect("/dashboard")
  }

  const reviewers = await prisma.user.findMany({ where: { role: "REVIEWER" } })

  async function assignBrief(formData: FormData) {
    "use server"
    await prisma.brief.update({
      where: { id: briefId },
      data: { assigneeId: formData.get("assigneeId") === "unassigned" ? null : (formData.get("assigneeId") as string) }
    })
    revalidatePath(`/dashboard/${briefId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 px-8 py-4 text-white flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-sm transition">
            &larr; Back to Board
          </Link>
          <h1 className="text-xl font-bold">Brief: {brief.title}</h1>
        </div>
      </header>

      <main className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto w-full">
        <div className="space-y-8">
          {/* Admin Assignment */}
          {session.user.role === "ADMIN" && (
            <div className="bg-white p-6 rounded-xl border-l-4 border-l-purple-500 shadow-sm">
              <h2 className="text-sm font-extrabold text-purple-600 uppercase mb-4">Assign Reviewer</h2>
              <form action={assignBrief} className="flex gap-3">
                <select name="assigneeId" defaultValue={brief.assigneeId || "unassigned"} className="flex-1 border rounded-lg p-2 text-sm bg-gray-50">
                  <option value="unassigned">-- Unassigned --</option>
                  {reviewers.map(r => <option key={r.id} value={r.id}>{r.email}</option>)}
                </select>
                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Assign</button>
              </form>
            </div>
          )}

          {/* Client Requirements */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Client Requirements</h2>
            <p className="whitespace-pre-wrap text-gray-700">{brief.description}</p>
          </div>

          {/* Stage Timeline */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Stage History</h2>
            <div className="space-y-4">
              {brief.events.map(event => (
                <div key={event.id} className="text-sm">
                  <span className="font-bold text-blue-700 uppercase">{event.toStage}</span>
                  <p className="text-xs text-gray-500">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* AI Analysis & Override */}
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
            <h2 className="text-xl font-bold text-blue-900 border-b border-blue-200 pb-2 mb-4">AI Analysis</h2>
            {brief.analysis && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg text-center shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">{brief.analysis.complexityScore}/5</div>
                    <div className="text-xs text-gray-500 uppercase font-semibold">Complexity</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-center shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">{brief.analysis.effortHours}h</div>
                    <div className="text-xs text-gray-500 uppercase font-semibold">Effort</div>
                  </div>
                </div>

                {brief.analysis.manualOverrideReason && (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-sm text-yellow-900">
                    <strong>Override Reason:</strong> {brief.analysis.manualOverrideReason}
                  </div>
                )}

                <form action={overrideAIEstimate} className="pt-4 border-t border-blue-200 space-y-3">
                  <input type="hidden" name="briefId" value={briefId} />
                  <div className="flex gap-2">
                    <select name="complexityScore" className="border rounded p-2 text-sm">
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <input name="manualOverrideReason" required placeholder="Reason for change..." className="flex-1 border rounded p-2 text-sm" />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-xs font-bold">Override Estimate</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}