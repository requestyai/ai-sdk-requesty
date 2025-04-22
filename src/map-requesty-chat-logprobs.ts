import type { LanguageModelV1LogProbs } from '@ai-sdk/provider';

type RequestyChatLogProbs = {
  content:
    | {
        token: string;
        logprob: number;
        top_logprobs:
          | {
              token: string;
              logprob: number;
            }[]
          | null;
      }[]
    | null;
};

export function mapRequestyChatLogProbsOutput(
  logprobs: RequestyChatLogProbs | null | undefined,
): LanguageModelV1LogProbs | undefined {
  return (
    logprobs?.content?.map(({ token, logprob, top_logprobs }) => ({
      token,
      logprob,
      topLogprobs: top_logprobs
        ? top_logprobs.map(({ token, logprob }) => ({
            token,
            logprob,
          }))
        : [],
    })) ?? undefined
  );
}
