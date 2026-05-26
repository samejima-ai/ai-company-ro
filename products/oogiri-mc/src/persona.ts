import { readFile } from "node:fs/promises";
import type { PersonaProvider } from "../spec/api-signatures";

/**
 * personas/riko_system_prompt.md の ```text フェンス内本文（system prompt 正本）を抽出する純関数。
 * persona をコードに二重定義しないための単一読込口。
 */
export function extractSystemPrompt(markdown: string): string {
  const match = markdown.match(/```text\n([\s\S]*?)```/);
  if (!match || match[1] === undefined) {
    throw new Error(
      "system prompt の ```text ブロックが見つからない（personas/riko_system_prompt.md を確認）",
    );
  }
  return match[1].trimEnd();
}

export async function loadSystemPrompt(path: string): Promise<string> {
  const md = await readFile(path, "utf8");
  return extractSystemPrompt(md);
}

/**
 * PersonaProvider 実装。初回読込をキャッシュする（persona は不変・速い更新は再起動で反映）。
 */
export function createPersonaProvider(path: string): PersonaProvider {
  let cached: string | null = null;
  return {
    async getSystemPrompt(): Promise<string> {
      if (cached === null) {
        cached = await loadSystemPrompt(path);
      }
      return cached;
    },
  };
}
