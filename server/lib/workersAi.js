const DEFAULT_API_HOST = "https://api.cloudflare.com";

const resolveBinding = () => {
  if (typeof WORKERS_AI !== "undefined") {
    return WORKERS_AI;
  }

  if (typeof AI !== "undefined") {
    return AI;
  }

  return undefined;
};

export class WorkersAIClient {
  constructor({ binding, apiKey, accountId, baseUrl } = {}) {
    this.binding = binding || resolveBinding();
    this.apiKey =
      apiKey ||
      process.env.CF_AI_KEY ||
      process.env.WORKERS_AI_KEY ||
      process.env.WORKERS_KEY ||
      process.env.CLOUDFLARE_API_KEY ||
      "";
    this.accountId = accountId || process.env.CF_ACCOUNT_ID || process.env.WORKERS_ACCOUNT_ID || "";
    this.baseUrl = baseUrl || process.env.WORKERS_AI_BASE_URL || "";
  }

  async run(model, payload) {
    if (!model) {
      throw new Error("A model identifier is required to call Workers AI");
    }

    if (this.binding && typeof this.binding.run === "function") {
      return this.binding.run(model, payload);
    }

    const accountId = this.accountId;
    const apiKey = this.apiKey;

    if (!accountId) {
      throw new Error("Workers AI account id is not configured");
    }

    if (!apiKey) {
      throw new Error("Workers AI API key is not configured");
    }

    const baseUrl = this.baseUrl || `${DEFAULT_API_HOST}/client/v4/accounts/${accountId}/ai/run/`;
    const url = baseUrl.endsWith("/") ? `${baseUrl}${model}` : `${baseUrl}/${model}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    const json = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorDetail = json?.errors?.map((item) => item?.message || JSON.stringify(item)).join("; ");
      const errorText = errorDetail || (isJson ? JSON.stringify(json) : await response.text());
      throw new Error(errorText || response.statusText);
    }

    if (json && json.success === false) {
      const errorDetail = json?.errors?.map((item) => item?.message || JSON.stringify(item)).join("; ");
      const error = new Error(errorDetail || "Workers AI request failed");
      error.details = json?.errors;
      throw error;
    }

    return json?.result;
  }

  async generateJson(model, system, developer, user) {
    const messages = [
      { role: "system", content: system },
      ...(developer ? [{ role: "system", content: developer }] : []),
      { role: "user", content: user }
    ];

    let result;

    try {
      result = await this.run(model, { messages });
    } catch (error) {
      if (error && !error.message?.includes("Workers AI")) {
        error.message = `Workers AI request failed: ${error.message}`;
      }
      throw error;
    }

    const content = result?.response || result?.output_text || result;

    if (!content || (typeof content !== "string" && typeof content !== "object")) {
      throw new Error("Workers AI returned an empty response");
    }

    if (typeof content === "object") {
      return content;
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      const parsingError = new Error("Failed to parse JSON response from Workers AI");
      parsingError.cause = error;
      throw parsingError;
    }
  }
}
