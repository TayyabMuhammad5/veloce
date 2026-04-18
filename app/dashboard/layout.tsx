
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 text-xl font-bold border-b border-gray-800">
          VELOCE
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="block px-4 py-2 rounded bg-gray-800 text-white">
            Kanban Board
          </Link>
          <Link href="/dashboard/analytics" className="block px-4 py-2 rounded text-gray-400 hover:bg-gray-800 hover:text-white transition">
            Analytics
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-800 text-sm text-gray-400">
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}