import type { DatabaseSync } from "node:sqlite";
import type { InteractionLogStore } from "../../spec/api-signatures";
import type { InteractionLog } from "../../spec/domain";

/** F5 全ログ保存の SQLite 実装。F6 改善ループの入力。 */
export class SqliteInteractionLogStore implements InteractionLogStore {
  constructor(private readonly db: DatabaseSync) {}

  async append(log: InteractionLog): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO interaction_log (
           id, guild_id, channel_id, user_id, inbound, injected_memory_ids,
           route_tier, model_id, outbound, ingress_verdict, egress_verdict,
           latency_ms, error, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        log.id,
        log.guildId,
        log.channelId,
        log.userId,
        log.inbound,
        JSON.stringify(log.injectedMemoryIds),
        log.routeTier,
        log.modelId,
        log.outbound,
        JSON.stringify(log.ingressVerdict),
        JSON.stringify(log.egressVerdict),
        log.latencyMs,
        log.error,
        log.createdAt,
      );
  }
}
