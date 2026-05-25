import { z } from "zod";

const EnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1).optional(),
  OOGIRI_CHANNEL_IDS: z.string().optional(),
  DB_PATH: z.string().default("data/oogiri.db"),
  PERSONA_PATH: z.string().default("personas/riko_system_prompt.md"),
  MODEL_FAST: z.string().default(""),
  MODEL_HEAVY: z.string().default(""),
  LLM_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}

/** カンマ区切りのチャンネル ID を配列化する。 */
export function parseChannelIds(env: Env): string[] {
  return (env.OOGIRI_CHANNEL_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
