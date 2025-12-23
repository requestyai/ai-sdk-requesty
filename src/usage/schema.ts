import z from 'zod'

export const RequestyUsageSchema = z
    .object({
        prompt_tokens: z.number().optional(),
        completion_tokens: z.number().optional(),
        total_tokens: z.number().optional(),
        prompt_tokens_details: z
            .object({
                caching_tokens: z.number().optional(),
                cached_tokens: z.number().optional(),
            })
            .optional(),
    })
    .optional()
