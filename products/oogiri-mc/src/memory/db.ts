import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { DatabaseSync } from "node:sqlite";

// node:sqlite は新しめの組み込みモジュール。一部のバンドラ/テストランナーが静的解決に
// 失敗するため、ランタイム require で読む（型は type-only import から取得）。
interface SqliteModule {
  DatabaseSync: new (path: string) => DatabaseSync;
}
const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync: DatabaseSyncImpl } = nodeRequire("node:sqlite") as SqliteModule;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS user_profile (
  user_id      TEXT PRIMARY KEY,
  display_name TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_entry (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  kind       TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memory_user ON memory_entry(user_id, created_at);

CREATE TABLE IF NOT EXISTS interaction_log (
  id                 TEXT PRIMARY KEY,
  guild_id           TEXT NOT NULL,
  channel_id         TEXT NOT NULL,
  user_id            TEXT NOT NULL,
  inbound            TEXT NOT NULL,
  injected_memory_ids TEXT NOT NULL,
  route_tier         TEXT NOT NULL,
  model_id           TEXT NOT NULL,
  outbound           TEXT NOT NULL,
  ingress_verdict    TEXT NOT NULL,
  egress_verdict     TEXT NOT NULL,
  latency_ms         INTEGER NOT NULL,
  error              TEXT,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_log_user ON interaction_log(user_id, created_at);
`;

/**
 * SQLite データベースを開き、スキーマを適用して返す。
 * `:memory:` を渡せばインメモリ（テスト用）。ファイルパスなら親ディレクトリを自動作成する。
 */
export function openDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSyncImpl(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return db;
}
