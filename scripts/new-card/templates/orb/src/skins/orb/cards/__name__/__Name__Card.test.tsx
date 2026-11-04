import { __testImports__ } from "@testing-library/react";
import { describe, expect, it__viImport__ } from "vitest";
import { __Name__Card } from "./__Name__Card";
import { __CONST___SEEDS } from "__seeds__";

describe("__Name__Card", () => {
  it("draws in the card frame, with its class prefix and its colour role", () => {
    const { container } = render(<__Name__Card entity={__CONST___SEEDS.__firstSeed__.entity} />);
    const card = container.querySelector("article");
    expect(card?.className).toBe("hd __code__");
    expect(card?.getAttribute("data-role")).toBe("__role__");
  });

  it("says Unavailable while it is", () => {
    const { container } = render(<__Name__Card entity={__CONST___SEEDS.__unavailableSeed__.entity} />);
    expect(container.querySelector(".hd-unav")?.textContent).toContain("Unavailable");
  });
__guardTest__
});
