import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FuturaToggleCard } from "./FuturaToggleCard";
import { TOGGLE_SEEDS } from "./demo/useDemoToggle";

const draw = (seed: keyof typeof TOGGLE_SEEDS, defaultOpen = false) => render(<FuturaToggleCard entity={TOGGLE_SEEDS[seed].entity} defaultOpen={defaultOpen} />);

describe("FuturaToggleCard", () => {
  it("keeps the entity identity and unavailable state explicit", () => {
    const available = draw("dnd");
    expect(available.getByRole("button", { name: TOGGLE_SEEDS.dnd.entity.name })).toBeTruthy();
    const unavailable = draw("unavailable");
    expect(unavailable.container.querySelector(".futura-card")?.getAttribute("data-state")).toBe("unavailable");
    expect(unavailable.getByText("Unavailable")).toBeTruthy();
  });

  it("opens its domain facts in Details", () => {
    const view = draw("dnd");
    fireEvent.click(view.getByRole("button", { name: TOGGLE_SEEDS.dnd.entity.name }));
    expect(view.getByRole("dialog").textContent).toContain(TOGGLE_SEEDS.dnd.entity.entityId);
  });
});
