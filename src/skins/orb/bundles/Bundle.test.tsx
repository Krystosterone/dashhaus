import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitledBundle, joinedUnits } from "./Bundle";
import { ToggleTile } from "../cards/toggle/ToggleTile";
import { LightTile } from "../cards/light/LightTile";
import { SoundTile } from "../cards/sound/SoundTile";

const noop = () => {};

function Machine({ soundArea = "Baby Room" }: { soundArea?: string }) {
  return (
    <TitledBundle title="Sound machine" area="Baby Room">
      <ToggleTile entity={{ entityId: "switch.m", name: "Power", area: "Baby Room", state: "on", icon: "power", lastChanged: "20:15" }} onToggle={noop} />
      <LightTile entity={{ entityId: "light.m", name: "Night light", area: "Baby Room", state: "on", supportsBrightness: true, brightness: 3, supportsColor: true, hs: [31, 94.5] }} onToggle={noop} onBrightnessChange={noop} />
      <SoundTile entity={{ entityId: "switch.m_music", name: "White noise", area: soundArea, state: "on", volume: 62 }} onToggle={noop} />
    </TitledBundle>
  );
}

const statusOf = (name: string) => screen.getByRole("heading", { name }).closest("article")?.querySelector(".hd-area")?.textContent;

describe("TitledBundle", () => {
  it("names the thing and its room once, and each part says its own detail instead of the room", () => {
    render(<Machine />);
    const group = screen.getByRole("group", { name: "Sound machine" });
    expect(within(group).getByText("Baby Room")).toBeTruthy();
    expect(statusOf("Power")).toBe("Since 20:15");
    expect(statusOf("Night light")).toBe("Amber");
    expect(statusOf("White noise")).toBe("Volume 62%");
  });

  it("keeps the room of a part that is somewhere else", () => {
    render(<Machine soundArea="Hallway" />);
    // The volume after the room is in the markup; compact rows hide it in CSS.
    expect(statusOf("White noise")).toMatch(/^Hallway( · |$)/);
  });

  it("forces every part compact: a 60px lid and three rows make the featured height", () => {
    const { container } = render(<Machine />);
    expect(container.querySelectorAll(".hb-row .hd--compact")).toHaveLength(3);
  });

  it("names the thing in a heading that opens nothing; a part's own sheet says whose part it is", () => {
    render(<Machine />);
    expect(screen.getByRole("heading", { name: "Sound machine" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Sound machine/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Night light details" }));
    const light = screen.getByRole("dialog", { name: "Night light details", hidden: true });
    // The colour after it is in the markup; the sheet hides it in CSS and names it over its chips.
    expect(light.querySelector(".hd-area")?.textContent).toMatch(/^Sound machine · Baby Room( · |$)/);
  });
});

describe("joinedUnits", () => {
  it("stacks at the widths Bundle.css stacks a joined bundle, so a row places it at the height it draws", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(`${process.cwd()}/src/skins/orb/bundles/Bundle.css`, "utf8");
    const widths = [...css.matchAll(/@container hb \((?:min|max)-width: (\d+)px\)/g)].map((m) => Number(m[1]));
    expect(widths).toEqual([339, 509, 449, 450]);
    expect([joinedUnits(2, 339), joinedUnits(2, 340)]).toEqual([2, 1]);
    expect([joinedUnits(3, 509), joinedUnits(3, 510)]).toEqual([3, 1]);
    expect([joinedUnits(4, 449), joinedUnits(4, 450), joinedUnits(4, 599), joinedUnits(4, 600)]).toEqual([4, 2, 2, 1]);
    expect([joinedUnits(5, 339), joinedUnits(5, 340), joinedUnits(2, undefined)]).toEqual([5, 1, 1]);
  });
});
