// L0-2 ドメインモデル（完全モード, Zod + TypeScript） — ヤジ
//
// 記憶層（F3）とログ（F5）の永続化スキーマの「正本」。
// src/ の実装と tests/ はここから型・スキーマを import する。
// ストアは MVP では SQLite だが、本ファイルは特定ストアに依存しない（純粋なドメイン定義）。

import { z } from "zod";

/** Discord のユーザー/メッセージ/ギルド ID は snowflake 文字列。 */
export const Snowflake = z.string().regex(/^\d{5,30}$/, "must be a Discord snowflake");
export type Snowflake = z.infer<typeof Snowflake>;

/**
 * 記憶の種別。
 * - nickname:     呼び名（見せ場づくりに使う）
 * - running_gag:  鉄板ネタ（見せ場づくりに使う）
 * - confession:   打ち明け話（悩み・健康・個人事情）。**営業・いじりに転用しない**（F2 注入で除外）
 * - tip_history:  課金履歴（Phase 1 以降。Phase 0 では生成されない）
 */
export const MemoryKind = z.enum(["nickname", "running_gag", "confession", "tip_history"]);
export type MemoryKind = z.infer<typeof MemoryKind>;

/** F2 の context 組み立てで「注入してよい」kind（confession と tip_history を除外）。 */
export const INJECTABLE_MEMORY_KINDS: readonly MemoryKind[] = ["nickname", "running_gag"];

/** 1 ユーザーあたり MemoryEntry の既定上限（超過時は最古の非 confession を削除）。 */
export const MEMORY_ENTRY_LIMIT = 200;

export const UserProfile = z.object({
  userId: Snowflake,
  /** 表示上の呼び名。未設定なら null。 */
  displayName: z.string().min(1).max(80).nullable(),
  firstSeenAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserProfile>;

export const MemoryEntry = z.object({
  id: z.string().uuid(),
  userId: Snowflake,
  kind: MemoryKind,
  /** 記憶の内容（自由テキスト）。 */
  content: z.string().min(1).max(2000),
  createdAt: z.string().datetime(),
});
export type MemoryEntry = z.infer<typeof MemoryEntry>;

/** モデルルーターの振り分け結果。 */
export const RouteTier = z.enum(["fast", "heavy"]);
export type RouteTier = z.infer<typeof RouteTier>;

/** モデレーション判定。 */
export const ModerationStage = z.enum(["ingress", "egress"]);
export type ModerationStage = z.infer<typeof ModerationStage>;

export const ModerationVerdict = z.object({
  stage: ModerationStage,
  allowed: z.boolean(),
  /** 該当した DONT.md / red-team カテゴリ（allowed=false のとき非空）。 */
  categories: z.array(z.string()),
  /** allowed=false のときに送る安全定型（キャラのままかわす）。 */
  safeFallback: z.string().nullable(),
});
export type ModerationVerdict = z.infer<typeof ModerationVerdict>;

/** F5 全ログ保存の 1 行。改善ループ（F6）の入力。 */
export const InteractionLog = z.object({
  id: z.string().uuid(),
  guildId: Snowflake,
  channelId: Snowflake,
  userId: Snowflake,
  /** 受信メッセージ本文（先頭規定長まで）。 */
  inbound: z.string(),
  /** F2 が注入した記憶 entry の id 群（参照のみ・本文は重複保存しない）。 */
  injectedMemoryIds: z.array(z.string().uuid()),
  routeTier: RouteTier,
  /** 使用モデル識別子（プロバイダ非固定なので文字列）。 */
  modelId: z.string(),
  /** 生成テキスト（出口モデレーション後に実際に送ったもの。差し替え時は定型）。 */
  outbound: z.string(),
  ingressVerdict: ModerationVerdict,
  egressVerdict: ModerationVerdict,
  /** 受信から送信開始までのレイテンシ（ミリ秒）。 */
  latencyMs: z.number().int().nonnegative(),
  /** 失敗時のエラー要約（成功時は null）。 */
  error: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type InteractionLog = z.infer<typeof InteractionLog>;
