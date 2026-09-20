import { renderToStaticMarkup } from "react-dom/server";
import { Command, CommandInput } from "./command";

describe("CommandInput", () => {
  it("renders an accessible search field", () => {
    const markup = renderToStaticMarkup(
      <Command>
        <CommandInput placeholder="Search deals" />
      </Command>,
    );

    expect(markup).toContain('placeholder="Search deals"');
  });
});
