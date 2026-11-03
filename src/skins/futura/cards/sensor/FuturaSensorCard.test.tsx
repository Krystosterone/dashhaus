import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FuturaSensorCard } from "./FuturaSensorCard";
import { SENSOR_SEEDS } from "@dashhaus/core/seeds/sensor";

const draw = (seed: keyof typeof SENSOR_SEEDS, defaultOpen = false) => render(<FuturaSensorCard entity={SENSOR_SEEDS[seed].entity} defaultOpen={defaultOpen} />);

describe("FuturaSensorCard", () => {
  it("keeps the entity identity and unavailable state explicit", () => {
    const available = draw("living");
    expect(available.getByRole("button", { name: SENSOR_SEEDS.living.entity.name })).toBeTruthy();
    const unavailable = draw("garage");
    expect(unavailable.container.querySelector(".futura-card")?.getAttribute("data-state")).toBe("unavailable");
    expect(unavailable.getByText("Unavailable")).toBeTruthy();
  });

  it("opens its domain facts in Details", () => {
    const view = draw("living");
    fireEvent.click(view.getByRole("button", { name: SENSOR_SEEDS.living.entity.name }));
    expect(view.getByRole("dialog").textContent).toContain(SENSOR_SEEDS.living.entity.entityId);
  });
});
