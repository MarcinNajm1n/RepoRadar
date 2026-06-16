import { describe, expect, it } from "vitest";
import { rssProviderInternals } from "../../src/lib/market-research/providers/rss";

describe("rss market research provider", () => {
  it("parses feed item snippets without fetching full articles", () => {
    const entries = rssProviderInternals.parseFeedEntries(
      `<?xml version="1.0"?>
      <rss><channel><title>Devtools Blog</title>
        <item>
          <title>Automating developer workflows</title>
          <link>https://example.com/workflows</link>
          <description><![CDATA[Teams save time by removing manual release steps.]]></description>
          <pubDate>Tue, 16 Jun 2026 10:00:00 GMT</pubDate>
        </item>
      </channel></rss>`,
      "https://example.com/feed.xml"
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "Automating developer workflows",
      url: "https://example.com/workflows",
      publisher: "Devtools Blog"
    });
    expect(entries[0].snippet).toContain("Teams save time");
  });
});
