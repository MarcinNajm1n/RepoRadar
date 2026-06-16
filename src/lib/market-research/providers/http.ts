import { sanitizeExternalUrl } from "@/lib/utils";

export async function fetchWithTimeout(url: string, options: { timeoutMs?: number; maxBytes?: number } = {}) {
  const safeUrl = sanitizeExternalUrl(url);
  if (!safeUrl) {
    throw new Error("Blocked or invalid external URL");
  }

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

    const text = await response.text();
    return text.slice(0, options.maxBytes ?? 700_000);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJsonWithTimeout<T>(url: string, options: { timeoutMs?: number; maxBytes?: number } = {}) {
  const text = await fetchWithTimeout(url, options);
  return JSON.parse(text) as T;
}
