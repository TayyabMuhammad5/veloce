
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

  const resolvedParams = await params

  // Fetch the brief along with the newly added events for the timeline
  const brief = await prisma.brief.findUnique({
    where: { id: resolvedParams.briefId },
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

  const reviewers = await prisma.user.findMany({
    where: { role: "REVIEWER" }
  })


  async function assignBrief(formData: FormData) {
    "use server"
    const assigneeId = formData.get("assigneeId") as string
    
    await prisma.brief.update({
      where: { id: brief!.id },
      data: { assigneeId: assigneeId === "unassigned" ? null : assigneeId }
    })
    
    revalidatePath(`/dashboard/${brief!.id}`)
    revalidatePath(`/dashboard`)
  }

  async function submitNote(formData: FormData) {
    'use server'
    const content = formData.get('content') as string
    if (!content) return

    await prisma.note.create({
      data: { content, briefId: brief!.id, authorId: session!.user.id }
    })
    revalidatePath(`/dashboard/${brief!.id}`)
  }

  async function toggleArchive() {
    "use server"
    await prisma.brief.update({
      where: { id: brief!.id },
      data: { isArchived: !brief!.isArchived }
    })
    revalidatePath(`/dashboard/${brief!.id}`)
    revalidatePath(`/dashboard`)
    revalidatePath(`/dashboard/archived`)
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 px-8 py-4 text-white shrink-0 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-sm transition">
            &larr; Back to Board
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-3">
            Brief: {brief.title}
            {brief.isArchived && <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded font-bold uppercase tracking-wide">Archived</span>}
          </h1>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <div>Assigned to: <span className="text-blue-400">{brief.assignee?.email || "Unassigned"}</span></div>
          
          <form action={toggleArchive}>
            <button type="submit" className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition">
              {brief.isArchived ? "Unarchive Project" : "Archive Project"}
            </button>
          </form>
        </div>
      </header>

      <main className="p-8 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto w-full">
        <div className="space-y-8">
          
          {session.user.role === "ADMIN" && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-purple-500">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-purple-600 mb-4">Admin Controls: Assignment</h2>
              <form action={assignBrief} className="flex gap-3">
                <select 
                  name="assigneeId" 
                  defaultValue={brief.assigneeId || "unassigned"} 
                  className="flex-1 border border-gray-300 rounded-lg p-2 text-sm bg-gray-50"
                >
                  <option value="unassigned">-- Unassigned --</option>
                  {reviewers.map(r => (
                    <option key={r.id} value={r.id}>{r.email}</option>
                  ))}
                </select>
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition">
                  Assign
                </button>
              </form>
            </div>
          )}

          {/* Client Requirements */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h2 className="text-xl font-bold mb-4 border-b pb-2 text-gray-800">Client Requirements</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h3>
                <p className="whitespace-pre-wrap text-gray-700">{brief.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Budget</h3>
                  <p className="text-gray-900 font-medium">{brief.budget}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Urgency</h3>
                  <p className="text-gray-900 font-medium">{brief.urgency}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact Info</h3>
                <p className="text-gray-900 font-medium">{brief.contactInfo}</p>
              </div>
            </div>
          </div>

          {/* Stage Timeline */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h2 className="text-xl font-bold mb-4 border-b pb-2 text-gray-800">Stage Timeline</h2>
            <div className="space-y-4">
              {brief.events.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No stage changes yet.</p>
              ) : (
                brief.events.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Moved to <span className="uppercase font-bold text-blue-700">{event.toStage?.replace('_', ' ')}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        From {event.fromStage?.replace('_', ' ')} • {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        <div className="space-y-8">
          
          {/* AI Analysis Block with the Manual Override Form */}
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-blue-900 border-b border-blue-200 pb-2">AI Analysis</h2>
            {brief.analysis ? (
              <div className="space-y-4">
                 <div>
                    <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-1">Suggested Category</h3>
                    <p className="text-blue-900 font-medium">{brief.analysis.category}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-blue-100">
                      <div className="text-3xl font-bold text-blue-600">{brief.analysis.effortHours}h</div>
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Estimated Effort</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm text-center border border-blue-100 relative">
  
                      {brief.analysis.manualOverrideReason && (
                        <span className="absolute top-2 right-2 text-yellow-500" title="Manually Overridden">⚠️</span>
                      )}
                      <div className="text-3xl font-bold text-blue-600">{brief.analysis.complexityScore}<span className="text-lg text-gray-400">/5</span></div>
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Complexity</div>
                    </div>
                 </div>


                 {brief.analysis.manualOverrideReason && (
                   <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-4 text-sm">
                     <span className="font-bold text-yellow-800 block mb-1">Reviewer Override Reason:</span>
                     <p className="text-yellow-900">{brief.analysis.manualOverrideReason}</p>
                   </div>
                 )}

    
                 <div className="mt-6 pt-4 border-t border-blue-200">
                   <h3 className="text-sm font-bold text-blue-900 mb-3">Adjust AI Estimate</h3>
                   <form action={overrideAIEstimate} className="space-y-3">
                     <input type="hidden" name="briefId" value={brief.id} />
                     
                     <div className="flex gap-3">
                       <div className="w-24">
                         <label className="block text-xs font-semibold text-blue-800 mb-1">New Score</label>
                         <select name="complexityScore" defaultValue={brief.analysis.complexityScore} className="w-full border border-blue-300 rounded p-2 text-sm bg-white">
                           {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                         </select>
                       </div>
                       <div className="flex-1">
                         <label className="block text-xs font-semibold text-blue-800 mb-1">Reason</label>
                         <input type="text" name="manualOverrideReason" required placeholder="Why is the AI wrong?" className="w-full border border-blue-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                       </div>
                     </div>
                     <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-blue-700 transition w-full">
                       Submit Override
                     </button>
                   </form>
                 </div>

              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-blue-600 font-medium animate-pulse">AI Analysis is pending or failed.</p>
              </div>
            )}
          </div>

          {/* Internal Notes Thread */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
            <h2 className="text-xl font-bold mb-4 border-b pb-2 text-gray-800">Internal Notes</h2>
            <div className="flex-1 space-y-4 mb-4 overflow-y-auto pr-2">
              {brief.notes.map(note => (
                <div key={note.id} className={`p-4 rounded-lg border border-gray-100 ${note.authorId === session.user.id ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}>
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span className="font-bold text-gray-700">{note.author.email}</span>
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-800">{note.content}</p>
                </div>
              ))}
              {brief.notes.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-gray-400 italic">No internal notes yet.</p>
                </div>
              )}
            </div>

            <form action={submitNote} className="flex gap-2 pt-4 border-t">
              <input 
                type="text" 
                name="content"
                required
                placeholder="Type a note..." 
                className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button type="submit" className="bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm">
                Send
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}