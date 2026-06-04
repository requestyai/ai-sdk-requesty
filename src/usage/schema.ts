import z from 'zod'

export const RequestyUsageSchema = z
    .object({
        prompt_tokens: z.number().nonnegative().optional(),
        completion_tokens: z.number().nonnegative().optional(),
        total_tokens: z.number().nonnegative().optional(),
        prompt_tokens_details: z
            .object({
                caching_tokens: z.number().nonnegative().optional(),
                cached_tokens: z.number().nonnegative().optional(),
            })
            .optional(),
        cost: z.number().nonnegative().optional(),
    })
    .optional()
