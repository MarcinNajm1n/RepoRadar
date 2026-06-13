import { getConfig } from "@/lib/config";

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

function collectOutputText(response: OpenAiResponse) {
  if (response.output_text) {
    return response.output_text.trim();
  }

  const parts =
    response.output?.flatMap((item) =>
      item.content?.flatMap((content) => (content.type === "output_text" && content.text ? [content.text] : [])) ?? []
    ) ?? [];

  return parts.join("\n").trim();
}

export async function generateOpenAiText(instructions: string, input: string) {
  const config = getConfig();
  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openAiApiKey}`
    },
    body: JSON.stringify({
      model: config.openAiModel,
      instructions,
      input,
      store: false
    })
  });

  const data = (await response.json()) as OpenAiResponse;
  if (!response.ok) {
    throw new Error(`OpenAI API ${response.status}: ${data.error?.message ?? "request failed"}`);
  }

  const text = collectOutputText(data);
  if (!text) {
    throw new Error("OpenAI response did not contain text output");
  }

  return text;
}
