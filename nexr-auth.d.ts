import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "ADMIN" | "REVIEWER"
    } & DefaultSession["user"]
  }
  interface User extends DefaultUser {
    id: string
    role: "ADMIN" | "REVIEWER"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "ADMIN" | "REVIEWER"
  }
}