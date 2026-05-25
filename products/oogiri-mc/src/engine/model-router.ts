import type Anthropic from "@anthropic-ai/sdk";
import type { ModelRouter } from "../../spec/api-signatures";
import type { MemoryEntry, RouteTier } from "../../spec/domain";
import { type ModelConfig, createAnthropic } from "./anthropic-client";

const HEAVY_LENGTH_THRESHOLD = 400;

/** 注入記憶を context ブロック化（confession は呼び出し側で既に除外済みの前提）。 */
export function buildMemoryContext(memories: MemoryEntry[]): string | null {
  if (memories.length === 0) return null;
  const lines = memories.map((m) => `- (${m.kind}) ${m.content}`);
  return `# この相手について覚えていること（見せ場づくりに使う）\n${lines.join("\n")}`;
}

/** F2 モデルルーター（Anthropic 実装）。通常=fast、難所のみ heavy。 */
export class AnthropicModelRouter implements ModelRouter {
  private readonly client: Anthropic;

  constructor(
    private readonly config: ModelConfig,
    client?: Anthropic,
  ) {
    this.client = client ?? createAnthropic(config.apiKey);
  }

  decideTier(input: { prompt: string; hasTip: boolean; hint?: "complex" | "safety" }): RouteTier {
    if (input.hasTip) return "heavy";
    if (input.hint === "complex" || input.hint === "safety") return "heavy";
    if (input.prompt.length > HEAVY_LENGTH_THRESHOLD) return "heavy";
    return "fast";
  }

  async generate(input: {
    systemPrompt: string;
    userMessage: string;
    injectedMemories: MemoryEntry[];
    tier: RouteTier;
  }): Promise<{ text: string; modelId: string }> {
    const model = input.tier === "heavy" ? this.config.heavyModel : this.config.fastModel;
    const memoryContext = buildMemoryContext(input.injectedMemories);

    // NOTE: system prompt は不変なので prompt caching の好適候補。SDK バージョン更新時に
    // cache_control（ephemeral）を付与する余地あり（DELIVERY 申し送り）。
    const system: Anthropic.TextBlockParam[] = [{ type: "text", text: input.systemPrompt }];
    if (memoryContext) {
      system.push({ type: "text", text: memoryContext });
    }

    const resp = await this.client.messages.create({
      model,
      max_tokens: 400,
      system,
      messages: [{ role: "user", content: input.userMessage }],
    });

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return { text, modelId: resp.model };
  }
}
