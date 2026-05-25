# ヤジ（大喜利MCボット） — エージェントルール

## 原則
- SSOT は `docs/HANDOFF.md`。仕様は `SPEC.md`、スコープ外は `DONT.md`。矛盾を見つけたら実装を止め、SSOT を正として人間に献上する。
- 稼ぎ方は「操作ではなく芸」。理由: 操作（依存搾取・色恋課金・射幸性）は規約BAN・炎上・返金・規制・LTV崩壊の主因で、事業の存続条件に反する。
- 経営者＝人間が最終ガバナンス。AI は実務を担うが、ペルソナ定義・NG辞書/安全ポリシー・改善反映・価格設計の最終承認は人間が握る。
- MVP は Phase 0（無料運用・課金導線なし）。投げ銭/決済は Phase 1 以降。席は用意するが実装しない。

## コーディング規約
- 言語: TypeScript（Node.js, ESM）。`type: "module"`。
- ペルソナ文字列はコードに二重定義しない。`personas/riko_system_prompt.md` を唯一の正本として読み込む。理由: 速い更新（prompt 追記）を 1 箇所に集約し、人間ゲートを通しやすくするため。
- ドメイン型は `spec/domain.ts` を正本とする。記憶・ログのスキーマはここに従う。
- 外部依存（Discord／LLMプロバイダ／記憶ストア）はインターフェース（`MemoryStore` / `ModelRouter` / `Moderator` 等、`spec/api-signatures.ts`）の背後に隠す。理由: モデル・ストアの差し替えと将来の realtime-pubsub 移行を可能にするため。
- 秘密情報は `.env` のみ。実値はコミットしない。新しいキーは `.env.example` に形だけ追記する。

## 禁止事項
- `DONT.md`「事業を壊すハード制約」に触れる挙動を実装・出力しない（例外なし）。
- 「頂き女子」マニュアルの手口（偽の悩み設定・信頼搾取・やみえい・未来形色恋・連投課金の煽り）を実装しない。反面教師として F4 出口検査・red-team の対象にする。
- 自己学習による persona/NG の自動改変をしない（Tay化回避）。改善はログ→eval→**人間ゲート**→PR マージの順でのみ反映する。
- 保護ブランチへ直接 push しない。変更は PR として提出し、人間承認でのみマージされる（dev_mode=github_assisted）。
- モデレーション機構が失敗したときは「通さない」側に倒す。無言でプロセスを落とさない。
- ユーザーの氏名・連絡先など個人情報を収集・保存・暴露しない。保持するのは Discord user ID と分類済み記憶のみ。

## 安全の二重化
- NG/安全は本ファイル（確率的遵守）だけに頼らない。`src/moderation/` のコード側フィルタ（入口/出口）＋ `sensors/`＋ `spec/invariants.feature` の Evil Path＋ CI で機械的に二重チェックする。

## 参照
- SSOT: docs/HANDOFF.md
- 仕様: INDEX.md, SPEC.md
- スコープ外: DONT.md
- 体制: REGIME.md
- ペルソナ正本: personas/riko_system_prompt.md
- 設計契約: spec/domain.ts, spec/api-signatures.ts, spec/state-diagrams.md, spec/authz-matrix.md, spec/invariants.feature
- センサー: sensors/
