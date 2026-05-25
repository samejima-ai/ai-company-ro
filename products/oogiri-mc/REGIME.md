# 開発体制判定 — ヤジ（大喜利MCボット）

## 判定時のAI能力バージョン
- モデル: Claude Opus 4.7
- 判定日: 2026-05-25

## スコア
- 規模スコア（S）: 4点
- 不確実性スコア（U）: 2点
- リスクスコア（R）: 3点
- NFRスコア（N）: 5点（内訳は下記）
- 合計: 9点（S+U+R。N は加算しない）

## 判定結果
モード: M2 標準モード

## dev_mode
- mode: github_assisted
- ctl: 0
- 判定根拠: GitHub 利用あり、規模 M2、LC=0。HANDOFF §10 ガバナンス（CCはPRを作るだけ・マージは人間承認必須・kill-switch は人間）と整合。経営者の明示選択で github_assisted を維持し autonomous へは昇格しない。

（autonomous_scope は dev_mode=autonomous の場合のみ記載。本プロジェクトは非該当。）

## persona（対話面・L0用）
- active: default
- override_state: null

（仕様策定対話の presentation のみに作用。プロダクト「ヤジ」のキャラクター定義とは別物。ヤジの人格は personas/riko_system_prompt.md が正本。）

## current_focus
- type: feature
- target: claude/l0-startup-ZgH4N
- since: 2026-05-25
- priority: critical

（dev_mode=github_assisted のため記録のみ。autonomous-drive 入口側の自動 pickup は稼働しない。）

## 判定根拠

### 規模スコアの内訳
- 機能数: 6（F1〜F6） → 2点
- 画面数: 0（独自UIなし、Discord ネイティブ） → 0点
- 登場人物: 一般ユーザー／経営者（人間ゲート）の 2 種（課金者は Phase 1） → 1点
- 外部連携: Discord API・LLMプロバイダの 2（Stripe は Phase 1） → 1点

### 不確実性スコアの内訳
- イメージの明確さ: 大枠は HANDOFF で明確、細部（モデル・記憶ストア具体）が曖昧 → 1点
- 既知度: Discord bot ＋ LLM は既知領域、原型 Neuro-sama あり → 0点
- 変更予測: 2速ループで継続的に更新する前提 → 1点

### リスクスコアの内訳
- 失敗時の影響: 本番運用・脆弱な相手・将来の金銭絡み・安全クリティカルな persona 制約 → 3点

### NFRスコアの内訳（詳細は `.claude/skills/layer0-spec-architect/references/nfr-scoring.md`）
- 性能（P）: リアルタイム掛け合い、p95 30秒、極端ではない → 1
- 可用性（A）: 24h 営業が望ましいが MVP は停止許容、SLA なし → 1
- セキュリティ（S）: PII相当（打ち明け話・記憶・将来の課金履歴）、未成年保護、モデレーション → 2
- コンプライアンス（C）: Discord ToS・将来の決済規制（日本）、MVP は低 → 1
- スケーラビリティ（L）: 1 サーバー MVP、低 → 0
- N 合計: 5

## L2発動閾値チェック
- SPEC.mdトークン数: 約4k / 15k
- 想定ファイル数: 約35（MVP scaffold + spec + sensors） / 80
- 想定総行数: 約3k / 10k
- 独立ドメイン数: I/O・対話・記憶・モデレーション・ログ/eval はひとつの線形パイプラインの責務層であり、並列L1を要する独立ドメインではない（実質 <5） / 5
- 並行可能サブゴール数: MVP は逐次実装で足りる（<3） / 3
- L1 1サイクル想定時間: 機能単位では <2h / 2h
- → 超過項目: なし

## オーバーライド適用
- L2発動閾値: 非適用
- U >= 3（L0対話延長）: 非適用（U=2）
- R >= 2（M2以上強制）: 適用（R=3）
- N >= 9（モノリス解除強制）: 非適用（N=5）
- N >= 5（ARC切替推奨）: 適用（推奨のみ。下記参照）
- セキュリティ >= 2（M2強制）: 適用（N の S=2）
- 可用性 = 3（権限レベル記録必須）: 非適用（A=1）

## ARC（アーキテクチャパターン）
- 選択: monolith
- 判断経緯: AI推奨 → 人間確定（MVP は 1 サーバー・テキストのみの単一常駐プロセス）
- 根拠: N=5 で realtime-pubsub への切替を「推奨（強制ではない）」レベルで検討したが、MVP は同時接続規模が小さく monolith で充足。同時接続が増えた段階で realtime-pubsub へ移行する（移行先は `spec/state-diagrams.md` に注記）。ARC 変更時は sensors/ の再評価が必須。

## 体制構成
- Layer 0: spec-architect（本判定・本ドキュメント群を生成）
- Layer 1: 単体（autonomous-dev）＋ layer1-independent-reviewer 常時起動
- Layer 2: なし
- 検証: layer1-independent-reviewer（実装コンテキスト隔離）＋ L1 自己検証（計算的＋推論的センサー）

## 権限レベル
- 権限レベル: L0-2（デフォルト）
- 昇格: なし（R=3 のため L0-3 昇格は原則不可）
- 外部API課金上限: LLMプロバイダのキー単位で上限設定を推奨（実装時 .env / プロバイダ側）。介入チャネル: C1（判断献上）— Cat-D 倫理/コンプライアンス と Cat-E 破壊的変更を中心に人間へ献上。

## LC（1→5運用対応）
- LC: LC=0
- 判定根拠: 本プロダクト（products/oogiri-mc/）に history/ なし＝新規。振り返り儀式は完全スキップ。

## 技術デフォルト（L1 へ委譲、人間 veto 可）
- モデルルーター: 通常=高速小型モデル / 難所=大型モデル。具体名は決定時にベンチマークし .env で差し替え。
- 記憶ストア: SQLite（KV 中心）。育てばベクタDBへ。`MemoryStore` インターフェースに閉じる。
- スタック: TypeScript（Node.js, ESM）＋ discord.js。決済は将来 Stripe webhook（HANDOFF §8）。
- ホスティング: 常駐実行環境は L1 で選定（MVP は小さく）。

## 判定ログ
- 経営者は github_assisted 維持を明示選択（§10 人間マージゲートを保持）。
- 製品配置は products/oogiri-mc/ を選択（DH メタ成果物と分離）。
- 「頂き女子」マニュアルは反面教師として DONT.md / sensors/inferential.md / spec/invariants.feature の Evil Path にのみ反映（手口は実装しない）。
