// app/page.tsx
import Link from 'next/link'
import { auth, signOut } from '@/auth'

export default async function HomePage() {
  const session = await auth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">
          VELOCE
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Welcome to the automated project pipeline. Please select an option below.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          
          {session ? (
            <>
              <Link 
                href="/dashboard" 
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </Link>
              
              <form action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}>
                <button type="submit" className="px-8 py-4 bg-gray-200 text-gray-900 rounded-xl font-bold shadow-sm hover:bg-gray-300 transition-colors">
                  Log Out
                </button>
              </form>
            </>
          ) : (
            
            <>
              <Link 
                href="/submit" 
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-colors"
              >
                Submit a New Brief
              </Link>
              
              <Link 
                href="/login" 
                className="px-8 py-4 bg-white text-gray-900 border border-gray-200 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-colors"
              >
                Admin Login
              </Link>
            </>
          )}

        </div>
      </div>
    </div>
  )
}