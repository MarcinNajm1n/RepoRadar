import { sanitizeExternalText, sanitizeExternalUrl } from "@/lib/utils";

export function markdownLink(label: unknown, url: unknown) {
  const safeLabel = escapeMarkdownLinkLabel(sanitizeExternalText(label, 240) ?? "link");
  const safeUrl = escapeMarkdownLinkUrl(sanitizeExternalUrl(url, 700) ?? "https://github.com/");

  return `[${safeLabel}](${safeUrl})`;
}

function escapeMarkdownLinkLabel(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function escapeMarkdownLinkUrl(value: string) {
  return value.replace(/\(/g, "%28").replace(/\)/g, "%29");
}
