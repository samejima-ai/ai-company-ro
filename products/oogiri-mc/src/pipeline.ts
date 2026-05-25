import type {
  ChatGateway,
  InteractionLogStore,
  MemoryStore,
  ModelRouter,
  Moderator,
  PersonaProvider,
} from "../spec/api-signatures";
import {
  INJECTABLE_MEMORY_KINDS,
  type InteractionLog,
  MEMORY_ENTRY_LIMIT,
  type ModerationStage,
  type ModerationVerdict,
  type RouteTier,
} from "../spec/domain";

export interface PipelineDeps {
  persona: PersonaProvider;
  memory: MemoryStore;
  logs: InteractionLogStore;
  router: ModelRouter;
  moderator: Moderator;
  /** テスト用の注入点。 */
  now?: () => Date;
  newId?: () => string;
}

export interface InboundMessage {
  guildId: string;
  channelId: string;
  userId: string;
  displayName: string | null;
  content: string;
  hasTip: boolean;
}

export interface PipelineResult {
  reply: string;
  /** 出口 or 入口で安全に差し替えたか。 */
  blocked: boolean;
  errored: boolean;
}

const APOLOGY = "いま頭ショートした。もう一回、球投げて。";
const EMPTY_INPUT = "お題が空っぽだぞ。なんか投げてこい。";

function notEvaluated(stage: ModerationStage): ModerationVerdict {
  return { stage, allowed: true, categories: [], safeFallback: null };
}

/** モデレーション呼び出しを fail-closed でラップする（機構失敗は block 扱い）。 */
async function safeModerate(
  stage: ModerationStage,
  call: () => Promise<ModerationVerdict>,
): Promise<ModerationVerdict> {
  try {
    return await call();
  } catch {
    return {
      stage,
      allowed: false,
      categories: ["moderator_error"],
      safeFallback: "ちょっと待った、いまの無し。別の球で。",
    };
  }
}

/**
 * F1〜F5 のリアルタイム経路のコア（純粋・I/O 非依存）。
 * Discord 送信は呼び出し側（ChatGateway）が担う。本関数はログ追記まで行い結果を返す。
 */
export async function handleMessage(
  deps: PipelineDeps,
  msg: InboundMessage,
): Promise<PipelineResult> {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const startedAt = now().getTime();
  const nowIso = now().toISOString();

  // プロフィール upsert（呼び名・初回/最終観測）
  const existing = await deps.memory.getProfile(msg.userId);
  await deps.memory.upsertProfile({
    userId: msg.userId,
    displayName: msg.displayName ?? existing?.displayName ?? null,
    firstSeenAt: existing?.firstSeenAt ?? nowIso,
    lastSeenAt: nowIso,
  });

  const trimmed = msg.content.trim();

  const finish = async (
    reply: string,
    opts: {
      blocked: boolean;
      errored: boolean;
      tier: RouteTier;
      modelId: string;
      ingress: ModerationVerdict;
      egress: ModerationVerdict;
      injectedMemoryIds: string[];
      error: string | null;
    },
  ): Promise<PipelineResult> => {
    const log: InteractionLog = {
      id: newId(),
      guildId: msg.guildId,
      channelId: msg.channelId,
      userId: msg.userId,
      inbound: msg.content,
      injectedMemoryIds: opts.injectedMemoryIds,
      routeTier: opts.tier,
      modelId: opts.modelId,
      outbound: reply,
      ingressVerdict: opts.ingress,
      egressVerdict: opts.egress,
      latencyMs: Math.max(0, now().getTime() - startedAt),
      error: opts.error,
      createdAt: nowIso,
    };
    await deps.logs.append(log);
    return { reply, blocked: opts.blocked, errored: opts.errored };
  };

  if (trimmed.length === 0) {
    return finish(EMPTY_INPUT, {
      blocked: false,
      errored: false,
      tier: "fast",
      modelId: "(none)",
      ingress: notEvaluated("ingress"),
      egress: notEvaluated("egress"),
      injectedMemoryIds: [],
      error: null,
    });
  }

  // 入口モデレーション
  const ingress = await safeModerate("ingress", () =>
    deps.moderator.checkIngress({ userMessage: trimmed }),
  );
  if (!ingress.allowed) {
    return finish(ingress.safeFallback ?? "それは管轄外。別の球で。", {
      blocked: true,
      errored: false,
      tier: "fast",
      modelId: "(blocked-ingress)",
      ingress,
      egress: notEvaluated("egress"),
      injectedMemoryIds: [],
      error: null,
    });
  }

  // 記憶注入（confession は INJECTABLE_MEMORY_KINDS に含めない＝営業/いじりに使わない）
  const memories = await deps.memory.listMemories(msg.userId, [...INJECTABLE_MEMORY_KINDS]);
  await deps.memory.pruneMemories(msg.userId, MEMORY_ENTRY_LIMIT);
  const injectedMemoryIds = memories.map((m) => m.id);

  const systemPrompt = await deps.persona.getSystemPrompt();
  const tier = deps.router.decideTier({ prompt: trimmed, hasTip: msg.hasTip });

  let candidate: { text: string; modelId: string };
  try {
    candidate = await deps.router.generate({
      systemPrompt,
      userMessage: trimmed,
      injectedMemories: memories,
      tier,
    });
  } catch (err) {
    return finish(APOLOGY, {
      blocked: false,
      errored: true,
      tier,
      modelId: "(error)",
      ingress,
      egress: notEvaluated("egress"),
      injectedMemoryIds,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 出口モデレーション → NG なら再生成1回 → なお NG なら安全定型
  let egress = await safeModerate("egress", () =>
    deps.moderator.checkEgress({ candidate: candidate.text, userMessage: trimmed }),
  );
  if (!egress.allowed) {
    try {
      const retry = await deps.router.generate({
        systemPrompt,
        userMessage: trimmed,
        injectedMemories: memories,
        tier: "heavy",
      });
      const egress2 = await safeModerate("egress", () =>
        deps.moderator.checkEgress({ candidate: retry.text, userMessage: trimmed }),
      );
      if (egress2.allowed) {
        return finish(retry.text, {
          blocked: false,
          errored: false,
          tier: "heavy",
          modelId: retry.modelId,
          ingress,
          egress: egress2,
          injectedMemoryIds,
          error: null,
        });
      }
      egress = egress2;
    } catch {
      // 再生成失敗 → 安全定型へ
    }
    return finish(egress.safeFallback ?? "いまのは無し。別の球で。", {
      blocked: true,
      errored: false,
      tier,
      modelId: candidate.modelId,
      ingress,
      egress,
      injectedMemoryIds,
      error: null,
    });
  }

  return finish(candidate.text, {
    blocked: false,
    errored: false,
    tier,
    modelId: candidate.modelId,
    ingress,
    egress,
    injectedMemoryIds,
    error: null,
  });
}

/** F1: 応答対象か判定（bot/自己発言は除外、メンション or 対象チャンネル）。 */
export function shouldRespond(input: {
  authorIsBot: boolean;
  mentionedBot: boolean;
  channelId: string;
  watchedChannelIds: string[];
}): boolean {
  if (input.authorIsBot) return false;
  if (input.mentionedBot) return true;
  return input.watchedChannelIds.includes(input.channelId);
}

/** typing 表示込みで応答を送る薄いユースケース（I/O は ChatGateway に委譲）。 */
export async function respondAndSend(
  deps: PipelineDeps & { gateway: ChatGateway },
  msg: InboundMessage,
): Promise<PipelineResult> {
  await deps.gateway.startTyping(msg.channelId);
  const result = await handleMessage(deps, msg);
  await deps.gateway.send(msg.channelId, result.reply);
  return result;
}
