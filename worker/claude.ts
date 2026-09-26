import Anthropic from "@anthropic-ai/sdk";
import { NUTRITION_JSON_SCHEMA, NutritionResultSchema, sanitizeResult, type NutritionResult } from "../src/lib/nutrition-schema";

type Content = Anthropic.MessageParam["content"];

// Haiku 4.5 rejects output_config.effort, so it only gets the JSON format.
function outputConfig(env: Env, model: string) {
  const format = { type: "json_schema" as const, schema: NUTRITION_JSON_SCHEMA as unknown as Record<string, unknown> };
  return model.startsWith("claude-haiku")
    ? { format }
    : { effort: env.AI_EFFORT as "low" | "medium" | "high", format };
}

async function call(client: Anthropic, env: Env, model: string, system: string, content: Content): Promise<NutritionResult> {
  const started = Date.now();
  const res = await client.messages.create({
    model,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content }],
    output_config: outputConfig(env, model),
  });
  console.log(
    JSON.stringify({
      evt: "ai_call",
      model,
      ms: Date.now() - started,
      stop_reason: res.stop_reason,
      input_tokens: res.usage.input_tokens,
      output_tokens: res.usage.output_tokens,
    }),
  );
  if (res.stop_reason !== "end_turn") throw new Error("ai_failed");
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("ai_failed");
  return sanitizeResult(NutritionResultSchema.parse(JSON.parse(text.text)));
}

const retryable = (e: unknown) =>
  e instanceof Anthropic.APIConnectionError || (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500);

export async function estimate(env: Env, system: string, content: Content): Promise<{ result: NutritionResult; model: string }> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 45_000 });
  try {
    return { result: await call(client, env, env.MODEL, system, content), model: env.MODEL };
  } catch (e) {
    if (!retryable(e)) throw new Error("ai_failed", { cause: e });
    console.log(JSON.stringify({ evt: "ai_fallback", from: env.MODEL, to: env.FALLBACK_MODEL }));
    try {
      return { result: await call(client, env, env.FALLBACK_MODEL, system, content), model: env.FALLBACK_MODEL };
    } catch (e2) {
      throw new Error("ai_failed", { cause: e2 });
    }
  }
}
