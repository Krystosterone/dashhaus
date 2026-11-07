import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Key, ModuleFrame, Picture, useDetails } from "./ui";
import type { FieldFootprint } from "./ui";
import { PICTURE_WORDS } from "@dashhaus/core/entities/picture";

function Probe({ footprint, defaultOpen, warning, note }: { footprint?: FieldFootprint; defaultOpen?: boolean; warning?: string; note?: string }) {
  const details = useDetails(defaultOpen);
  return (
    <ModuleFrame
      kind="fd-zz"
      name="Probe"
      area="Hall"
      footprint={footprint}
      state="on"
      warning={warning}
      note={note}
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
    fireEvent.click(screen.getByRole("button", { name: "Close Probe details" }));
    await waitFor(() => expect(screen.queryByText("Inside")).toBeNull());
  });

  it("prints a note in place of the area, a warning before either, and keeps the area in the panel", () => {
    const { container, rerender } = render(<Probe note="Base off" defaultOpen />);
    expect(container.querySelector(".fd-module .fd-area")?.textContent).toBe("Base off");
    expect(screen.getByRole("dialog", { name: "Probe details" }).querySelector(".fd-area")?.textContent).toBe("Hall");
    rerender(<Probe note="Base off" warning="Sock off" defaultOpen />);
    expect(container.querySelector(".fd-module .fd-area")?.textContent).toBe("Warning: Sock off");
  });

  it("opens on first render with defaultOpen", () => {
    render(<Probe defaultOpen />);
    expect(screen.getByText("Inside")).toBeTruthy();
  });
});

describe("Key", () => {
  it("lies flat while unavailable but stays focusable: a tap does nothing, a hold still opens the details", () => {
    vi.useFakeTimers();
    const onPress = vi.fn();
    const onHold = vi.fn();
    render(<Key label="Lamp" pressed unavailable onPress={onPress} onHold={onHold}>{null}</Key>);
    const key = screen.getByRole("button", { name: "Lamp" }) as HTMLButtonElement;
    expect(key.disabled).toBe(false);
    expect(key.getAttribute("aria-disabled")).toBe("true");
    expect(key.querySelector(".fd-led")?.getAttribute("data-lit")).toBe("false");
    fireEvent.click(key);
    expect(onPress).not.toHaveBeenCalled();
    fireEvent.pointerDown(key, { button: 0 });
    act(() => vi.advanceTimersByTime(450));
    expect(onHold).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("marks the chosen key of a group as pressed, and pressing it again does nothing", () => {
    const onPress = vi.fn();
    render(<Key label="Home" chosen onPress={onPress} caption="Home">{null}</Key>);
    const key = screen.getByRole("button", { name: "Home" });
    expect(key.getAttribute("aria-pressed")).toBe("true");
    expect(key.hasAttribute("data-chosen")).toBe(true);
    fireEvent.click(key);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("Picture", () => {
  const frame = { ref: () => {}, src: "data:image/png;base64,AA==", status: "ready" as const };
  it("is the button that opens it, labelled by what it is and what the press does", () => {
    const onOpen = vi.fn();
    render(<Picture picture={frame} label="Front door camera" onOpen={onOpen} openLabel="Open live view" />);
    fireEvent.click(screen.getByRole("button", { name: "Front door camera. Open live view" }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
  it("takes no press or focus while unavailable, and draws no frame: a camera that is gone has nothing to open", () => {
    const onOpen = vi.fn();
    const { container } = render(<Picture picture={frame} label="Front door camera" onOpen={onOpen} unavailable />);
    expect(screen.queryByRole("button")).toBeNull();
    const box = screen.getByRole("img", { name: "Front door camera" });
    fireEvent.click(box);
    expect(onOpen).not.toHaveBeenCalled();
    expect(container.querySelector("img")).toBeNull();
  });
  it("draws no word over the picture in any state: the card's own line says how old a still is (spec/cards.md)", () => {
    for (const status of ["none", "loading", "ready", "stale", "failed"] as const) {
      for (const unavailable of [false, true]) {
        const { container, unmount } = render(<Picture picture={{ ...frame, status }} label="Front door camera" onOpen={() => {}} unavailable={unavailable} />);
        expect(container.textContent, `${status}${unavailable ? ", unavailable" : ""}`).toBe("");
        unmount();
      }
    }
  });
  it("says core's words for its press where the card names none", () => {
    render(<Picture picture={frame} label="Artwork" onOpen={() => {}} />);
    expect(screen.getByRole("button", { name: `Artwork. ${PICTURE_WORDS.open}` })).toBeTruthy();
  });
});
