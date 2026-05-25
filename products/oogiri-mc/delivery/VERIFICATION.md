# VERIFICATION.md — ヤジ Phase 0 独立検証

- 検証日: 2026-05-25 / Mode: M2 / 検証者: layer1-independent-reviewer（実装コンテキスト隔離・別コンテキスト起動）
- 判定: **PASS-WITH-NOTES**

## 計算的センサー結果

| センサー | コマンド | 結果 |
|---|---|---|
| 型チェック | `tsc -p tsconfig.json` | PASS（exit 0） |
| テスト | `vitest run` | PASS（24/24, 4 files） |
| リンター | `biome check .` | PASS（25 files, 0 errors） |
| ビルド | `tsup … --out-dir dist` | PASS（exit 0, dist/index.js 生成） |

## review-checklist 照合（file:line 根拠つき）

- ✓ persona 二重定義なし: 正本は personas/riko_system_prompt.md のみ。src/persona.ts は読込のみ。`rg "あなたは「ヤジ」という" src/` の唯一ヒットは patterns.ts の egress 漏洩検出ルール（定義ではない）。
- ✓ モデレーション fail-closed: moderator.ts LayeredModerator（例外→moderator_error, allowed=false）＋ pipeline.ts safeModerate。moderation.test.ts で検証。
- ✓ 入口はモデル呼び出し前 / 出口は送信前＋再生成1回＋安全定型: pipeline.ts。pipeline.test.ts で検証。
- ✓ confession は注入除外: spec/domain.ts INJECTABLE_MEMORY_KINDS（confession/tip_history 含まず）。pipeline.ts / memory.test.ts で検証。
- ✓ prune は confession 保持 / purgeUser は profile+memory+log を単一トランザクション削除: memory-store.ts。memory.test.ts で検証。
- ✓ Phase 境界: 投げ銭経路は不活性（index.ts hasTip=false 固定、Stripe import なし）。
- ✓ 反面教師 red-team はコード（patterns.ts egress + llm-moderator.ts）と spec/invariants.feature Evil Path の両方でカバー。
- ✓ 秘密情報: 追跡は .env.example のみ、.gitignore で .env/*.db 除外、src/ にトークン literal なし。

## 指摘（Low）

1. **[Low・解消済]** sensors/computational.md のコマンド記述が stale（typecheck/build）。本献上で実コマンドに更新。
2. **[Low・許容]** 出口 NG 時の再生成が同一入力・tier=heavy で行われるため、決定論ルール違反では再生成が no-op になりやすい（安全定型に落ちる）。fail-safe として許容。LLM 層がフラグした境界ケースでは確率的再生成が効く。

## 人間承認者へのキーリスク（重要）

微妙な操作（やみえい・未来形色恋・信頼搾取）の出口防御は **LLM 補助モデレーター（LlmModerator）** に大きく依存する。これは `LLM_API_KEY` 設定時のみ有効化される。

**構造上の緩和（補足）**: 本実装の唯一の `ModelRouter` 実装は Anthropic であり、生成にも `LLM_API_KEY` が要る。したがって「実際にモデル出力が出る ⇒ 同じキーで LLM モデレーターも有効」が成立する。キー未設定時は生成自体が失敗し詫び応答のみ（漏洩対象の生成物が存在しない）。

**残存リスク**: 将来、Anthropic 以外の `ModelRouter`（別プロバイダのキーで生成）を足した場合、生成は動くのに LLM モデレーターが無効、という乖離が起こりうる。その時は決定論キーワード層（言い換えで回避可能）だけになる。→ DELIVERY「申し送り」に「生成プロバイダ追加時はモデレーション LLM の独立必須化」を明記。本番は LLM モデレーション層を必ず有効にして運用すること。
