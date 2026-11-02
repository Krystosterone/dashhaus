import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FuturaLightCard } from "./FuturaLightCard";
import { SEEDS } from "./demo/useDemoLight";

const draw = (seed: keyof typeof SEEDS, defaultOpen = false) => render(<FuturaLightCard entity={SEEDS[seed].entity} defaultOpen={defaultOpen} />);

describe("FuturaLightCard", () => {
  it("keeps the entity identity and unavailable state explicit", () => {
    const available = draw("dimmable");
    expect(available.getByRole("button", { name: SEEDS.dimmable.entity.name })).toBeTruthy();
    const unavailable = draw("unavailable");
    expect(unavailable.container.querySelector(".futura-card")?.getAttribute("data-state")).toBe("unavailable");
    expect(unavailable.getByText("Unavailable")).toBeTruthy();
  });

  it("opens its domain facts in Details", () => {
    const view = draw("dimmable");
    fireEvent.click(view.getByRole("button", { name: SEEDS.dimmable.entity.name }));
    expect(view.getByRole("dialog").textContent).toContain(SEEDS.dimmable.entity.entityId);
  });
});
