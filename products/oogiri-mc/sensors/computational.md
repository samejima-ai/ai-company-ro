# 計算的センサー — ヤジ

決定論的で高速な検証。各 1 分以内に完了する制約。L1 自己検証と layer1-independent-reviewer が参照する。

## 型チェック
- コマンド: `pnpm run typecheck`（= `tsc -p tsconfig.json`。tsconfig は `noEmit: true`）
- 成功条件: エラー0件
- 対象: `src/`, `spec/`, `tests/`

## ビルド
- コマンド: `pnpm run build`（= `tsup src/index.ts --format esm --target node20 --out-dir dist`）
- 成功条件: exit code 0、`dist/index.js` が生成
- 制約: 1分以内

## リンター / フォーマット
- コマンド: `pnpm run lint`（= `biome check .`）
- 成功条件: エラー0件（warning は許容）

## テスト
- コマンド: `pnpm run test`（= `vitest run`）
- 成功条件: 全件 pass（テスト0件でも framework 起動成功で可）
- 制約: 1分以内

## 規約 grep センサー（プロジェクト固有・定量規約の機械検出）

CLAUDE.md / SPEC.md の定量的規約を grep で機械検出する。コスト極小、推論センサーの取りこぼしを補完。

- **ペルソナ二重定義の禁止**: `src/` 配下に system prompt 本文が直書きされていないこと。
  - 例: `rg -n "あなたは「ヤジ」という" src/` が**ヒット0**（正本は personas/ のみ）。
- **秘密情報のハードコード禁止**: `src/` 配下に `DISCORD_TOKEN`/APIキーらしき literal がないこと。
  - 例: `rg -nE "(discord\.com/api/.*token|sk-[A-Za-z0-9]{20,}|xox[baprs]-)" src/` が**ヒット0**。
- **`.env` 非コミット**: `git ls-files | rg -x "products/oogiri-mc/.env"` が**ヒット0**（`.env.example` のみ追跡）。

## 実行時間制約
- 各センサーは 1 分以内（grep 系は 1 秒以内）。超える場合は L0 へ差し戻し（仕様/構成の見直し）。
