import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateOpenAiText } from "../../src/lib/openai/client";

const originalFetch = global.fetch;
const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
const originalOpenAiModel = process.env.OPENAI_MODEL;

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.OPENAI_MODEL = "gpt-test";
});

afterEach(() => {
  global.fetch = originalFetch;
  restoreEnv("OPENAI_API_KEY", originalOpenAiApiKey);
  restoreEnv("OPENAI_MODEL", originalOpenAiModel);
  vi.restoreAllMocks();
});

describe("generateOpenAiText", () => {
  it("posts a non-stored Responses API request and returns trimmed output text", async () => {
    const fetchMock = vi.fn(
      async (..._args: Parameters<typeof fetch>) => new Response(JSON.stringify({ output_text: "  gotowe  " }), { status: 200 })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(generateOpenAiText("instructions", "input", { maxOutputTokens: 128 })).resolves.toBe("gotowe");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-openai-key"
        })
      })
    );
    const requestInit = fetchMock.mock.calls[0][1];
    if (!requestInit) {
      throw new Error("Missing OpenAI request init");
    }

    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      model: "gpt-test",
      instructions: "instructions",
      input: "input",
      store: false,
      max_output_tokens: 128
    });
  });

  it("rejects oversized successful responses before parsing them", async () => {
    const fetchMock = vi.fn(
      async (..._args: Parameters<typeof fetch>) =>
        new Response(JSON.stringify({ output_text: "ignored" }), {
          status: 200,
          headers: {
            "content-length": "1000001"
          }
        })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(generateOpenAiText("instructions", "input")).rejects.toThrow("OpenAI response exceeds 1000000 bytes");
  });

  it("rejects invalid successful JSON responses explicitly", async () => {
    const fetchMock = vi.fn(async (..._args: Parameters<typeof fetch>) => new Response("not-json", { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(generateOpenAiText("instructions", "input")).rejects.toThrow("OpenAI response was not valid JSON");
  });
});
