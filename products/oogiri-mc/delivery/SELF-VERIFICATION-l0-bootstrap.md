# L0 自己検証 — ヤジ（oogiri-mc）bootstrap

- 検証日: 2026-05-25
- AI能力: Claude Opus 4.7
- モード: M2 / dev_mode: github_assisted / ARC: monolith / LC=0
- DH バージョン: v5.18.0

## §0 受け入れ基準 4 条件

1. **SPEC/DONT/REGIME が必須項目を満たす**: PASS（機能×条件粒度、Phase 境界明記、NFR/スコア/ARC/dev_mode 記録済み）。
2. **scaffold 実体生成済み**: PASS（下表）。ただし v5.1.0 標準 stack（Vite+React+PWA）は Web 向けで本件（Node.js Discord bot サービス・UI なし）に不適合のため、**Node/TS サービス stack を採用**（scaffold-checklist「純 Node.js CLI は将来 minor」に該当、当面の逸脱として本書に明記）。
3. **smoke test**: PASS（下記コマンド結果）。
4. **§7.4 自己検証**: PASS（本書）。

## scaffold smoke 結果（実行ログ）

| コマンド | 結果 |
|---|---|
| `pnpm install` | exit 0（discord.js / zod / dotenv / tsup / tsx / vitest / biome / typescript） |
| `pnpm run typecheck`（`tsc --noEmit`） | exit 0、エラー0件 |
| `pnpm run test`（vitest） | exit 0、3 tests passed |
| `pnpm run lint`（biome） | exit 0（settings.json を format で整形後） |
| `pnpm run build`（tsup → dist/） | exit 0、`dist/index.js` 生成 |
| `npx tsx src/index.ts`（トークン無） | exit 0、persona 839 文字をロードし接続せず終了 |

### 標準 stack 逸脱の理由（§0 受け入れ基準 3 の明記要件）
- v5.1.0 scaffold-checklist の標準 stack は Vite + TypeScript + React + PWA（Web UI）。
- 本件は Discord bot の常駐サービスで独自 UI を持たない（DESIGN.md スキップ）。Web 用必須ファイル（index.html / src/main.tsx / manifest.webmanifest / PWA アイコン / playwright.config）は**該当しない**。
- 代替として Node/TS サービス stack を採用: `package.json`（dev/build/test/typecheck/lint）/ `tsconfig.json`（strict, Bundler, noEmit）/ `biome.json` / `vitest.config.ts` / `.gitignore` / `.env.example` / `src/{index,config,persona}.ts` / `tests/smoke.test.ts`。
- build は tsc 直 emit ではなく tsup（esbuild）。dev/test も esbuild 系に統一し extensionless import で一貫。
- `dev` の「HTTP 200」スモークは bot に非該当（HTTP サーバを持たない）。代替に「entry をトークン無で 1 回起動し clean exit」で起動健全性を確認。実接続スモークは `DISCORD_TOKEN` が要るため L1 / 運用時に実施。

## §7.4 チェックリスト

- [x] **broken reference 検査**: INDEX/SPEC/DONT/REGIME/CLAUDE/HANDOFF/spec/sensors の参照先 17 ファイルすべて実在（dead link なし）。
- [x] **scaffold smoke test 検査**: 上表のとおり typecheck/test/lint/build/起動が exit 0。逸脱理由を本書に明記。
- [x] **DONT 自己照合**: SPEC.md に DONT.md の禁止条項（ハード制約・反面教師手口・Phase 境界違反）に当たる機能定義の混入なし。投げ銭/決済は「席のみ・未発火」。
- [x] **DESIGN.md トークン一貫性検査**: 非該当（UI なし、DESIGN.md 未生成）。
- [x] **Pre-flight 充足**: persona-spec / regime-assessment / meta-spec-template / dev-env-spec / scaffold-checklist / subphase-selection / credit-template を読了の上で各ステップ実行。
- [x] **受け入れ基準充足**: §0 の 4 条件を本書で逐項確認。

## プロジェクト固有 grep センサー結果
- persona 本文の src/ 二重定義: なし（`personas/riko_system_prompt.md` が唯一の正本、`src/persona.ts` が読込口）。
- 秘密情報ハードコード: なし。`.env` 不在、`.env.example` のみ。

## サブフェーズ成果物
- L0-2 完全（`spec/domain.ts`, Zod）/ L0-3 簡易（`spec/api-signatures.ts`）/ L0-4 簡易（`spec/state-diagrams.md`）/ L0-5 簡易（`spec/authz-matrix.md`）/ L0-6 起動（`spec/invariants.feature`、Evil Path に反面教師 red-team）。

## L1 への申し送り
- F1〜F6 の本実装。`spec/api-signatures.ts` のインターフェース背後に外部依存を閉じる。
- 具体モデル選定（ベンチマーク）/ 記憶ストア（SQLite 起点）/ ホスティングは L1 決定、REGIME.md 技術デフォルト参照。
- 安全は CLAUDE.md だけに頼らず src/moderation + sensors + invariants.feature Evil Path + CI で二重化。
- 投げ銭/決済/SKU は Phase 1（7日リテンション達成後）。
