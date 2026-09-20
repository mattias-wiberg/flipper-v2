import { renderToStaticMarkup } from "react-dom/server";
import { Calendar } from "./calendar";

describe("Calendar", () => {
  it("renders the requested month and day", () => {
    const markup = renderToStaticMarkup(
      <Calendar mode="single" month={new Date(2026, 0, 15)} />,
    );

    expect(markup).toContain("January");
    expect(markup).toContain(">15<");
  });
});
