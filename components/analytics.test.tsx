import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import { CANONICAL_SITE_URL } from "../site-url-policy.js";

import { Analytics } from "./analytics";

const SCRIPT_URL = "https://umami.mattiaswiberg.com/script.js";
const WEBSITE_ID = "94db1cb1-74f4-4a40-ad6c-962362670409";
const TRACKING_HOSTNAME = new URL(CANONICAL_SITE_URL).hostname;

function clearUmamiEnvironment() {
  delete process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  delete process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
}

describe("Analytics", () => {
  beforeEach(clearUmamiEnvironment);
  afterEach(clearUmamiEnvironment);

  it("renders no tracker when analytics is disabled", () => {
    expect(renderToStaticMarkup(<Analytics />)).toBe("");
  });

  it("renders no tracker and leaks no values on partial configuration", () => {
    process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL = SCRIPT_URL;

    const markup = renderToStaticMarkup(<Analytics />);

    expect(markup).toBe("");
    expect(markup).not.toContain("umami");
    expect(markup).not.toContain(SCRIPT_URL);
  });

  it("renders no tracker and leaks no values on invalid configuration", () => {
    process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL = SCRIPT_URL;
    process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = "not a website id!";

    const markup = renderToStaticMarkup(<Analytics />);

    expect(markup).toBe("");
    expect(markup).not.toContain(SCRIPT_URL);
    expect(markup).not.toContain("not a website id!");
  });

  it("renders the privacy-preserving tracker for a valid configuration", () => {
    process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL = SCRIPT_URL;
    process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = WEBSITE_ID;

    const markup = renderToStaticMarkup(<Analytics />);

    expect(markup).toContain(`src="${SCRIPT_URL}"`);
    expect(markup).toContain(`data-website-id="${WEBSITE_ID}"`);
    expect(markup).toContain(`data-domains="${TRACKING_HOSTNAME}"`);
    expect(markup).toContain('data-exclude-search="true"');
    expect(markup).toContain('data-exclude-hash="true"');
    expect(markup).toContain('data-do-not-track="true"');
    // No authenticated identity is ever attached.
    expect(markup).not.toContain("data-distinct-id");
    // Nothing outside the tracker embed is rendered.
    expect(markup).not.toContain("identify");
    expect(markup).not.toContain("email");
  });

  it("is mounted by the root layout", () => {
    const layout = readFileSync(
      path.join(__dirname, "..", "app", "layout.tsx"),
      "utf8",
    );

    expect(layout).toContain("<Analytics />");
    expect(layout).toContain('from "@/components/analytics"');
  });
});
