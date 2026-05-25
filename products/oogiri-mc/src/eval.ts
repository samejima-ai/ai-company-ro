import "dotenv/config";
import type { DatabaseSync } from "node:sqlite";
import { loadEnv } from "./config";
import { openDatabase } from "./memory/db";

export interface EvalMetrics {
  totalInteractions: number;
  uniqueUsers: number;
  avgInteractionsPerUser: number;
  /** 入口 or 出口でブロックした件数（安全違反の検出数）。Phase 0 の主指標のひとつ。 */
  safetyBlocks: number;
  errorCount: number;
  latencyMsP50: number;
  latencyMsP95: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

/**
 * F6: 全ログから複合指標を算出する（目的関数は投げ銭単独にしない）。
 * 改善ループの「自動 eval」部分。反映は人間ゲート（PR）経由でのみ行う。
 */
export function computeMetrics(db: DatabaseSync): EvalMetrics {
  const total = (db.prepare("SELECT COUNT(*) AS c FROM interaction_log").get() as { c: number }).c;
  const uniqueUsers = (
    db.prepare("SELECT COUNT(DISTINCT user_id) AS c FROM interaction_log").get() as { c: number }
  ).c;
  const errorCount = (
    db.prepare("SELECT COUNT(*) AS c FROM interaction_log WHERE error IS NOT NULL").get() as {
      c: number;
    }
  ).c;

  const rows = db
    .prepare("SELECT ingress_verdict, egress_verdict, latency_ms FROM interaction_log")
    .all() as unknown as { ingress_verdict: string; egress_verdict: string; latency_ms: number }[];

  let safetyBlocks = 0;
  const latencies: number[] = [];
  for (const r of rows) {
    const ingress = JSON.parse(r.ingress_verdict) as { allowed: boolean };
    const egress = JSON.parse(r.egress_verdict) as { allowed: boolean };
    if (!ingress.allowed || !egress.allowed) safetyBlocks += 1;
    latencies.push(r.latency_ms);
  }
  latencies.sort((a, b) => a - b);

  return {
    totalInteractions: total,
    uniqueUsers,
    avgInteractionsPerUser: uniqueUsers === 0 ? 0 : total / uniqueUsers,
    safetyBlocks,
    errorCount,
    latencyMsP50: percentile(latencies, 50),
    latencyMsP95: percentile(latencies, 95),
  };
}

async function main(): Promise<void> {
  const env = loadEnv();
  const db = openDatabase(env.DB_PATH);
  const metrics = computeMetrics(db);
  db.close();
  console.log(JSON.stringify(metrics, null, 2));
}

// 直接実行時のみ走らせる（import 時は走らせない）。
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[eval] 失敗:", err);
    process.exitCode = 1;
  });
}
