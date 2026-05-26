import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { InteractionLog, MemoryEntry } from "../spec/domain";
import { openDatabase } from "../src/memory/db";
import { SqliteInteractionLogStore } from "../src/memory/log-store";
import { SqliteMemoryStore } from "../src/memory/memory-store";

const USER = "123456789";
let db: DatabaseSync;
let store: SqliteMemoryStore;

function entry(kind: MemoryEntry["kind"], content: string, createdAt: string): MemoryEntry {
  return { id: crypto.randomUUID(), userId: USER, kind, content, createdAt };
}

beforeEach(() => {
  db = openDatabase(":memory:");
  store = new SqliteMemoryStore(db);
});
afterEach(() => db.close());

describe("SqliteMemoryStore", () => {
  it("upsert / get プロフィール", async () => {
    await store.upsertProfile({
      userId: USER,
      displayName: "ボケ太郎",
      firstSeenAt: "2026-05-01T00:00:00.000Z",
      lastSeenAt: "2026-05-01T00:00:00.000Z",
    });
    await store.upsertProfile({
      userId: USER,
      displayName: "ボケ太郎",
      firstSeenAt: "2026-05-01T00:00:00.000Z",
      lastSeenAt: "2026-05-02T00:00:00.000Z",
    });
    const p = await store.getProfile(USER);
    expect(p?.displayName).toBe("ボケ太郎");
    expect(p?.firstSeenAt).toBe("2026-05-01T00:00:00.000Z");
    expect(p?.lastSeenAt).toBe("2026-05-02T00:00:00.000Z");
  });

  it("kind で絞り込める（confession 除外注入の土台）", async () => {
    await store.addMemory(entry("nickname", "ボケ太郎", "2026-05-01T00:00:00.000Z"));
    await store.addMemory(entry("running_gag", "毎回オチが渋滞", "2026-05-01T00:01:00.000Z"));
    await store.addMemory(entry("confession", "最近しんどい", "2026-05-01T00:02:00.000Z"));

    const injectable = await store.listMemories(USER, ["nickname", "running_gag"]);
    expect(injectable.map((m) => m.kind).sort()).toEqual(["nickname", "running_gag"]);
    expect(injectable.some((m) => m.kind === "confession")).toBe(false);

    const all = await store.listMemories(USER);
    expect(all).toHaveLength(3);
  });

  it("prune は confession を保持し最古の非 confession を削る", async () => {
    await store.addMemory(entry("confession", "秘密の悩み", "2026-05-01T00:00:00.000Z"));
    await store.addMemory(entry("nickname", "古いネタ", "2026-05-01T00:01:00.000Z"));
    await store.addMemory(entry("running_gag", "新しいネタ", "2026-05-01T00:02:00.000Z"));

    await store.pruneMemories(USER, 2);
    const remaining = await store.listMemories(USER);
    expect(remaining).toHaveLength(2);
    expect(remaining.some((m) => m.kind === "confession")).toBe(true);
    expect(remaining.some((m) => m.content === "古いネタ")).toBe(false);
  });

  it("purgeUser は profile/memory/log を消す", async () => {
    const logs = new SqliteInteractionLogStore(db);
    await store.upsertProfile({
      userId: USER,
      displayName: null,
      firstSeenAt: "2026-05-01T00:00:00.000Z",
      lastSeenAt: "2026-05-01T00:00:00.000Z",
    });
    await store.addMemory(entry("nickname", "x", "2026-05-01T00:00:00.000Z"));
    const log: InteractionLog = {
      id: crypto.randomUUID(),
      guildId: "1",
      channelId: "2",
      userId: USER,
      inbound: "hi",
      injectedMemoryIds: [],
      routeTier: "fast",
      modelId: "fake",
      outbound: "yo",
      ingressVerdict: { stage: "ingress", allowed: true, categories: [], safeFallback: null },
      egressVerdict: { stage: "egress", allowed: true, categories: [], safeFallback: null },
      latencyMs: 10,
      error: null,
      createdAt: "2026-05-01T00:00:00.000Z",
    };
    await logs.append(log);

    await store.purgeUser(USER);
    expect(await store.getProfile(USER)).toBeNull();
    expect(await store.listMemories(USER)).toHaveLength(0);
    const remainingLogs = (
      db.prepare("SELECT COUNT(*) AS c FROM interaction_log WHERE user_id = ?").get(USER) as {
        c: number;
      }
    ).c;
    expect(remainingLogs).toBe(0);
  });
});
