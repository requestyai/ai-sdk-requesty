// Type for Requesty Cache Control following Anthropic's pattern
export type RequestyCacheControl = { type: 'ephemeral' };

export type RequestyChatPrompt = Array<ChatCompletionMessageParam>;

export type ChatCompletionMessageParam =
  | ChatCompletionSystemMessageParam
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam
  | ChatCompletionToolMessageParam;

export interface ChatCompletionSystemMessageParam {
  role: 'system';
  content: string;
  cache_control?: RequestyCacheControl;
}

export interface ChatCompletionUserMessageParam {
  role: 'user';
  content: string | Array<ChatCompletionContentPart>;
  cache_control?: RequestyCacheControl;
}

export type ChatCompletionContentPart =
  | ChatCompletionContentPartText
  | ChatCompletionContentPartImage;

export interface ChatCompletionContentPartImage {
  type: 'image_url';
  image_url: {
    url: string;
  };
  cache_control?: RequestyCacheControl;
}

export interface ChatCompletionContentPartText {
  type: 'text';
  text: string;
  cache_control?: RequestyCacheControl;
}

export interface ChatCompletionAssistantMessageParam {
  role: 'assistant';
  content?: string | null;
  tool_calls?: Array<ChatCompletionMessageToolCall>;
  cache_control?: RequestyCacheControl;
}

export interface ChatCompletionMessageToolCall {
  type: 'function';
  id: string;
  function: {
    arguments: string;
    name: string;
  };
}

export interface ChatCompletionToolMessageParam {
  role: 'tool';
  content: string;
  tool_call_id: string;
  cache_control?: RequestyCacheControl;
}
