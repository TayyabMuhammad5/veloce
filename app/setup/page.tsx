
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export default async function SetupPage() {
  // Hash the password "password123"
  const hashedPassword = await bcrypt.hash("password123", 10)

  const user = await prisma.user.upsert({
    where: { email: "admin@agency.com" },
    update: {},
    create: {
      email: "admin@agency.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  })

  return (
    <div className="p-8">
      <h1>User Created!</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      <p>You can now go to /login and use the password "password123"</p>
    </div>
  )
}