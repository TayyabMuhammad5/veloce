
import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

export default async function LoginPage(props: any) {

  const searchParams = await props.searchParams
  const isError = searchParams?.error === "true"
  
  async function loginAction(formData: FormData) {
    "use server"
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/dashboard",
      })
    } catch (error) {
      if (error instanceof AuthError) {
        redirect("/login?error=true")
      }
      throw error 
    }
  }

  return (
  <div className="w-full">
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        
        <h1 className="text-2xl font-bold text-center mb-8">Login</h1>

        {isError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-6 text-center border border-red-200">
            You have entered wrong email or password
          </div>
        )}

        <form action={loginAction} className="space-y-6">
          <input 
            type="email" name="email" required placeholder="Email"
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            type="password" name="password" required placeholder="Password"
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition">
            Sign In
          </button>
        </form>

        {/* MOVE HERE */}
        <div className="mt-6 text-sm text-gray-600 text-center">
          <h3>Email: admin@veloce.com</h3>
          <h3>Password: password123</h3>
        </div>

      </div>
    </div>
  </div>
)
}