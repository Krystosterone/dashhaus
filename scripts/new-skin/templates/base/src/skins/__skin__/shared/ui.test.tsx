import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { __Skin__Action, __Skin__CardFrame } from "./ui";

describe("__Section__ generated parts", () => {
  it("opens a Card's details from its name and closes from the dialog", () => {
    const { getByRole } = render(<__Skin__CardFrame name="Ceiling" area="Living room" state="on" summary="80%" />);
    fireEvent.click(getByRole("button", { name: "Ceiling" }));
    expect(getByRole("dialog", { name: "Ceiling details" })).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Close Ceiling details" }));
  });

  it("keeps unavailable actions focusable but inert", () => {
    const onPress = vi.fn();
    const { getByRole } = render(<__Skin__Action label="Toggle" unavailable onPress={onPress} />);
    const action = getByRole("button", { name: "Toggle" });
    expect(action.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(action);
    expect(onPress).not.toHaveBeenCalled();
  });
});
