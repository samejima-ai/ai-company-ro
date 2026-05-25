import type { DatabaseSync } from "node:sqlite";
import type { MemoryStore } from "../../spec/api-signatures";
import type { MemoryEntry, MemoryKind, Snowflake, UserProfile } from "../../spec/domain";

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

interface MemoryRow {
  id: string;
  user_id: string;
  kind: string;
  content: string;
  created_at: string;
}

/** F3 記憶層の SQLite 実装。`MemoryStore` の背後に閉じ、将来ベクタDBへ差し替え可能。 */
export class SqliteMemoryStore implements MemoryStore {
  constructor(private readonly db: DatabaseSync) {}

  async getProfile(userId: Snowflake): Promise<UserProfile | null> {
    const row = this.db.prepare("SELECT * FROM user_profile WHERE user_id = ?").get(userId) as
      | ProfileRow
      | undefined;
    if (!row) return null;
    return {
      userId: row.user_id,
      displayName: row.display_name,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
    };
  }

  async upsertProfile(profile: UserProfile): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO user_profile (user_id, display_name, first_seen_at, last_seen_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           display_name = excluded.display_name,
           last_seen_at = excluded.last_seen_at`,
      )
      .run(profile.userId, profile.displayName, profile.firstSeenAt, profile.lastSeenAt);
  }

  async listMemories(userId: Snowflake, kinds?: MemoryKind[]): Promise<MemoryEntry[]> {
    let rows: MemoryRow[];
    if (kinds && kinds.length > 0) {
      const placeholders = kinds.map(() => "?").join(", ");
      rows = this.db
        .prepare(
          `SELECT * FROM memory_entry WHERE user_id = ? AND kind IN (${placeholders})
           ORDER BY created_at ASC`,
        )
        .all(userId, ...kinds) as unknown as MemoryRow[];
    } else {
      rows = this.db
        .prepare("SELECT * FROM memory_entry WHERE user_id = ? ORDER BY created_at ASC")
        .all(userId) as unknown as MemoryRow[];
    }
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      kind: r.kind as MemoryKind,
      content: r.content,
      createdAt: r.created_at,
    }));
  }

  async addMemory(entry: MemoryEntry): Promise<void> {
    this.db
      .prepare(
        "INSERT INTO memory_entry (id, user_id, kind, content, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(entry.id, entry.userId, entry.kind, entry.content, entry.createdAt);
  }

  /** 上限超過時、最古の「非 confession」から削除する（confession は保持優先）。 */
  async pruneMemories(userId: Snowflake, limit: number): Promise<void> {
    const count = (
      this.db.prepare("SELECT COUNT(*) AS c FROM memory_entry WHERE user_id = ?").get(userId) as {
        c: number;
      }
    ).c;
    const excess = count - limit;
    if (excess <= 0) return;
    this.db
      .prepare(
        `DELETE FROM memory_entry WHERE id IN (
           SELECT id FROM memory_entry
           WHERE user_id = ? AND kind != 'confession'
           ORDER BY created_at ASC
           LIMIT ?
         )`,
      )
      .run(userId, excess);
  }

  /** ユーザー削除要求: profile/memory/log を同一トランザクションで物理削除する。 */
  async purgeUser(userId: Snowflake): Promise<void> {
    this.db.exec("BEGIN");
    try {
      this.db.prepare("DELETE FROM memory_entry WHERE user_id = ?").run(userId);
      this.db.prepare("DELETE FROM interaction_log WHERE user_id = ?").run(userId);
      this.db.prepare("DELETE FROM user_profile WHERE user_id = ?").run(userId);
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }
}
