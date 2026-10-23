import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { __Name__Widget } from "./__Name__Widget";
import type { __Name__Entity } from "./types";

const entity: __Name__Entity = { entityId: "__domain__.living_room", name: "Living room", area: "Ground floor", state: "ok", value: 42.25, unit: "ppm" };

describe("__Name__Widget", () => {
  it("is a reading: no glow, a bare icon, its class prefix", () => {
    const { container } = render(<__Name__Widget entity={entity} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("reading");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd __code__");
    expect(container.querySelector(".hd-orb--static")).not.toBeNull();
  });

  it("reads the figure aloud and opens details from it", () => {
    const onOpenDetails = vi.fn();
    render(<__Name__Widget entity={entity} onOpenDetails={onOpenDetails} />);
    screen.getByRole("button", { name: "Living room: 42.3 ppm. Open details" }).click();
    expect(onOpenDetails).toHaveBeenCalled();
  });

  it("waits for a first reading in words", () => {
    render(<__Name__Widget entity={{ ...entity, value: undefined }} />);
    expect(screen.getByRole("img", { name: "no reading yet" })).toBeTruthy();
  });

  it("hides the last value while unavailable", () => {
    const { container } = render(<__Name__Widget entity={{ ...entity, state: "unavailable", lastSeen: "08:20" }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Unavailable");
    expect(screen.queryByText("42.3")).toBeNull();
  });

  it("puts symbol units on the figure and word units after a space", () => {
    const { container, rerender } = render(<__Name__Widget entity={{ ...entity, value: 650 }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("650 ppm");
    rerender(<__Name__Widget entity={{ ...entity, value: 41, unit: "%" }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("41%");
  });
});
