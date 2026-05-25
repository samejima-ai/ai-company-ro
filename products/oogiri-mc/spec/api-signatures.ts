// L0-3 API 契約（簡易モード, 内部インターフェース署名のみ） — ヤジ
//
// 公開 API は持たない（bot は外部 API の consumer）。
// ここで定義するのはアプリ内部のモジュール境界。外部依存（Discord/LLM/ストア）を
// この署名の背後に隠し、差し替えと将来の realtime-pubsub 移行を可能にする。
// 実装は src/ 配下で行う（L1）。

import type {
  InteractionLog,
  MemoryEntry,
  MemoryKind,
  ModerationVerdict,
  RouteTier,
  Snowflake,
  UserProfile,
} from "./domain";

/** F3 記憶層。MVP は SQLite 実装。ベクタDBへ差し替え可能なよう抽象化する。 */
export interface MemoryStore {
  getProfile(userId: Snowflake): Promise<UserProfile | null>;
  upsertProfile(profile: UserProfile): Promise<void>;
  /** kind 絞り込み可。F2 は INJECTABLE_MEMORY_KINDS のみ取得して注入する。 */
  listMemories(userId: Snowflake, kinds?: MemoryKind[]): Promise<MemoryEntry[]>;
  addMemory(entry: MemoryEntry): Promise<void>;
  /** 上限超過時の刈り取り（最古の非 confession から削除）。 */
  pruneMemories(userId: Snowflake, limit: number): Promise<void>;
  /** ユーザー削除要求: profile/memory/log を同一トランザクションで物理削除。 */
  purgeUser(userId: Snowflake): Promise<void>;
}

/** F5 ログ。F6 改善ループが読む。 */
export interface InteractionLogStore {
  append(log: InteractionLog): Promise<void>;
}

/** F2 モデルルーター。プロバイダ非固定。 */
export interface ModelRouter {
  /** お題と注入記憶から振り分け先 tier を決める。 */
  decideTier(input: { prompt: string; hasTip: boolean; hint?: "complex" | "safety" }): RouteTier;
  /** system prompt（personas/ 正本）＋ context で 1 応答を生成。 */
  generate(input: {
    systemPrompt: string;
    userMessage: string;
    injectedMemories: MemoryEntry[];
    tier: RouteTier;
  }): Promise<{ text: string; modelId: string }>;
}

/** F4 入出力モデレーション。fail-closed（失敗時は allowed=false 側）。 */
export interface Moderator {
  /** 入口: モデルに渡す前。インジェクション・未成年疑い・NGトピック。 */
  checkIngress(input: { userMessage: string }): Promise<ModerationVerdict>;
  /** 出口: 送信前。ペルソナ逸脱・有害・反面教師手口。 */
  checkEgress(input: { candidate: string; userMessage: string }): Promise<ModerationVerdict>;
}

/** F1 Discord 送受信の薄いアダプタ。テスト時はモックに差し替える。 */
export interface ChatGateway {
  /** typing インジケータ表示（任意）。 */
  startTyping(channelId: Snowflake): Promise<void>;
  send(channelId: Snowflake, text: string): Promise<void>;
}

/** persona 正本（personas/riko_system_prompt.md）の読み込み。コードに二重定義しない。 */
export interface PersonaProvider {
  /** ```text フェンス内の system prompt 本文を返す。 */
  getSystemPrompt(): Promise<string>;
}
