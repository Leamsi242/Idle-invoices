import Anthropic from "@anthropic-ai/sdk";

const MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

export const isSupportedImage = (type: string): type is MediaType => (MEDIA_TYPES as readonly string[]).includes(type);

/**
 * Sends one screenshot, and nothing else, to Claude and gets back the subscription list as
 * plain text in the format parseAppStoreList() reads. No statement data is sent.
 */
export async function screenshotToText(image: Buffer, mediaType: MediaType): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Screenshot reading needs ANTHROPIC_API_KEY. You can paste the text instead.");
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 2000,
    output_config: { effort: "low" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image.toString("base64") } },
          {
            type: "text",
            text:
              "This is a screenshot of an app store subscriptions screen (Apple or Google Play). " +
              "Transcribe only the subscriptions. For each one, write a block of lines separated from the next block by a blank line: " +
              "service name, plan, price with currency and period (for example €9.99/month), and the renewal line as shown (for example Renews 3 October 2026). " +
              "Put expired subscriptions after a line that says Expired. Output only the blocks, no commentary.",
          },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("The screenshot could not be read. Please paste the text instead.");
  return response.content.map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
}
