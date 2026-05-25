import type { Client } from "discord.js";
import type { ChatGateway } from "../../spec/api-signatures";

const DISCORD_MESSAGE_LIMIT = 2000;

/** F1 Discord 送受信アダプタ。pipeline からの I/O をここに閉じる。 */
export class DiscordChatGateway implements ChatGateway {
  constructor(private readonly client: Client) {}

  async startTyping(channelId: string): Promise<void> {
    const ch = await this.client.channels.fetch(channelId);
    if (ch?.isTextBased() && "sendTyping" in ch) {
      await (ch as { sendTyping: () => Promise<unknown> }).sendTyping();
    }
  }

  async send(channelId: string, text: string): Promise<void> {
    const ch = await this.client.channels.fetch(channelId);
    if (ch?.isTextBased() && "send" in ch) {
      // Discord の 1 メッセージ上限（2000 字）に丸める。
      await (ch as { send: (t: string) => Promise<unknown> }).send(
        text.slice(0, DISCORD_MESSAGE_LIMIT),
      );
    }
  }
}
