const DEFAULT_OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAIClient {
  constructor({ apiKey, baseUrl } = {}) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN;
    this.baseUrl = baseUrl || process.env.OPENAI_API_URL || DEFAULT_OPENAI_URL;
  }

  async generateJson(model, system, developer, user) {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is not configured");
    }

    const body = {
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "developer", content: developer },
        { role: "user", content: user }
      ]
    };

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || response.statusText);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error("Failed to parse JSON response from OpenAI");
    }
  }
}
