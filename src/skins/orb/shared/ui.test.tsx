import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRangeSlider, useSlider } from "../../../primitives/slider";
import { COLORS, CardTitle, SheetClose, Track, detailsSheet, detailsTile, fmt1, fmtDuration, paint, useCard } from "./ui";
import type { CardProps } from "./ui";

describe("paint", () => {
  it("shows no glow attribute at zero", () => {
    const p = paint("energy", 0);
    expect(p["data-glow"]).toBeUndefined();
    expect(p.style["--hd-glow"]).toBe(0);
  });
  it("marks and quantifies glow above zero, rounded to thousandths", () => {
    const p = paint("energy", 0.123456);
    expect(p["data-glow"]).toBe("");
    expect(p.style["--hd-glow"]).toBe(0.123);
  });
  it("paints the colour slot only when a colour is resolved", () => {
    const p = paint("state", 0, { c: 0.13, h: 52 });
    expect(p["data-color"]).toBe("");
    expect(p.style["--color-c"]).toBe(0.13);
    expect(p.style["--color-h"]).toBe(52);
    expect(paint("state", 0).style["--color-c"]).toBeUndefined();
  });
  it("lets the prop override the card's own colour, and none keep the orb neutral", () => {
    const own = { c: 0.13, h: 52 };
    const over = paint("energy", 0, own, "sage");
    expect(over.style["--color-c"]).toBe(COLORS.sage.c);
    expect(over.style["--color-h"]).toBe(COLORS.sage.h);
    const none = paint("energy", 0, own, "none");
    expect(none["data-color"]).toBeUndefined();
    expect(none.style["--color-c"]).toBeUndefined();
  });
  it("carries the role through", () => {
    expect(paint("reading", 0)["data-role"]).toBe("reading");
  });
});

describe("fmtDuration", () => {
  it("formats minutes only", () => {
    expect(fmtDuration(54)).toBe("54m");
  });
  it("formats whole hours", () => {
    expect(fmtDuration(180)).toBe("3h");
  });
  it("formats hours and minutes", () => {
    expect(fmtDuration(714)).toBe("11h 54m");
  });
  it("clamps negatives to zero", () => {
    expect(fmtDuration(-5)).toBe("0m");
  });
});

describe("fmt1", () => {
  it("shows one decimal", () => {
    expect(fmt1(3.141)).toBe("3.1");
  });
  it("rounds at one decimal", () => {
    expect(fmt1(0.05)).toBe("0.1");
  });
  it("never shows -0.0", () => {
    expect(fmt1(-0.04)).toBe("0.0");
  });
});

describe("useCard", () => {
  const shape = (props: Parameters<typeof useCard>[1]) => renderHook(() => useCard("xx", props)).result.current;

  it("defaults to a standard card with its control", () => {
    const c = shape({});
    expect(c.article.className).toBe("hd xx");
    expect(c.article["data-control"]).toBeUndefined();
    expect([c.sheet, c.compact, c.featured, c.bare]).toEqual([false, false, false, false]);
  });
  it("adds the footprint modifier", () => {
    expect(shape({ footprint: "compact" }).article.className).toBe("hd xx hd--compact");
    expect(shape({ footprint: "featured" }).article.className).toBe("hd xx hd--featured");
  });
  it("marks a compact card without its control as bare", () => {
    const c = shape({ footprint: "compact", showControl: false });
    expect(c.bare).toBe(true);
    expect(c.article["data-control"]).toBe("off");
  });
  it("ignores the footprint and showControl in the sheet", () => {
    const c = shape({ variant: "sheet", footprint: "compact", showControl: false });
    expect(c.article.className).toBe("hd xx hd--sheet");
    expect([c.compact, c.bare]).toEqual([false, false]);
  });
  it("labels the article by the name", () => {
    const c = shape({});
    expect(c.article["aria-labelledby"]).toBe(c.nameId);
  });
});

/** The smallest card: its name, and a close button in the sheet. */
function Probe({ entity, variant, footprint, showControl, onOpenDetails, onClose }: CardProps & { entity: { name: string } }) {
  const { sheet, nameId, article } = useCard("xx", { variant, footprint, showControl });
  return (
    <article {...article}>
      <CardTitle id={nameId} name={entity.name} onOpen={sheet ? undefined : onOpenDetails} />
      {sheet && <SheetClose label={`Close ${entity.name}`} onClick={onClose} />}
    </article>
  );
}
const ProbeSheet = detailsSheet(Probe);
const ProbeTile = detailsTile(Probe, ProbeSheet);

describe("detailsSheet and detailsTile", () => {
  it("renders the card as itself in a labelled sheet", () => {
    render(<ProbeSheet entity={{ name: "Fan" }} open onClose={() => {}} />);
    expect(screen.getByRole("dialog", { hidden: true }).getAttribute("aria-label")).toBe("Fan details");
    expect(document.querySelector("dialog article")?.className).toBe("hd xx hd--sheet");
  });
  it("takes a sheet label", () => {
    const Labelled = detailsSheet(Probe, (name) => `${name} weather details`);
    render(<Labelled entity={{ name: "Home" }} open onClose={() => {}} />);
    expect(screen.getByRole("dialog", { hidden: true }).getAttribute("aria-label")).toBe("Home weather details");
  });
  it("opens the sheet from the card's name and closes it from the sheet", () => {
    render(<ProbeTile entity={{ name: "Fan" }} footprint="compact" />);
    expect(document.querySelector(".hd-c > article")?.className).toBe("hd xx hd--compact");
    expect(document.querySelector("dialog article")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Fan details" }));
    expect(document.querySelector("dialog article")).not.toBeNull();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Close Fan");
  });
  it("starts open with defaultOpen", () => {
    render(<ProbeTile entity={{ name: "Fan" }} defaultOpen />);
    expect(document.querySelector("dialog article")).not.toBeNull();
  });
  it("names the wrappers after the card", () => {
    expect(ProbeSheet.displayName).toBe("ProbeSheet");
    expect(ProbeTile.displayName).toBe("ProbeTile");
  });
});

describe("Track", () => {
  function Level({ on = true }: { on?: boolean }) {
    const slider = useSlider<HTMLDivElement>({ value: 40, min: 0, max: 100, inset: 0, valueText: (v) => `${v} percent`, onChange: vi.fn() });
    return <Track slider={slider} inputs={[{ id: "lv", "aria-label": "Level", ...slider.inputProps }]} className="xx-bar" text={`${slider.value}%`} lit={on} />;
  }

  it("draws the groove, the value on it and on the fill, a hit layer and the input", () => {
    const { container } = render(<Level />);
    const root = container.firstElementChild!;
    expect(root.className).toBe("hd-track hd-track--groove xx-bar");
    expect([...root.querySelectorAll(".hd-track-lab")].map((l) => l.textContent)).toEqual(["40%", "40%"]);
    expect(root.querySelector(".hd-track-fill .hd-track-lab")).not.toBeNull();
    expect(root.querySelector(".hd-track-hit")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("slider", { name: "Level" }).getAttribute("aria-valuetext")).toBe("40 percent");
    expect(root.hasAttribute("data-lit")).toBe(false);
  });

  it("empties the fill while off", () => {
    const { container } = render(<Level on={false} />);
    expect(container.firstElementChild!.getAttribute("data-lit")).toBe("false");
  });

  it("takes a range's two inputs with their own classes, and leaves the focus ring to the thumbs", () => {
    function Range() {
      const r = useRangeSlider<HTMLDivElement>({ low: 20, high: 24, min: 10, max: 30, step: 0.5, inset: 0, valueText: (v, t) => `${t} ${v}`, onChange: vi.fn() });
      return (
        <Track slider={r} focus="thumb" className="xx-range" inputs={[
          { id: "lo", className: "xx-lo", "aria-label": "Low", ...r.lowInputProps },
          { id: "hi", className: "xx-hi", "aria-label": "High", ...r.highInputProps },
        ]}><i className="xx-zone" /></Track>
      );
    }
    const { container } = render(<Range />);
    const root = container.firstElementChild!;
    expect(root.getAttribute("data-focus")).toBe("thumb");
    expect(root.querySelector(".hd-track-lab")).toBeNull();
    expect(screen.getByRole("slider", { name: "Low" }).className).toBe("hd-track-in xx-lo");
    expect(screen.getByRole("slider", { name: "High" }).className).toBe("hd-track-in xx-hi");
    // The card's fill sits under the hit layer.
    expect([...root.children].map((c) => c.className)).toEqual(["xx-zone", "hd-track-hit", "hd-track-in xx-lo", "hd-track-in xx-hi"]);
  });
});
