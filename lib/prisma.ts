
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// 1. Create a native Postgres connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// 2. Wrap it in the Prisma Adapter
const adapter = new PrismaPg(pool)

const prismaClientSingleton = () => {
  // 3. Pass the adapter to the client instead of a URL
  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma