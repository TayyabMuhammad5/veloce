
import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import Link from "next/link"

export default async function TeamManagementPage() {
  const session = await auth()
  

  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  // Fetch all current reviewers
  const reviewers = await prisma.user.findMany({
    where: { role: "REVIEWER" },
    orderBy: { email: 'asc' },
    include: { _count: { select: { assignedBriefs: true } } } // Count their active assigned briefs
  })

  // --- SERVER ACTIONS ---

  async function addReviewer(formData: FormData) {
    "use server"
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    if (!email || !password) return

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
      await prisma.user.create({
        data: { email, password: hashedPassword, role: "REVIEWER" }
      })
      revalidatePath("/dashboard/team")
    } catch (error) {
      console.error("Failed to create user. Email might already exist.")
    }
  }

  async function removeReviewer(formData: FormData) {
    "use server"
    const id = formData.get("userId") as string
    
    // 1. Safely unassign any briefs currently assigned to this reviewer
    await prisma.brief.updateMany({
      where: { assigneeId: id },
      data: { assigneeId: null }
    })

    // 2. Delete all their internal notes so the database constraint doesn't block deletion
    await prisma.note.deleteMany({
      where: { authorId: id }
    })

    // 3. Delete the actual user account
    await prisma.user.delete({
      where: { id }
    })
    
    revalidatePath("/dashboard/team")
    revalidatePath("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 px-8 py-4 text-white shrink-0 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-sm transition">
            ← Back to Pipeline
          </Link>
          <h1 className="text-xl font-bold">Team Management</h1>
        </div>
      </header>

      <main className="p-8 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
        
        {/* LEFT: Hire Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit border-t-4 border-t-green-500">
          <h2 className="text-lg font-bold mb-4">Hire New Reviewer</h2>
          <form action={addReviewer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" name="email" required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
              <input type="password" name="password" required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold w-full transition">
              Create Account
            </button>
          </form>
        </div>

        {/* RIGHT: Current Team List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">Current Reviewers</h2>
          <div className="space-y-3">
            {reviewers.length === 0 ? (
              <p className="text-gray-500 italic text-sm">No reviewers hired yet.</p>
            ) : (
              reviewers.map(reviewer => (
                <div key={reviewer.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <div className="font-bold text-gray-900">{reviewer.email}</div>
                    <div className="text-xs text-gray-500 mt-1">Assigned Briefs: {reviewer._count.assignedBriefs}</div>
                  </div>
                  <form action={removeReviewer}>
                    <input type="hidden" name="userId" value={reviewer.id} />
                    <button type="submit" className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded text-sm font-bold transition">
                      Remove
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  )
}