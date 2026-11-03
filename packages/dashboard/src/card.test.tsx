import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CardDialog, cardShape, detailsSheet, detailsTile, useCardFrame, useDetails } from "./card";
import type { ActionCardProps, CardProps, CardSheetProps } from "./card";

describe("cardShape", () => {
  it("defaults to a standard card with its inline control", () => {
    expect(cardShape()).toEqual({ sheet: false, compact: false, featured: false, bare: false, footprint: "standard" });
  });

  it("draws a compact card, bare when its control is hidden", () => {
    expect(cardShape({ footprint: "compact" })).toMatchObject({ compact: true, bare: false, footprint: "compact" });
    expect(cardShape({ footprint: "compact", showControl: false })).toMatchObject({ compact: true, bare: true });
  });

  it("draws a featured card", () => {
    expect(cardShape({ footprint: "featured" })).toMatchObject({ compact: false, featured: true });
  });

  it("ignores the footprint and the control in the sheet", () => {
    expect(cardShape({ variant: "sheet", footprint: "compact", showControl: false })).toMatchObject({
      sheet: true,
      compact: false,
      featured: false,
      bare: false,
    });
  });
});

describe("useCardFrame", () => {
  it("labels the article by the name, and keeps the same ids across a render", () => {
    const { result, rerender } = renderHook(() => useCardFrame({ footprint: "compact", showControl: false }));
    expect(result.current.article["aria-labelledby"]).toBe(result.current.nameId);
    expect(result.current.nameId).toBe(`${result.current.uid}-n`);
    expect(result.current.bare).toBe(true);
    const uid = result.current.uid;
    rerender();
    expect(result.current.uid).toBe(uid);
  });
});

describe("useDetails", () => {
  it("starts closed, opens and closes", () => {
    const { result } = renderHook(() => useDetails());
    expect(result.current.open).toBe(false);
    act(() => result.current.openDetails());
    expect(result.current.open).toBe(true);
    act(() => result.current.closeDetails());
    expect(result.current.open).toBe(false);
  });

  it("starts open with defaultOpen", () => {
    const { result } = renderHook(() => useDetails(true));
    expect(result.current.open).toBe(true);
  });

  it("opens on an action, and forgets it when it closes", () => {
    const { result } = renderHook(() => useDetails<"unlock">());
    act(() => result.current.openDetails("unlock"));
    expect(result.current).toMatchObject({ open: true, action: "unlock" });
    act(() => result.current.closeDetails());
    expect(result.current).toMatchObject({ open: false, action: undefined });
  });

  it("starts open on defaultAction", () => {
    const { result } = renderHook(() => useDetails(false, "unlock"));
    expect(result.current).toMatchObject({ open: true, action: "unlock" });
  });

  it("takes no action from a click handed straight through", () => {
    const { result } = renderHook(() => useDetails<{ kind: string }>());
    act(() => result.current.openDetails(new MouseEvent("click") as unknown as { kind: string }));
    expect(result.current).toMatchObject({ open: true, action: undefined });
  });
});

/** The dialogs' `open` attribute in jsdom, as a browser's showModal/close would set it. */
beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
});

function DialogProbe() {
  const details = useDetails();
  return (
    <>
      <button type="button" onClick={details.openDetails}>Open</button>
      <CardDialog
        open={details.open}
        onClose={details.closeDetails}
        label="Probe details"
        className="probe-dialog"
        handle=".probe-head"
        snapBack="translate 300ms linear"
      >
        <div className="probe-head"><button type="button" onClick={details.closeDetails}>Close</button></div>
      </CardDialog>
    </>
  );
}

describe("CardDialog", () => {
  it("is a native dialog that mounts its content while it is open", () => {
    vi.useFakeTimers();
    const { container } = render(<DialogProbe />);
    expect(container.querySelector("dialog.probe-dialog")).not.toBeNull();
    expect(screen.queryByRole("dialog", { name: "Probe details" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog", { name: "Probe details" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    act(() => vi.advanceTimersByTime(250));
    expect(screen.queryByRole("dialog", { name: "Probe details" })).toBeNull();
    expect(container.querySelector("dialog.probe-dialog")).not.toBeNull();
    vi.useRealTimers();
  });
});

/** The smallest card: its name, and a close button in its sheet. */
function Probe({ entity, variant, footprint, showControl, onOpenDetails, onClose }: CardProps & { entity: { name: string } }) {
  const frame = useCardFrame({ variant, footprint, showControl });
  return (
    <article {...frame.article} data-sheet={frame.sheet ? "" : undefined}>
      <button type="button" onClick={onOpenDetails}>{entity.name}</button>
      {frame.sheet && <button type="button" onClick={onClose} aria-label={`Close ${entity.name}`}>Close</button>}
    </article>
  );
}

/** The skin's details wrapper, without a dialog's life: the tile tests cross the composition, not the primitive. */
function TestSheet({ open, onClose, label, children }: CardSheetProps) {
  return open ? (
    <div role="dialog" aria-label={label}>
      <button type="button" onClick={onClose}>close</button>
      {children}
    </div>
  ) : null;
}

const ProbeSheet = detailsSheet(Probe, TestSheet, (props) => `${props.entity.name} details`);

/** A card with a guarded action: its Unlock opens the details on it, and its sheet says which. */
function Ask({ entity, variant, onOpenDetails, action }: ActionCardProps<"unlock"> & { entity: { name: string } }) {
  const frame = useCardFrame({ variant });
  return (
    <article {...frame.article} data-action={action}>
      <button type="button" onClick={() => onOpenDetails?.()}>{entity.name}</button>
      {!frame.sheet && <button type="button" onClick={() => onOpenDetails?.("unlock")}>Unlock</button>}
    </article>
  );
}
const AskTile = detailsTile(Ask, detailsSheet(Ask, TestSheet, (props) => `${props.entity.name} details`));
const ProbeTile = detailsTile(Probe, ProbeSheet);
const WrappedTile = detailsTile(Probe, ProbeSheet, "probe-c");

describe("detailsSheet and detailsTile", () => {
  it("renders the card as itself in the named sheet", () => {
    render(<ProbeSheet entity={{ name: "Fan" }} open onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Fan details" })).toBeTruthy();
    expect(document.querySelector("article[data-sheet]")?.textContent).toContain("Fan");
  });

  it("opens the sheet from the card's name and closes it from the sheet", () => {
    render(<ProbeTile entity={{ name: "Fan" }} footprint="compact" />);
    expect(screen.queryByRole("dialog", { name: "Fan details" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Fan" }));
    expect(screen.getByRole("dialog", { name: "Fan details" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "close" }));
    expect(screen.queryByRole("dialog", { name: "Fan details" })).toBeNull();
  });

  it("starts open with defaultOpen", () => {
    render(<ProbeTile entity={{ name: "Fan" }} defaultOpen />);
    expect(screen.getByRole("dialog", { name: "Fan details" })).toBeTruthy();
  });

  it("wraps the card when the skin gives the tile its container", () => {
    const { container } = render(<WrappedTile entity={{ name: "Fan" }} />);
    expect(container.querySelector(".probe-c > article")).not.toBeNull();
  });

  it("opens the sheet on the action the card asks for, and starts on defaultAction", () => {
    render(<AskTile entity={{ name: "Door" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(screen.getByRole("dialog", { name: "Door details" }).querySelector("[data-action]")?.getAttribute("data-action")).toBe("unlock");
    fireEvent.click(screen.getByRole("button", { name: "close" }));
    fireEvent.click(screen.getByRole("button", { name: "Door" }));
    expect(screen.getByRole("dialog", { name: "Door details" }).querySelector("[data-action]")).toBeNull();
  });

  it("starts the sheet on defaultAction with defaultOpen", () => {
    render(<AskTile entity={{ name: "Door" }} defaultOpen defaultAction="unlock" />);
    expect(screen.getByRole("dialog", { name: "Door details" }).querySelector("[data-action]")?.getAttribute("data-action")).toBe("unlock");
  });

  it("names the wrappers after the card", () => {
    expect(ProbeSheet.displayName).toBe("ProbeSheet");
    expect(ProbeTile.displayName).toBe("ProbeTile");
  });
});
