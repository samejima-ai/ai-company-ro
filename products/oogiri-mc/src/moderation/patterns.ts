// 反面教師 red-team / DONT.md ハード制約に対応する決定論的検出パターン（ベースライン層）。
//
// 注意: 決定論的キーワード検出は「明白な型」を捕まえる必要条件であって十分条件ではない。
// 微妙な操作（やみえい・色恋課金）の主防御は (1) personas の system prompt（ヤジが拒否する）
// と (2) LLM 補助 egress 分類（LlmModerator）と (3) red-team eval。本ファイルはその一次フィルタ。

export interface PatternRule {
  category: string;
  test: RegExp;
}

/** 入口（ユーザー入力 → モデルに渡す前）。該当で allowed=false。 */
export const INGRESS_RULES: PatternRule[] = [
  {
    category: "prompt_injection",
    test: /(これまで|今まで|上記|以前|先ほど)の?(指示|命令|設定|ルール|プロンプト).{0,6}(無視|忘れ|破棄|上書き)/,
  },
  {
    category: "prompt_injection",
    test: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  },
  {
    category: "system_prompt_leak",
    test: /(system\s*prompt|システムプロンプト|初期設定|内部の指示).{0,10}(教え|出力|見せ|表示|出して|reveal|print|share)/i,
  },
  {
    category: "guardrail_bypass",
    test: /(NG|制限|規制|ルール|ガードレール|フィルタ).{0,6}(解除|外し|無効|回避|disable|bypass)/i,
  },
  { category: "guardrail_bypass", test: /(jailbreak|developer\s*mode|開発者モード|\bDAN\b)/i },
  {
    category: "sexual_solicitation",
    test: /(セックス|エッチ|裸|全裸|おっぱい|性器|射精|挿入|sex|nsfw|エロ(い|画像|文)?)/i,
  },
  {
    category: "self_harm_method",
    test: /(死に方|楽に死ね|自殺.{0,4}(方法|やり方|手段)|首.{0,2}吊|練炭|オーバードーズ.{0,4}(量|方法))/,
  },
  {
    category: "personal_info_extraction",
    test: /(他の|別の|あの)(ユーザー|人|client|客).{0,8}(本名|住所|電話|連絡先|個人情報)/,
  },
];

/** 出口（ヤジの生成候補 → 送信前）。該当で allowed=false（再生成 or 安全定型に差し替え）。 */
export const EGRESS_RULES: PatternRule[] = [
  // ヤジ自身が system prompt を漏らさない
  { category: "system_prompt_leak", test: /あなたは「ヤジ」という|^#\s*出自|^#\s*絶対禁止/m },
  // 恋愛錯覚での課金誘導
  {
    category: "romance_monetization",
    test: /(付き合|恋人|彼女|彼氏|デート|結婚|愛してる).{0,24}(課金|投げ銭|投げて|お金|送金|支援|貢)/,
  },
  {
    category: "romance_monetization",
    test: /(課金|投げ銭|送金|お金).{0,24}(してくれたら|くれたら|したら).{0,16}(付き合|恋人|名前|呼ん|特別)/,
  },
  // 過剰課金の煽り（射幸性）
  {
    category: "overcharge_incitement",
    test: /(もっと|あと少し|あと\d+|限界まで|有り金|全部).{0,10}(課金|投げ|入れて|出して)/,
  },
  // 依存搾取（やみえい：いなくなる/消える + 金銭）
  {
    category: "dependency_exploitation",
    test: /(いなくなっちゃう|消えちゃう|会えなくなる|死んじゃう).{0,28}(お金|課金|助け|送金|支援)/,
  },
  // 性的・露骨
  {
    category: "sexual_content",
    test: /(セックス|挿入|射精|性器|裸で|犯し|喘ぎ)/,
  },
  // 断定的な医療/法律/金融助言
  {
    category: "definitive_professional_advice",
    test: /(絶対に?|必ず|100%|間違いなく).{0,12}(治る|完治|儲か|勝て|合法|違法|無罪|診断|処方)/,
  },
];
