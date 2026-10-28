import "server-only";
export const DEFAULT_GOOGLE_MODEL = "gemma-4-26b-a4b-it";
export function operatorConfig() {
  const provider = process.env.AI_PROVIDER?.trim() || "google";
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GOOGLE_MODEL;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const validModel = /^(gemma|gemini)-[a-zA-Z0-9.-]+$/.test(model);
  const issue =
    provider === "scripted"
      ? null
      : provider !== "google"
        ? "Unsupported AI_PROVIDER. Use google or scripted."
        : !apiKey
          ? "Google API key is missing."
          : !validModel
            ? "Google model ID is invalid."
            : null;
  return { provider, model, apiKey, issue };
}
export function googleMode(model: string) {
  return `${model.startsWith("gemma-") ? "Gemma" : "Gemini"} · Google AI Studio`;
}
