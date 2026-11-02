import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FuturaClimateCard } from "./FuturaClimateCard";
import { CLIMATE_SEEDS } from "./demo/useDemoClimate";

const draw = (seed: keyof typeof CLIMATE_SEEDS, defaultOpen = false) => render(<FuturaClimateCard entity={CLIMATE_SEEDS[seed].entity} defaultOpen={defaultOpen} />);

describe("FuturaClimateCard", () => {
  it("keeps the entity identity and unavailable state explicit", () => {
    const available = draw("heating");
    expect(available.getByRole("button", { name: CLIMATE_SEEDS.heating.entity.name })).toBeTruthy();
    const unavailable = draw("unavailable");
    expect(unavailable.container.querySelector(".futura-card")?.getAttribute("data-state")).toBe("unavailable");
    expect(unavailable.getByText("Unavailable")).toBeTruthy();
  });

  it("opens its domain facts in Details", () => {
    const view = draw("heating");
    fireEvent.click(view.getByRole("button", { name: CLIMATE_SEEDS.heating.entity.name }));
    expect(view.getByRole("dialog").textContent).toContain(CLIMATE_SEEDS.heating.entity.entityId);
  });
});
