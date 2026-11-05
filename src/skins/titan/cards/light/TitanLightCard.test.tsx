import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitanLightCard } from "./TitanLightCard";
import { LIGHT_SEEDS } from "@dashhaus/core/seeds/light";

const draw = (seed: keyof typeof LIGHT_SEEDS, defaultOpen = false) => render(<TitanLightCard entity={LIGHT_SEEDS[seed].entity} defaultOpen={defaultOpen} />);

describe("TitanLightCard", () => {
  it("keeps the entity identity and unavailable state explicit", () => {
    const available = draw("dimmable");
    expect(available.getByRole("button", { name: LIGHT_SEEDS.dimmable.entity.name })).toBeTruthy();
    const unavailable = draw("unavailable");
    expect(unavailable.container.querySelector(".titan-card")?.getAttribute("data-state")).toBe("unavailable");
    expect(unavailable.getByText("Unavailable")).toBeTruthy();
  });

  it("opens its domain facts in Details", () => {
    const view = draw("dimmable");
    fireEvent.click(view.getByRole("button", { name: LIGHT_SEEDS.dimmable.entity.name }));
    expect(view.getByRole("dialog").textContent).toContain(LIGHT_SEEDS.dimmable.entity.entityId);
  });
});
