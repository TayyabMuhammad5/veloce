'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import prisma from '@/lib/prisma'
import { processBriefAI } from '@/lib/ai-pipeline'
import { redis } from '@/lib/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { auth } from '@/auth'
import { submitBriefSchema, updateStatusSchema, overrideEstimateSchema } from '@/lib/validations'

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
})

// ✅ helper to normalize FormData
function getFormValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "")
}

export async function submitIntakeForm(formData: FormData) {
  const requestHeaders = await headers()
 const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
  
  const { success: rateLimitSuccess } = await ratelimit.limit(ip)
  if (!rateLimitSuccess) {
    return { success: false, error: "Too many requests. Please wait a minute." }
  }

  // ✅ FIX: normalize all inputs
  const rawData = {
    title: getFormValue(formData, 'title'),
    description: getFormValue(formData, 'description'),
    budget: getFormValue(formData, 'budget'),
    urgency: getFormValue(formData, 'urgency'),
    contactInfo: getFormValue(formData, 'contactInfo'),
  }

  const validatedFields = submitBriefSchema.safeParse(rawData)
  if (!validatedFields.success) {
    return { success: false, error: JSON.stringify(validatedFields.error.issues, null, 2) }
  }

  const { title, description, budget, urgency, contactInfo } = validatedFields.data

  try {
    const brief = await prisma.brief.create({
      data: { title, description, budget, urgency, contactInfo, status: 'NEW' }
    })

    processBriefAI(brief.id, description)
    await redis.del('analytics:pipeline')
    revalidatePath('/dashboard')

    return { success: true, briefId: brief.id }
  } catch (error) {
  console.error("PRISMA ERROR:", error)
  return { success: false, error: "Failed to submit brief." }
}
}

export async function updateBriefStatus(id: string, newStatus: string) {
  const validatedFields = updateStatusSchema.safeParse({
    id: String(id ?? ""),
    newStatus: String(newStatus ?? "")
  })

  if (!validatedFields.success) {
   return { success: false, error: JSON.stringify(validatedFields.error.issues, null, 2) }
  }

  try {
    const currentBrief = await prisma.brief.findUnique({
      where: { id },
      select: { status: true }
    })

    if (!currentBrief) throw new Error("Brief not found")

    await prisma.$transaction([
      prisma.brief.update({
        where: { id },
        data: { status: validatedFields.data.newStatus as any }
      }),
      prisma.briefEvent.create({
        data: {
          briefId: id,
          eventType: 'STAGE_CHANGE',
          fromStage: currentBrief.status,
          toStage: validatedFields.data.newStatus as any
        }
      })
    ])
    
    await redis.del('analytics:pipeline')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to update status." }
  }
}

export async function overrideAIEstimate(formData: FormData) {
  // ✅ FIX: normalize safely
  const rawData = {
    briefId: getFormValue(formData, 'briefId'),
    complexityScore: formData.get('complexityScore'), // keep raw for coercion
    manualOverrideReason: getFormValue(formData, 'manualOverrideReason'),
  }

  const validatedFields = overrideEstimateSchema.safeParse(rawData)

  if (!validatedFields.success) {
   return { success: false, error: JSON.stringify(validatedFields.error.issues, null, 2) }
  }

  const { briefId, complexityScore, manualOverrideReason } = validatedFields.data

  try {
    await prisma.aIAnalysis.update({
      where: { briefId },
      data: { complexityScore, manualOverrideReason }
    })

    await redis.del('analytics:pipeline')
    revalidatePath(`/dashboard/${briefId}`)
    revalidatePath('/dashboard')

    // ✅ FIX: return response
    return { success: true }
  } catch (error) {
    console.error("Override error:", error)
    return { success: false, error: "Failed to override estimate." }
  }
}

export async function loadMoreBriefs(cursor?: string) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const limit = 12

  const briefs = await prisma.brief.findMany({
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    where: {
      isArchived: false,
      ...(session.user.role === 'ADMIN' ? {} : { assigneeId: session.user.id })
    },
    orderBy: { createdAt: 'desc' },
    include: { analysis: true, assignee: true }
  })

  let nextCursor: string | undefined = undefined

  if (briefs.length > limit) {
    const nextItem = briefs.pop()
    nextCursor = nextItem!.id
  }

  return { briefs, nextCursor }
}