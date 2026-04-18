'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import prisma from '@/lib/prisma'
import { processBriefAI } from '@/lib/ai-pipeline'
import { redis } from '@/lib/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { submitBriefSchema, updateStatusSchema } from '@/lib/validations'
import { auth } from '@/auth'

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
})

export async function submitIntakeForm(formData: FormData) {
  // 1. RATE LIMITING CHECK
  const requestHeaders = await headers()
  const ip = requestHeaders.get("x-forwarded-for") ?? "127.0.0.1"
  
  const { success: rateLimitSuccess } = await ratelimit.limit(ip)
  
  if (!rateLimitSuccess) {
    return { success: false, error: "Too many requests. Please wait a minute before submitting again." }
  }

  // 2. EXTRACT AND VALIDATE DATA WITH ZOD
  const rawData = {
    title: formData.get('title'),
    description: formData.get('description'),
    budget: formData.get('budget'),
    urgency: formData.get('urgency'),
    contactInfo: formData.get('contactInfo'),
  }

  const validatedFields = submitBriefSchema.safeParse(rawData)

  // If the data is bad, instantly return the specific Zod error message
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.issues[0].message }
  }

  // The data is now 100% type-safe and clean
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
    console.error("Submission error:", error)
    return { success: false, error: "Failed to submit brief." }
  }
}

export async function updateBriefStatus(id: string, newStatus: string) {
  // 1. VALIDATE DATA WITH ZOD
  const validatedFields = updateStatusSchema.safeParse({ id, newStatus })

 if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.issues[0].message }
  }

  const cleanId = validatedFields.data.id
  const cleanStatus = validatedFields.data.newStatus

  try {
    const currentBrief = await prisma.brief.findUnique({
      where: { id: cleanId },
      select: { status: true }
    })

    if (!currentBrief) throw new Error("Brief not found")

    await prisma.$transaction([
      prisma.brief.update({
        where: { id: cleanId },
        data: { status: cleanStatus }
      }),
      prisma.briefEvent.create({
        data: {
          briefId: cleanId,
          eventType: 'STAGE_CHANGE',
          fromStage: currentBrief.status,
          toStage: cleanStatus
        }
      })
    ])
    
    await redis.del('analytics:pipeline')
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/${cleanId}`)
    
    return { success: true }
  } catch (error) {
    console.error("Failed to update status:", error)
    return { success: false, error: "Failed to update status." }
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

import { overrideEstimateSchema } from '@/lib/validations'

export async function overrideAIEstimate(formData: FormData) {
  const validatedFields = overrideEstimateSchema.safeParse({
    briefId: formData.get('briefId'),
    complexityScore: formData.get('complexityScore'),
    manualOverrideReason: formData.get('manualOverrideReason'),
  })

  // Change this:
  // if (!validatedFields.success) {
  //   return { success: false, error: validatedFields.error.errors[0].message }
  // }

  // To this:
  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.issues[0].message }
  }

  const { briefId, complexityScore, manualOverrideReason } = validatedFields.data

  try {
    await prisma.aIAnalysis.update({
      where: { briefId },
      data: {
        complexityScore,
        manualOverrideReason
      }
    })

  
    await redis.del('analytics:pipeline')
    
    revalidatePath(`/dashboard/${briefId}`)
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error) {
    console.error("Override error:", error)
    return { success: false, error: "Failed to override estimate." }
  }
}