import { createJsonErrorResponseHandler } from '@ai-sdk/provider-utils';
import { z } from 'zod';

export const RequestyErrorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string(),
    param: z.any().nullable(),
    code: z.string().nullable(),
  }),
});

export type RequestyErrorData = z.infer<typeof RequestyErrorResponseSchema>;

export const requestyFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: RequestyErrorResponseSchema,
  errorToMessage: (data) => data.error.message,
});
