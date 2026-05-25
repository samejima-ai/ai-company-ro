# ヤジ — 大喜利MCボット（oogiri-mc）

## 目的
テキスト対話で投げ銭を稼ぐ、毒舌大喜利MCのAIボット（Discord）。操作ではなく「一貫した魅力と芸」で稼ぐ。経営者＝人間、従業員＝AI。

## 機能一覧（MVP Phase 0）
- F1 Discord接続・メッセージ受信・逐次応答 → 詳細: SPEC.md#f1-discord-io
- F2 対話エンジン（モデルルーター＋ヤジpersona＋記憶注入） → 詳細: SPEC.md#f2-対話エンジン
- F3 ユーザー別記憶層（呼び名・鉄板ネタ・打ち明け話の区別） → 詳細: SPEC.md#f3-記憶層
- F4 入出力モデレーション（入口／出口の二重） → 詳細: SPEC.md#f4-モデレーション
- F5 全ログ保存 → 詳細: SPEC.md#f5-ログ
- F6 簡易eval＋人間ゲート付き改善ループ（速い更新のみ） → 詳細: SPEC.md#f6-eval改善ループ

## スコープ外
→ DONT.md

## SSOT（事業正本）
→ docs/HANDOFF.md

## ペルソナ正本
→ personas/riko_system_prompt.md

## 開発体制
→ REGIME.md

## 開発環境
→ CLAUDE.md, sensors/, .claude/

## L0 サブフェーズ成果物（設計契約）
- ドメインモデル: spec/domain.ts
- 内部インターフェース署名: spec/api-signatures.ts
- 状態遷移図（リアルタイム経路／改善ループ）: spec/state-diagrams.md
- 認可マトリクス: spec/authz-matrix.md
- 層間不変条件（Happy/Sad/Evil）: spec/invariants.feature
- 選定記録: spec/subphase-manifest.md
