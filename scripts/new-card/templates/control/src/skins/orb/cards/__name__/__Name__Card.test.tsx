import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { __Name__Card } from "./__Name__Card";
import type { __Name__Entity } from "@scope/core/entities/__name__/types";

const entity: __Name__Entity = { entityId: "__domain__.bedroom", name: "Bedroom", area: "Upstairs", state: "on" };

describe("__Name__Card", () => {
  it("is a state: no glow while on", () => {
    const { container } = render(<__Name__Card entity={entity} onToggle={() => {}} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("state");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd __code__");
  });

  it("toggles from the orb and the pill", () => {
    const onToggle = vi.fn();
    render(<__Name__Card entity={entity} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Bedroom" }));
    fireEvent.click(screen.getByRole("button", { name: /^Bedroom: On/ }));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("says Unavailable and ignores the orb while unavailable", () => {
    const onToggle = vi.fn();
    render(<__Name__Card entity={{ ...entity, state: "unavailable", lastSeen: "08:20" }} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Bedroom" }));
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByText("Last seen 08:20")).toBeTruthy();
  });

  it("keeps one state cue in the compact row", () => {
    const { container } = render(<__Name__Card entity={{ ...entity, state: "off" }} footprint="compact" onToggle={() => {}} />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Off");
  });
});
