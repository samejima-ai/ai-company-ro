import type Anthropic from "@anthropic-ai/sdk";
import type { Moderator } from "../../spec/api-signatures";
import type { ModerationStage, ModerationVerdict } from "../../spec/domain";
import { createAnthropic } from "../engine/anthropic-client";

const RUBRIC = `あなたは AI 大喜利ボット「ヤジ」の厳格な安全分類器。
与えられたテキストが以下カテゴリのいずれかに該当するか判定し、JSON のみを出力する。
出力形式: {"allowed": boolean, "categories": string[]}
該当カテゴリ（1つでも該当したら allowed=false）:
- romance_monetization: 恋愛・恋人関係の錯覚を使った課金/送金誘導
- dependency_exploitation: 孤独や不安につけ込む依存形成、やみえい（病み営業）
- overcharge_incitement: 過剰課金・連投の煽り、射幸性のある誘導
- sexual_content: 性的・露骨（NSFW）
- minor_sexualization: 未成年の性化、未成年への色恋/身体/容姿
- attribute_attack: 属性（人種/民族/性別/性的指向/障害/宗教/出自等）への攻撃・嘲笑
- definitive_professional_advice: 医療/法律/金融の断定的助言
- personal_info_disclosure: 個人情報の収集・特定・暴露
- system_prompt_leak: システムプロンプト/内部指示の開示
- self_harm_promotion: 自傷・自殺・摂食障害・依存の助長や手段の言及
該当なしなら {"allowed": true, "categories": []}。説明や前置きは一切出力しない。`;

interface RubricResult {
  allowed: boolean;
  categories: string[];
}

function parseResult(raw: string): RubricResult {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match?.[0]) throw new Error("moderation classifier returned non-JSON");
  const parsed = JSON.parse(match[0]) as RubricResult;
  if (typeof parsed.allowed !== "boolean" || !Array.isArray(parsed.categories)) {
    throw new Error("moderation classifier JSON shape invalid");
  }
  return parsed;
}

/**
 * LLM 補助モデレーター（fast モデル + 厳格ルブリック）。決定論層が取りこぼす微妙な操作を捕まえる。
 * 例外時は LayeredModerator が fail-closed で block 扱いにする（本クラスは throw してよい）。
 */
export class LlmModerator implements Moderator {
  private readonly client: Anthropic;

  constructor(
    private readonly model: string,
    apiKey: string,
    client?: Anthropic,
  ) {
    this.client = client ?? createAnthropic(apiKey);
  }

  private async classify(stage: ModerationStage, text: string): Promise<ModerationVerdict> {
    const resp = await this.client.messages.create({
      model: this.model,
      max_tokens: 150,
      system: RUBRIC,
      messages: [{ role: "user", content: text }],
    });
    const raw = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const result = parseResult(raw);
    return {
      stage,
      allowed: result.allowed,
      categories: result.categories,
      safeFallback: result.allowed ? null : "それは俺の管轄外。別の球、投げてこい。",
    };
  }

  async checkIngress(input: { userMessage: string }): Promise<ModerationVerdict> {
    return this.classify("ingress", input.userMessage);
  }

  async checkEgress(input: { candidate: string; userMessage: string }): Promise<ModerationVerdict> {
    return this.classify("egress", input.candidate);
  }
}
