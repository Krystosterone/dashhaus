import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlasshouseLockCard } from "./GlasshouseLockCard";
import { LOCK_SEEDS } from "@dashhaus/core/seeds/lock";

const draw = (seed: keyof typeof LOCK_SEEDS, defaultOpen = false) => render(<GlasshouseLockCard entity={LOCK_SEEDS[seed].entity} defaultOpen={defaultOpen} />);

describe("GlasshouseLockCard", () => {
  it("keeps the entity identity and unavailable state explicit", () => {
    const available = draw("locked");
    expect(available.getByRole("button", { name: LOCK_SEEDS.locked.entity.name })).toBeTruthy();
    const unavailable = draw("unavailable");
    expect(unavailable.container.querySelector(".glasshouse-card")?.getAttribute("data-state")).toBe("unavailable");
    expect(unavailable.getByText("Unavailable")).toBeTruthy();
  });

  it("opens its domain facts in Details", () => {
    const view = draw("locked");
    fireEvent.click(view.getByRole("button", { name: LOCK_SEEDS.locked.entity.name }));
    expect(view.getByRole("dialog").textContent).toContain(LOCK_SEEDS.locked.entity.entityId);
  });
});
