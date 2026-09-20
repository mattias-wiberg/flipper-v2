import { renderToStaticMarkup } from "react-dom/server";
import { Command, CommandInput } from "./command";

describe("CommandInput", () => {
  it("owns the standalone search icon size", () => {
    const markup = renderToStaticMarkup(
      <Command>
        <CommandInput />
      </Command>,
    );

    expect(markup).toContain("mr-2 size-4 shrink-0");
  });
});
