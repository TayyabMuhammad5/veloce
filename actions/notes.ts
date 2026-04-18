'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

export async function addNote(briefId: string, content: string) {
  try {
    const user = await prisma.user.findFirst()
    if (!user) throw new Error("No users found in database. Create one in Prisma Studio.")

    await prisma.note.create({
      data: {
        content,
        briefId,
        authorId: user.id, 
      }
    })

    revalidatePath(`/dashboard/${briefId}`)
    return { success: true }
  } catch (error) {
    console.error("Failed to add note:", error)
    return { success: false, error: "Failed to add note." }
  }
}