
import NextAuth, { DefaultSession } from "next-auth" 
import CredentialsProvider from "next-auth/providers/credentials"
import { JWT } from "next-auth/jwt"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

// 1. Extend NextAuth types to recognize 'id' and 'role'
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "ADMIN" | "REVIEWER"
    } & DefaultSession["user"]
  }
  
  interface User {
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }


        const user = await prisma.user.findUnique({
          where: { 
            email: credentials.email as string 
          }
        })

        // If no user is found, reject the login
        if (!user) {
          return null
        }

        // Check if the password matches the hashed password in the DB
        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordsMatch) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role as "ADMIN" | "REVIEWER",
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  }
})