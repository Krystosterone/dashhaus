import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LcarsAction, LcarsCardFrame } from "./ui";

describe("Lcars generated parts", () => {
  it("names the Card's article after its title, which says it opens a dialog", () => {
    const { getByRole } = render(<LcarsCardFrame name="Ceiling" area="Living room" state="on" summary="80%" />);
    expect(getByRole("article", { name: "Ceiling" })).toBeTruthy();
    expect(getByRole("button", { name: "Ceiling" }).getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("opens a Card's details from its name and closes from the dialog", () => {
    const { getByRole } = render(<LcarsCardFrame name="Ceiling" area="Living room" state="on" summary="80%" />);
    fireEvent.click(getByRole("button", { name: "Ceiling" }));
    expect(getByRole("dialog", { name: "Ceiling details" })).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Close Ceiling details" }));
  });

  it("keeps unavailable actions focusable but inert", () => {
    const onPress = vi.fn();
    const { getByRole } = render(<LcarsAction label="Toggle" unavailable onPress={onPress} />);
    const action = getByRole("button", { name: "Toggle" });
    expect(action.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(action);
    expect(onPress).not.toHaveBeenCalled();
  });
});
