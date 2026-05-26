# DELIVERY.md — ヤジ Phase 0 実装献上

## 体制情報
- Mode: M2 / dev_mode: github_assisted / ARC: monolith / LC=0 / Cycle: 1（L1 初回）
- AI能力: Claude Opus 4.7
- 自律修正回数: 型/lint/sqlite-bundler/SDK-cache_control の解消で計 4 サイクル（上限内）

## 実装済み機能（SPEC.md F1〜F6・Phase 0）

| 機能 | 内容 | 主な実体 | 判定 |
|---|---|---|---|
| F1 Discord I/O | 接続・受信・逐次応答・typing・bot自己発言除外・トリガー判定・2000字丸め | src/index.ts, src/discord/gateway.ts, pipeline.ts `shouldRespond` | PASS |
| F2 対話エンジン | モデルルーター（通常=fast/難所=heavy）＋ persona 正本注入＋関連記憶注入 | src/engine/model-router.ts, src/persona.ts | PASS |
| F3 記憶層 | SQLite（node:sqlite）。kind 区別、confession 注入除外、上限prune（confession保持）、purgeUser | src/memory/* , spec/domain.ts | PASS |
| F4 モデレーション | 入口/出口の二重、fail-closed、決定論ルール層＋LLM補助層、再生成1回→安全定型 | src/moderation/* , pipeline.ts | PASS |
| F5 ログ | 全やり取りを interaction_log に保存（注入記憶ID/使用モデル/判定/レイテンシ/エラー） | src/memory/log-store.ts | PASS |
| F6 eval+改善ループ | 複合指標（会話数/一人あたり/安全ブロック数/エラー/レイテンシp50・p95）。反映は人間ゲート（PR）経由 | src/eval.ts | PASS |

補足: F1 の投げ銭最優先キュー、F2/F5 の課金履歴は **Phase 1**。Phase 0 は `hasTip=false` 固定で席のみ。

## 自己検証結果（5層検出スタック）

| 層 | 対象 | 結果 |
|---|---|---|
| Shift Left 基盤 | 型・lint・フォーマット（biome） | PASS |
| 第1層 計算的センサー | vitest 24 件（memory/moderation/pipeline/smoke） | PASS |
| 第2層 E2E 機械検証 | 該当UIなし。代替: built entry 起動スモーク＋eval CLI 実行 | PASS（代替） |
| 第3層 Interaction Cost | 該当UIなし（Discord ネイティブ）。応答 p95 は運用ログで測定 | N/A（運用時） |
| 第4層 推論的センサー | 「仕様に合う・動く・使える」＋安全 red-team（sensors/inferential.md） | PASS |
| 第5層 独立検証 | layer1-independent-reviewer（別コンテキスト）→ PASS-WITH-NOTES（delivery/VERIFICATION.md） | PASS |

## 判断記録（Council 非発動の理由）
- **LLMプロバイダ選定**: Anthropic（Claude）を `ModelRouter` 背後の既定実装に採用。理由: 実行環境（Claude Code/Anthropic）と整合し、インターフェース背後で**可逆**（差し替え容易）。単一の妥当な既定であり拮抗案なしと判断し Council 非発動（C2 不該当）。既定モデル: fast=claude-haiku-4-5-20251001 / heavy=claude-sonnet-4-6（env で差し替え可）。
- **記憶ストア**: REGIME 技術デフォルト通り SQLite。ネイティブビルド不要の `node:sqlite`（組み込み）を採用。

## 仕様改訂提案（Type C）
- なし（sensors/computational.md のコマンド記述 stale は本献上で修正済み）。

## 異常献上（Type D）
- なし。

## 履歴整合性チェック（儀式スキップ＝LC0 のため対象外）
- 該当なし（新規プロダクト）。

## 申し送り（人間承認者・次サイクル）
1. **本番は LLM モデレーション層を必ず有効化**して運用する（VERIFICATION.md キーリスク参照）。現状 Anthropic 単一プロバイダのため生成キー＝モデレーションキーで co-gated だが、将来別プロバイダの `ModelRouter` を足す場合は**モデレーション LLM を独立に必須化**すること。
2. 記憶の populate（呼び名・鉄板ネタの抽出/登録）は Phase 0 では未実装（store/prune/purge と注入経路は実装済み）。明示コマンド or 軽い抽出を Phase 0.x で追加候補。
3. prompt caching（system prompt は静的＝好適候補）は SDK バージョン更新時に cache_control を付与（model-router.ts に注記）。
4. ホスティング（常駐実行環境）未選定。実接続スモーク（DISCORD_TOKEN+LLM_API_KEY）は運用環境で実施。
5. 投げ銭/Stripe/SKU は 7日リテンション達成後の Phase 1。

## 体制事後評価
- **M2 は妥当**。安全クリティカル（脆弱な相手・反面教師 red-team）かつ金銭絡みの前提があり、独立検証の価値が高かった（キーリスク=LLMモデレーター依存を独立視点が明確化）。
- L2 発動閾値には未到達（単一デプロイ単位・<5 独立ドメイン）。次サイクルも M2 継続を推奨。
- 規模の伸び（複数サーバー・投げ銭最優先キュー）が出たら ARC を realtime-pubsub へ再評価（REGIME 注記済み）。
