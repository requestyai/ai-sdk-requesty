import type { LanguageModelV1 } from '@ai-sdk/provider';

/**
 * Language models from Requesty
 */
export type RequestyLanguageModel = LanguageModelV1;

export type RequestyProviderOptions = {
  /**
   * Include reasoning in the response (when supported)
   * https://docs.requesty.ai/features/reasoning
   */
  includeReasoning?: boolean;

  /**
   * Reasoning effort (when supported)
   * - 'low', 'medium', 'high': Standard effort levels
   * - 'max': Maximum effort (Requesty-specific)
   * - String numbers (e.g., '1000'): Specific token budget
   */
  reasoningEffort?: 'low' | 'medium' | 'high' | 'max' | string;

  /**
   * A unique identifier representing your end-user, which can
   * help Requesty to monitor and detect abuse.
   */
  user?: string;

  /**
   * Extra body to pass to the API (provider specific)
   */
  extraBody?: Record<string, any>;
};

export type RequestySharedSettings = RequestyProviderOptions & {
  /**
   * List of compatible provider models to route to.
   */
  models?: string[];
};
