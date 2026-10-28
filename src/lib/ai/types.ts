export interface ModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  thoughtTokens?: number;
  cachedTokens?: number;
}
export interface ProviderResult {
  content: string;
  usage?: TokenUsage;
  modelVersion?: string;
}
export interface Provider {
  complete(messages: ModelMessage[]): Promise<ProviderResult>;
}
