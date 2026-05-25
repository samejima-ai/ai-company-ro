import Anthropic from "@anthropic-ai/sdk";

export interface ModelConfig {
  apiKey: string;
  fastModel: string;
  heavyModel: string;
}

/** 既定モデル（プロバイダ非固定・env で差し替え可能）。難所のみ heavy にエスカレーション。 */
export const DEFAULT_FAST_MODEL = "claude-haiku-4-5-20251001";
export const DEFAULT_HEAVY_MODEL = "claude-sonnet-4-6";

export function resolveModelConfig(env: {
  LLM_API_KEY?: string;
  MODEL_FAST?: string;
  MODEL_HEAVY?: string;
}): ModelConfig {
  return {
    apiKey: env.LLM_API_KEY ?? "",
    fastModel: env.MODEL_FAST || DEFAULT_FAST_MODEL,
    heavyModel: env.MODEL_HEAVY || DEFAULT_HEAVY_MODEL,
  };
}

export function createAnthropic(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}
