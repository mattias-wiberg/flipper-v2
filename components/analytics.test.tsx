import { renderToStaticMarkup } from "react-dom/server";

import { Analytics } from "./analytics";

const SCRIPT_URL = "https://umami.mattiaswiberg.com/script.js";
const WEBSITE_ID = "94db1cb1-74f4-4a40-ad6c-962362670409";

describe("Analytics", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
    delete process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
    delete process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    jest.restoreAllMocks();
  });

  it("renders no tracker when analytics is disabled", () => {
    expect(renderToStaticMarkup(<Analytics />)).toBe("");
  });

  it("renders no tracker and leaks no values on partial configuration", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL = SCRIPT_URL;

    const markup = renderToStaticMarkup(<Analytics />);

    expect(markup).toBe("");
    expect(markup).not.toContain("umami");
    expect(markup).not.toContain(SCRIPT_URL);

    const diagnostic = String(warn.mock.calls[0]?.[0] ?? "");
    expect(diagnostic).toContain("NEXT_PUBLIC_UMAMI_SCRIPT_URL");
    expect(diagnostic).toContain("NEXT_PUBLIC_UMAMI_WEBSITE_ID");
    expect(diagnostic).not.toContain(SCRIPT_URL);
  });

  it("renders the privacy-preserving tracker for a valid configuration", () => {
    process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL = SCRIPT_URL;
    process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = WEBSITE_ID;

    const markup = renderToStaticMarkup(<Analytics />);

    expect(markup).toContain(`src="${SCRIPT_URL}"`);
    expect(markup).toContain(`data-website-id="${WEBSITE_ID}"`);
    expect(markup).toContain(`data-domains="beta.flipper.mattiaswiberg.com"`);
    expect(markup).toContain('data-exclude-search="true"');
    expect(markup).toContain('data-exclude-hash="true"');
    expect(markup).toContain('data-do-not-track="true"');
    // No authenticated identity is ever attached.
    expect(markup).not.toContain("data-distinct-id");
    // Nothing outside the tracker embed is rendered.
    expect(markup).not.toContain("identify");
    expect(markup).not.toContain("email");
  });
});
