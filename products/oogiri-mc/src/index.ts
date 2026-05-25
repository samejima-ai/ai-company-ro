import "dotenv/config";
import { loadEnv, parseChannelIds } from "./config";
import { loadSystemPrompt } from "./persona";

/**
 * MVP Phase 0 のエントリ（scaffold）。
 * 現時点では「設定が読める・persona 正本が読める」までを保証する起動健全性チェック。
 * F1〜F6 の本実装（discord.js 配線・モデルルーター・記憶・モデレーション・ログ）は L1。
 * 実装は spec/api-signatures.ts のインターフェース
 * （ChatGateway / ModelRouter / Moderator / MemoryStore / InteractionLogStore / PersonaProvider）
 * の背後に閉じること。
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const channels = parseChannelIds(env);
  const systemPrompt = await loadSystemPrompt(env.PERSONA_PATH);

  console.log(
    `[ヤジ] persona loaded (${systemPrompt.length} chars), watching ${channels.length} channel(s)`,
  );

  if (!env.DISCORD_TOKEN) {
    console.log("[ヤジ] DISCORD_TOKEN 未設定。接続せず終了する（scaffold スモーク用）。");
    return;
  }

  // TODO(L1): discord.js クライアントに接続し、SPEC.md F1〜F6 を配線する。
  console.log("[ヤジ] DISCORD_TOKEN 検出。Discord 配線は L1 で実装する。");
}

main().catch((err) => {
  console.error("[ヤジ] 起動失敗:", err);
  process.exitCode = 1;
});
