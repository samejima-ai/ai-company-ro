import type { Moderator } from "../../spec/api-signatures";
import type { ModerationStage, ModerationVerdict } from "../../spec/domain";
import { EGRESS_RULES, INGRESS_RULES, type PatternRule } from "./patterns";

/** カテゴリごとのキャラ崩しすぎない安全定型。self_harm のみ茶化さず窓口へ誘導する。 */
const FALLBACKS = {
  self_harm_method:
    "それ、茶化す気にはなれないな。いまは専門の窓口を頼ってくれ。お題はまた今度でいい。",
  default: "それは俺の管轄外。別の球、投げてこい。",
} as const;

function fallbackFor(categories: string[]): string {
  if (categories.includes("self_harm_method")) return FALLBACKS.self_harm_method;
  return FALLBACKS.default;
}

function applyRules(rules: PatternRule[], text: string): string[] {
  const hit = new Set<string>();
  for (const rule of rules) {
    if (rule.test.test(text)) hit.add(rule.category);
  }
  return [...hit];
}

function verdict(stage: ModerationStage, categories: string[]): ModerationVerdict {
  const allowed = categories.length === 0;
  return {
    stage,
    allowed,
    categories,
    safeFallback: allowed ? null : fallbackFor(categories),
  };
}

/**
 * 決定論的ルール層のモデレーター（一次フィルタ・常時 ON）。例外を投げない設計。
 * 微妙な操作の主防御は persona と LLM 補助層（{@link LlmModerator}）。
 */
export class RuleModerator implements Moderator {
  async checkIngress(input: { userMessage: string }): Promise<ModerationVerdict> {
    return verdict("ingress", applyRules(INGRESS_RULES, input.userMessage));
  }

  async checkEgress(input: { candidate: string; userMessage: string }): Promise<ModerationVerdict> {
    return verdict("egress", applyRules(EGRESS_RULES, input.candidate));
  }
}

/**
 * 複数のモデレーターを直列合成する。いずれかが block すれば block。
 * **fail-closed**: どれかが例外を投げたら「通さない」側に倒す（安全定型に差し替え）。
 */
export class LayeredModerator implements Moderator {
  constructor(private readonly layers: Moderator[]) {}

  private async run(
    stage: ModerationStage,
    call: (m: Moderator) => Promise<ModerationVerdict>,
  ): Promise<ModerationVerdict> {
    const categories = new Set<string>();
    for (const layer of this.layers) {
      try {
        const v = await call(layer);
        if (!v.allowed) {
          for (const c of v.categories) categories.add(c);
        }
      } catch {
        // fail-closed: モデレーション機構自体の失敗は block 扱い
        categories.add("moderator_error");
      }
    }
    return verdict(stage, [...categories]);
  }

  async checkIngress(input: { userMessage: string }): Promise<ModerationVerdict> {
    return this.run("ingress", (m) => m.checkIngress(input));
  }

  async checkEgress(input: { candidate: string; userMessage: string }): Promise<ModerationVerdict> {
    return this.run("egress", (m) => m.checkEgress(input));
  }
}
