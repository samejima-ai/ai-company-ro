import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import type { Moderator } from "../spec/api-signatures";
import { loadEnv, parseChannelIds } from "./config";
import { DiscordChatGateway } from "./discord/gateway";
import { resolveModelConfig } from "./engine/anthropic-client";
import { AnthropicModelRouter } from "./engine/model-router";
import { openDatabase } from "./memory/db";
import { SqliteInteractionLogStore } from "./memory/log-store";
import { SqliteMemoryStore } from "./memory/memory-store";
import { LlmModerator } from "./moderation/llm-moderator";
import { LayeredModerator, RuleModerator } from "./moderation/moderator";
import { createPersonaProvider } from "./persona";
import { type PipelineDeps, respondAndSend, shouldRespond } from "./pipeline";

/**
 * MVP Phase 0 のエントリ。F1〜F6 を配線する。
 * - DISCORD_TOKEN 未設定なら接続せず終了（scaffold スモーク）。
 * - 投げ銭は Phase 1 のため hasTip=false 固定（最優先キューは未実装）。
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const watched = parseChannelIds(env);
  const persona = createPersonaProvider(env.PERSONA_PATH);
  const systemPrompt = await persona.getSystemPrompt();
  console.log(
    `[ヤジ] persona loaded (${systemPrompt.length} chars), watching ${watched.length} channel(s)`,
  );

  if (!env.DISCORD_TOKEN) {
    console.log("[ヤジ] DISCORD_TOKEN 未設定。接続せず終了する（scaffold スモーク用）。");
    return;
  }

  const modelConfig = resolveModelConfig(env);
  if (!modelConfig.apiKey) {
    console.warn("[ヤジ] LLM_API_KEY 未設定。生成は失敗し詫び応答になる。.env を確認せよ。");
  }

  const db = openDatabase(env.DB_PATH);
  const memory = new SqliteMemoryStore(db);
  const logs = new SqliteInteractionLogStore(db);
  const router = new AnthropicModelRouter(modelConfig);

  const layers: Moderator[] = [new RuleModerator()];
  if (modelConfig.apiKey) {
    layers.push(new LlmModerator(modelConfig.fastModel, modelConfig.apiKey));
  }
  const moderator = new LayeredModerator(layers);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });
  const gateway = new DiscordChatGateway(client);
  const deps: PipelineDeps & { gateway: DiscordChatGateway } = {
    persona,
    memory,
    logs,
    router,
    moderator,
    gateway,
  };

  client.once(Events.ClientReady, (c) => console.log(`[ヤジ] ready as ${c.user.tag}`));

  client.on(Events.MessageCreate, async (message) => {
    try {
      const mentionedBot = client.user ? message.mentions.has(client.user.id) : false;
      const respond = shouldRespond({
        authorIsBot: message.author.bot,
        mentionedBot,
        channelId: message.channelId,
        watchedChannelIds: watched,
      });
      if (!respond) return;
      await respondAndSend(deps, {
        guildId: message.guildId ?? "0",
        channelId: message.channelId,
        userId: message.author.id,
        displayName: message.author.username ?? null,
        content: message.content,
        hasTip: false,
      });
    } catch (err) {
      console.error("[ヤジ] handler error:", err);
    }
  });

  await client.login(env.DISCORD_TOKEN);
}

main().catch((err) => {
  console.error("[ヤジ] 起動失敗:", err);
  process.exitCode = 1;
});
