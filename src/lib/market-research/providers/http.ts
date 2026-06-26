import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { isBlockedExternalHost, sanitizeExternalUrl } from "@/lib/utils";

const DEFAULT_MAX_BYTES = 700_000;

type ExternalFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  allowedHosts: readonly string[];
};

export async function fetchWithTimeout(url: string, options: ExternalFetchOptions) {
  const safeUrl = sanitizeExternalUrl(url);
  if (!safeUrl) {
    throw new Error("Blocked or invalid external URL");
  }

  const parsedUrl = new URL(safeUrl);
  assertAllowedExternalFetchHost(parsedUrl.hostname, options.allowedHosts);
  await assertResolvedHostIsPublic(parsedUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);

  try {
    const response = await fetch(safeUrl, {
      headers: {
        "User-Agent": "RepoRadar/0.1 (+local research)",
        Accept: "application/rss+xml, application/atom+xml, application/json, text/xml, text/plain;q=0.8"
      },
      signal: controller.signal,
      redirect: "manual"
    });

    if (response.status >= 300 && response.status < 400) {
      throw new Error(`Redirects are not followed for external research URLs (${response.status})`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    assertContentLengthWithinLimit(response, maxBytes);
    return readResponseTextWithLimit(response, maxBytes);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJsonWithTimeout<T>(url: string, options: ExternalFetchOptions) {
  const text = await fetchWithTimeout(url, options);
  return JSON.parse(text) as T;
}

function assertAllowedExternalFetchHost(hostname: string, allowedHosts: readonly string[]) {
  const normalized = normalizeHostname(hostname);
  const allowed = allowedHosts.map(normalizeHostname).filter(Boolean);
  if (!allowed.length || !allowed.includes(normalized)) {
    throw new Error("Blocked external URL host allowlist");
  }
}

function assertContentLengthWithinLimit(response: Response, maxBytes: number) {
  const rawContentLength = response.headers.get("content-length");
  if (!rawContentLength) {
    return;
  }

  const contentLength = Number(rawContentLength);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`External response exceeds ${maxBytes} bytes`);
  }
}

async function readResponseTextWithLimit(response: Response, maxBytes: number) {
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new Error(`External response exceeds ${maxBytes} bytes`);
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error(`External response exceeds ${maxBytes} bytes`);
      }

      text += decoder.decode(value, { stream: true });
    }

    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

async function assertResolvedHostIsPublic(parsedUrl: URL) {
  const hostname = parsedUrl.hostname;
  let addresses: LookupAddress[];

  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Could not resolve external URL host");
  }

  if (!addresses.length || addresses.some((entry) => isBlockedExternalHost(entry.address))) {
    throw new Error("Blocked external URL host resolution");
  }
}

function normalizeHostname(hostname: string) {
  return hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/g, "");
}
