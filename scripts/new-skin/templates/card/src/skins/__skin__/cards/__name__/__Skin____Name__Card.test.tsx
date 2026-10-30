import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { __Skin____Name__Card } from "./__Skin____Name__Card";
import { __seedConst__ } from "./demo/__seedFile__";

const draw = (seed: keyof typeof __seedConst__, defaultOpen = false) => render(<__Skin____Name__Card entity={__seedConst__[seed].entity}__testProps__ defaultOpen={defaultOpen} />);

describe("__Skin____Name__Card", () => {
  it("keeps the entity identity and unavailable state explicit", () => {
    const available = draw("__firstSeed__");
    expect(available.getByRole("button", { name: __seedConst__.__firstSeed__.entity.name })).toBeTruthy();
    const unavailable = draw("__unavailableSeed__");
    expect(unavailable.container.querySelector(".__skin__-card")?.getAttribute("data-state")).toBe("unavailable");
    expect(unavailable.getByText("Unavailable")).toBeTruthy();
  });

  it("opens its domain facts in Details", () => {
    const view = draw("__firstSeed__");
    fireEvent.click(view.getByRole("button", { name: __seedConst__.__firstSeed__.entity.name }));
    expect(view.getByRole("dialog").textContent).toContain(__seedConst__.__firstSeed__.entity.entityId);
  });
});
