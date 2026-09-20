import { renderToStaticMarkup } from "react-dom/server";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./resizable";

describe("resizable", () => {
  it("renders v4 groups, panels, and separators", () => {
    const markup = renderToStaticMarkup(
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel>Top</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>Bottom</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(markup).toContain(">Top</div>");
    expect(markup).toContain(">Bottom</div>");
    expect(markup).toContain('aria-orientation="horizontal"');
  });
});
