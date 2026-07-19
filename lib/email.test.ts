import { describe, it, expect, afterEach } from "vitest";
import { resolveSiteUrl } from "./email";

describe("resolveSiteUrl", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  it("prefers NEXT_PUBLIC_SITE_URL when set, even over a different request origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://wrapped.gdgbabcock.com";
    expect(resolveSiteUrl("https://some-preview-deploy.vercel.app")).toBe(
      "https://wrapped.gdgbabcock.com"
    );
  });

  it("falls back to the request's own origin when NEXT_PUBLIC_SITE_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(resolveSiteUrl("https://some-preview-deploy.vercel.app")).toBe(
      "https://some-preview-deploy.vercel.app"
    );
  });
});
