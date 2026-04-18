
import { z } from "zod";

export const submitBriefSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  description: z.string().min(20, "Please provide a more detailed description."),
  budget: z.string().min(1, "Budget is required."),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"], {
    errorMap: () => ({ message: "Please select a valid urgency level." }),
  }),
  contactInfo: z.string().email("Please enter a valid email address."),
});

export const updateStatusSchema = z.object({
  id: z.string().min(1, "Brief ID is required."),
  newStatus: z.enum(["NEW", "UNDER_REVIEW", "PROPOSAL_SENT", "WON", "ARCHIVED"], {
    errorMap: () => ({ message: "Invalid status selected." }),
  }),
});

export const overrideEstimateSchema = z.object({
  briefId: z.string().min(1, "Brief ID is required."),
  complexityScore: z.coerce
    .number()
    .min(1, "Score must be at least 1")
    .max(5, "Score cannot exceed 5"),
  manualOverrideReason: z
    .string()
    .min(5, "Please provide a reason (at least 5 characters)."),
});