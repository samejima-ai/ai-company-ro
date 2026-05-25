import { describe, expect, it } from "vitest";
import { loadEnv, parseChannelIds } from "../src/config";
import { extractSystemPrompt } from "../src/persona";

describe("persona", () => {
  it("```text ブロックから system prompt を抽出する", () => {
    const md = "intro\n```text\nあなたは「ヤジ」\n```\nouttro";
    expect(extractSystemPrompt(md)).toBe("あなたは「ヤジ」");
  });

  it("text ブロックが無ければ throw する", () => {
    expect(() => extractSystemPrompt("no fence here")).toThrow();
  });
});

describe("config", () => {
  it("デフォルトを適用しチャンネル ID をパースする", () => {
    const env = loadEnv({ OOGIRI_CHANNEL_IDS: "111, 222 ,333" } as NodeJS.ProcessEnv);
    expect(env.DB_PATH).toBe("data/oogiri.db");
    expect(env.PERSONA_PATH).toBe("personas/riko_system_prompt.md");
    expect(parseChannelIds(env)).toEqual(["111", "222", "333"]);
  });
});
