# L0-4 状態遷移（簡易モード, Mermaid のみ） — ヤジ

独自画面はないが、「リアルタイム経路」と「2速ループの遅い改善」にライフサイクルがある。
XState は使わず Mermaid で表現する（簡易モード）。

## 1. リアルタイム経路（1 メッセージの処理ライフサイクル）

HANDOFF §3.3 のテキスト経路に対応。Phase 0 では投げ銭分岐は「席のみ」で、実際には常に通常キューへ流れる。

```mermaid
stateDiagram-v2
    [*] --> Received: Discord メッセージ受信
    Received --> Ignored: bot/自己発言 or トリガー外
    Ignored --> [*]
    Received --> Ingress: 応答対象
    Ingress --> Deflected: 入口モデレーション NG（説教せずかわす定型）
    Deflected --> Logged
    Ingress --> Routing: 入口 OK
    Routing --> Generating: tier 決定（通常=fast / 難所=heavy）
    Generating --> Egress: 候補生成
    Generating --> Apology: モデル失敗（キャラのまま詫び1回）
    Apology --> Logged
    Egress --> Sending: 出口 OK
    Egress --> Regenerating: 出口 NG（再生成1回）
    Regenerating --> Egress2: 再候補
    Egress2 --> Sending: OK
    Egress2 --> SafeFallback: なお NG → 安全定型に差し替え
    SafeFallback --> Sending
    Sending --> Logged: 送信（失敗時も詫び→Logged）
    Logged --> [*]
```

注: 投げ銭最優先キュー（HANDOFF §3.3 / §5.7）は Phase 1。Phase 0 では `hasTip=false` 固定で通常キューのみ。
同時接続が増え通常キューが詰まる兆候が出たら ARC を realtime-pubsub へ移行する（REGIME.md ARC 注記）。

## 2. 遅い改善ループ（2速ループの「遅い」側・F6）

HANDOFF §3.1 に対応。**人間ゲート**を必ず通る。承認駆動の状態変化（S5）。

```mermaid
stateDiagram-v2
    [*] --> Collected: 全ログ蓄積（F5）
    Collected --> Evaluated: 自動eval（複合指標：視聴維持＋安全違反ゼロ）
    Evaluated --> ProposalDrafted: 速い更新案を作成（persona/NG/記憶の追記）
    ProposalDrafted --> HumanGate: PR として提出
    HumanGate --> Rejected: 経営者が却下
    Rejected --> [*]
    HumanGate --> Applied: 経営者が承認・マージ
    Applied --> [*]
    note right of HumanGate
      自己学習による自動改変は禁止（Tay化回避）。
      反映は人間承認でのみ起きる。
    end note
```
