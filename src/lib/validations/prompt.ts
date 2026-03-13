import * as z from "zod"

export const promptSchema = z.object({
  content: z.string().min(1, "Content is required"),
  categoryId: z.string().uuid("Invalid category ID"),
  countryCode: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

export type PromptValues = z.infer<typeof promptSchema>
