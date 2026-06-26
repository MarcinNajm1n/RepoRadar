import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn()
}));

vi.mock("node:dns/promises", () => ({
  lookup: mocks.lookup
}));

import { fetchWithTimeout } from "../../src/lib/market-research/providers/http";

const originalFetch = global.fetch;

beforeEach(() => {
  mocks.lookup.mockReset();
  global.fetch = vi.fn(async (...args: Parameters<typeof fetch>) => {
    void args;
    return new Response("research payload", { status: 200 });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("fetchWithTimeout", () => {
  it("fetches public external hosts after DNS validation", async () => {
    mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);

    await expect(fetchWithTimeout("https://example.com/feed", { maxBytes: 8, allowedHosts: ["example.com"] })).resolves.toBe(
      "research"
    );

    expect(mocks.lookup).toHaveBeenCalledWith("example.com", { all: true, verbatim: true });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/feed",
      expect.objectContaining({
        redirect: "manual"
      })
    );
  });

  it("blocks hosts when any resolved address is private", async () => {
    mocks.lookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.5", family: 4 }
    ]);

    await expect(fetchWithTimeout("https://research.example/feed", { allowedHosts: ["research.example"] })).rejects.toThrow(
      "Blocked external URL host resolution"
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("blocks hosts that resolve to private IPv6 addresses", async () => {
    mocks.lookup.mockResolvedValue([{ address: "fd00::1", family: 6 }]);

    await expect(fetchWithTimeout("https://research.example/feed", { allowedHosts: ["research.example"] })).rejects.toThrow(
      "Blocked external URL host resolution"
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("blocks hosts outside the explicit provider allowlist before DNS", async () => {
    await expect(fetchWithTimeout("https://evil.example/feed", { allowedHosts: ["example.com"] })).rejects.toThrow(
      "Blocked external URL host allowlist"
    );

    expect(mocks.lookup).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fails closed when DNS cannot resolve an external host", async () => {
    mocks.lookup.mockRejectedValue(new Error("getaddrinfo ENOTFOUND research.example"));

    await expect(fetchWithTimeout("https://research.example/feed", { allowedHosts: ["research.example"] })).rejects.toThrow(
      "Could not resolve external URL host"
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
