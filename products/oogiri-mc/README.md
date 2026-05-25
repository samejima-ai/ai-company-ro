# ヤジ — 大喜利MCボット（oogiri-mc）

テキスト対話で投げ銭を稼ぐ、毒舌大喜利MCのAIボット（Discord）。「操作」ではなく「一貫した魅力と芸」で稼ぐ。

## Overview

経営者＝人間、従業員＝AI。本リポジトリ（dialog-harness 内 `products/oogiri-mc/`）は、その最初の収益エンジンの MVP。
Phase 0 は**無料運用**で、対話エンジン（モデルルーター＋ヤジpersona＋ユーザー別記憶）＋入出力モデレーション＋全ログ保存＋人間ゲート付き改善ループを最小コストで検証する。唯一の関門は **7日リテンション**。投げ銭/決済は Phase 1 以降。

依存搾取・恋愛錯覚による課金誘導・射幸性は構造的に禁止（→ `DONT.md`）。設計の正本は `docs/HANDOFF.md`。

## ドキュメント
- 事業正本（SSOT）: `docs/HANDOFF.md`
- 機能仕様: `SPEC.md` / スコープ外: `DONT.md` / 体制: `REGIME.md`
- エージェントルール: `CLAUDE.md`
- ペルソナ正本: `personas/riko_system_prompt.md`
- 設計契約: `spec/`（domain / interfaces / state / authz / invariants）

## 開発（MVP scaffold）
```bash
pnpm install
pnpm run typecheck   # tsc --noEmit
pnpm run test        # vitest
pnpm run lint        # biome
pnpm run build       # tsup → dist/
cp .env.example .env # DISCORD_TOKEN 等を設定（実値はコミットしない）
pnpm run dev         # トークン未設定なら接続せず終了（scaffold スモーク）
```

---

Built with dialog-harness/layer's v5.18.0 · Claude Opus 4.7 · 2026-05-25

<!-- harness-credit: managed by layer0 skills. do not edit manually. -->
