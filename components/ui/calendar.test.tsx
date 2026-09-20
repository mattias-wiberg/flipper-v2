import { renderToStaticMarkup } from "react-dom/server";
import { Calendar } from "./calendar";

describe("Calendar", () => {
  it("renders with the current DayPicker API", () => {
    const markup = renderToStaticMarkup(
      <Calendar mode="single" month={new Date(2026, 0, 15)} />,
    );

    expect(markup).toContain('data-slot="calendar"');
    expect(markup).toContain("w-full border-collapse");
  });
});
