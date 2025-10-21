const DEFAULT_OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAIClient {
  constructor({ apiKey, baseUrl } = {}) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN;
    this.baseUrl = baseUrl || process.env.OPENAI_API_URL || DEFAULT_OPENAI_URL;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async generateJson(model, system, developer, user) {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is not configured");
    }

    const messages = [
      { role: "system", content: system },
      ...(developer ? [{ role: "developer", content: developer }] : []),
      { role: "user", content: user }
    ];

    const body = {
      model,
      response_format: { type: "json_object" },
      messages
    };

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    let responseJson;

    if (!response.ok) {
      let errorMessage;
      try {
        responseJson = await response.json();
        errorMessage = responseJson?.error?.message || JSON.stringify(responseJson);
      } catch (_error) {
        errorMessage = await response.text();
      }
      const error = new Error(errorMessage || response.statusText || "OpenAI request failed");
      error.statusCode = response.status;
      throw error;
    }

    responseJson = responseJson ?? (await response.json());

    const content = responseJson?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      const parsingError = new Error("Failed to parse JSON response from OpenAI");
      parsingError.cause = error;
      throw parsingError;
    }
  }
}
