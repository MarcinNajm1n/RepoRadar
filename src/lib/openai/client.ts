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

export type OpenAiResponsesTool =
  | {
      type: "web_search";
      search_context_size?: "low" | "medium" | "high";
      filters?: {
        allowed_domains?: string[];
        blocked_domains?: string[];
      };
      external_web_access?: boolean;
      return_token_budget?: "default" | "unlimited";
      user_location?: {
        type: "approximate";
        country?: string;
        city?: string;
        region?: string;
      };
    }
  | {
      type: "mcp";
      server_label: string;
      server_url: string;
      server_description?: string;
      require_approval: "always" | "never";
      allowed_tools?: string[];
    };

export type GenerateOpenAiTextOptions = {
  tools?: OpenAiResponsesTool[];
  toolChoice?: "auto" | "required";
  include?: string[];
  maxOutputTokens?: number;
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

export function buildOpenAiResponsesBody(
  model: string,
  instructions: string,
  input: string,
  options: GenerateOpenAiTextOptions = {}
) {
  return {
    model,
    instructions,
    input,
    store: false,
    ...(options.maxOutputTokens ? { max_output_tokens: options.maxOutputTokens } : {}),
    ...(options.tools ? { tools: options.tools } : {}),
    ...(options.toolChoice ? { tool_choice: options.toolChoice } : {}),
    ...(options.include ? { include: options.include } : {})
  };
}

export async function generateOpenAiText(instructions: string, input: string, options: GenerateOpenAiTextOptions = {}) {
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
    body: JSON.stringify(buildOpenAiResponsesBody(config.openAiModel, instructions, input, options))
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
