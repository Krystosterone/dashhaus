import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ModuleFrame, useDetails } from "./ui";
import type { FieldFootprint } from "./ui";

function Probe({ footprint, defaultOpen }: { footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const details = useDetails(defaultOpen);
  return (
    <ModuleFrame
      kind="fd-zz"
      name="Probe"
      area="Hall"
      footprint={footprint}
      state="on"
      details={details}
      pict={<i data-testid="pict" />}
      read="ON"
      meta={["Since 10:31"]}
      lead={<b data-testid="lead" />}
      row={<b data-testid="row" />}
    >
      <p>Inside</p>
    </ModuleFrame>
  );
}

describe("ModuleFrame", () => {
  // jsdom has no modal dialog; these do what a browser's do to the `open` attribute.
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
  });

  it("draws a standard module as the screen with its meta lines, then the row", () => {
    const { container } = render(<Probe />);
    expect(container.querySelector(".fd-meta")?.textContent).toBe("Since 10:31");
    expect(screen.getByTestId("row")).toBeTruthy();
    expect(screen.queryByTestId("lead")).toBeNull();
  });

  it("draws a compact row as the lead and the screen, with no meta line or row", () => {
    const { container } = render(<Probe footprint="compact" />);
    expect(container.querySelector(".fd-module")?.getAttribute("data-footprint")).toBe("compact");
    expect(screen.getByTestId("lead")).toBeTruthy();
    expect(container.querySelector(".fd-meta")).toBeNull();
    expect(screen.queryByTestId("row")).toBeNull();
  });

  it("opens its details from the name, and closes them", async () => {
    render(<Probe />);
    expect(screen.queryByText("Inside")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Probe details" }));
    expect(screen.getByRole("dialog", { name: "Probe details" }).textContent).toContain("Inside");
    fireEvent.click(screen.getByRole("button", { name: "Close Probe" }));
    await waitFor(() => expect(screen.queryByText("Inside")).toBeNull());
  });

  it("opens on first render with defaultOpen", () => {
    render(<Probe defaultOpen />);
    expect(screen.getByText("Inside")).toBeTruthy();
  });
});
