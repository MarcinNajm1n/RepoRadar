import { describe, expect, it } from "vitest";
import { sanitizeExternalUrl } from "../../src/lib/utils";

describe("sanitizeExternalUrl", () => {
  it("blocks private and local targets", () => {
    expect(sanitizeExternalUrl("http://localhost:3000")).toBeNull();
    expect(sanitizeExternalUrl("https://127.0.0.1/admin")).toBeNull();
    expect(sanitizeExternalUrl("http://10.0.0.5/metadata")).toBeNull();
    expect(sanitizeExternalUrl("http://192.168.1.1/router")).toBeNull();
    expect(sanitizeExternalUrl("http://[::1]/admin")).toBeNull();
    expect(sanitizeExternalUrl("http://[fe80::1]/metadata")).toBeNull();
    expect(sanitizeExternalUrl("http://[fc00::1]/internal")).toBeNull();
    expect(sanitizeExternalUrl("http://[::ffff:127.0.0.1]/admin")).toBeNull();
    expect(sanitizeExternalUrl("http://[::ffff:10.0.0.5]/metadata")).toBeNull();
    expect(sanitizeExternalUrl("http://localhost./admin")).toBeNull();
    expect(sanitizeExternalUrl("http://sub.localhost./admin")).toBeNull();
    expect(sanitizeExternalUrl("http://example.local./metadata")).toBeNull();
    expect(sanitizeExternalUrl("javascript:alert(1)")).toBeNull();
  });

  it("blocks special-use IPv6 literal targets", () => {
    expect(sanitizeExternalUrl("http://[::2]/metadata")).toBeNull();
    expect(sanitizeExternalUrl("http://[64:ff9b::7f00:1]/metadata")).toBeNull();
    expect(sanitizeExternalUrl("http://[100::1]/metadata")).toBeNull();
    expect(sanitizeExternalUrl("http://[2001:db8::1]/metadata")).toBeNull();
    expect(sanitizeExternalUrl("http://[2001:0000:4136:e378:8000:63bf:3fff:fdd2]/metadata")).toBeNull();
    expect(sanitizeExternalUrl("http://[2002:0a00:0001::]/metadata")).toBeNull();
    expect(sanitizeExternalUrl("http://[ff02::1]/metadata")).toBeNull();
  });

  it("blocks URLs with embedded credentials", () => {
    expect(sanitizeExternalUrl("https://token@example.com/repo")).toBeNull();
    expect(sanitizeExternalUrl("https://user:secret@example.com/repo")).toBeNull();
    expect(sanitizeExternalUrl("https://example.com@evil.test/repo")).toBeNull();
  });

  it("allows public http and https URLs", () => {
    expect(sanitizeExternalUrl("https://example.com/post")).toBe("https://example.com/post");
    expect(sanitizeExternalUrl("http://example.org/feed")).toBe("http://example.org/feed");
    expect(sanitizeExternalUrl("https://[2606:4700:4700::1111]/dns-query")).toBe("https://[2606:4700:4700::1111]/dns-query");
  });
});
