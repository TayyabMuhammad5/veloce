
import { z } from "zod"

export const submitBriefSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  description: z.string().min(10, "Please provide more detail in the description."),
  budget: z.string().min(1, "Budget is required."),
  urgency: z.string().min(1, "Urgency is required."),
  contactInfo: z.string().email("Please provide a valid email address."),
})

export const updateStatusSchema = z.object({
  id: z.string().min(1, "Brief ID is required."),
  newStatus: z.enum(["NEW", "UNDER_REVIEW", "PROPOSAL_SENT", "WON", "ARCHIVED"], {
    errorMap: () => ({ message: "Invalid project status provided." })
  }),
})

export const overrideEstimateSchema = z.object({
  briefId: z.string().min(1, "Brief ID is required."),
  complexityScore: z.coerce.number().min(1).max(5, "Score must be between 1 and 5."),
  manualOverrideReason: z.string().min(10, "Please provide a clear reason for overriding the AI."),
})