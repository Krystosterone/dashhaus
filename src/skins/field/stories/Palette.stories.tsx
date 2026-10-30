import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { LAMP_COLORS } from "@dashhaus/core/entities/light/color";
import { Blank, Digits, Fader, Key, Pictogram, Screen, Swatch } from "../shared/ui";
import { BULB, IconBulb } from "../cards/light/icons";

const meta = {
  title: "Field/Foundations/Palette",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Field's parts and what each one means (docs/field.md → Design rules), drawn with the skin's own key, fader and screen. " +
          "Try both finishes with the Finish toolbar.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Role({ title, rule, children }: { title: string; rule: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", gap: 20, alignItems: "center", padding: "14px 0", borderTop: "1px solid var(--fd-hairline)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>{children}</div>
      <div style={{ display: "grid", gap: 2 }}>
        <b style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>{title}</b>
        <span style={{ fontSize: 13.5, color: "var(--fd-ink-2)" }}>{rule}</span>
      </div>
    </div>
  );
}

/** A screen at a module's standard height, outside a module. */
function ScreenAt({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", height: 56, width: "100%" }}>{children}</div>;
}

function Parts() {
  const [on, setOn] = useState(false);
  const [level, setLevel] = useState(80);
  const [warmth, setWarmth] = useState(40);
  return (
    <div style={{ maxWidth: 760, fontFamily: "var(--fd-sans)", fontStretch: "var(--fd-wide)", color: "var(--fd-ink)" }}>
      <Role title="Key: press it" rule="Flat-topped, just raised. Its glyph is the domain's, so the key is also the row's identity. A key that can't be pressed lies flat.">
        <Key label="Ceiling" pressed={on} onPress={() => setOn(!on)}><IconBulb /></Key>
        <Key label="Half, 50%" wide onPress={() => {}}><span className="fd-key-fig">50</span></Key>
      </Role>
      <Role title="Fader: slide or set along it" rule="A printed legend, a thin dark slot, a dotted scale, a round thumb. A tap jumps the thumb; a drag follows the finger.">
        <div style={{ width: "100%" }}>
          <Fader id="palette-level" label="Brightness" legend="Brightness" value={level} min={1} max={100} lit valueText={`${level} percent`} onChange={setLevel} />
        </div>
      </Role>
      <Role title="Screen: read it" rule="Always dark, in both finishes. A pictogram and a figure on the left, up to two meta lines on the right. Never pressed.">
        <ScreenAt>
          <Screen pict={<Pictogram level={0.25 + 0.75 * (level / 100)} lit>{BULB}</Pictogram>} meta={["2700K", "Since 10:31"]}>
            <Digits value={level} /><small>%</small>
          </Screen>
        </ScreenAt>
      </Role>
      <Role title="A lit LED: on" rule="The LED in a latching key's corner is the one sign that something is on. A key that acts once has none.">
        <Key label="Lamp on" pressed onPress={() => {}}><IconBulb /></Key>
        <Key label="Lamp off" pressed={false} onPress={() => {}}><IconBulb /></Key>
      </Role>
      <Role title="Colour names a parameter" rule="Orange is a module's first parameter (brightness, a heat target), blue its second (warmth, a cool target). On its thumb and its pictogram; never heat or cool, never on.">
        <div style={{ display: "grid", gap: 4, width: "100%" }}>
          <Fader id="palette-a" label="First parameter" legend="Brightness" value={level} min={1} max={100} lit valueText={`${level} percent`} onChange={setLevel} />
          <Fader id="palette-b" label="Second parameter" legend="Warmth" value={warmth} min={0} max={100} lit param="b" valueText={`${warmth} percent`} onChange={setWarmth} />
        </div>
      </Role>
      <Role title="Fixed places" rule="Numbers keep their digit count, leading digits as unlit segments. A missing reading is blank segments, never a plausible number.">
        <ScreenAt>
          <Screen pict={<Pictogram level={0.28} lit>{BULB}</Pictogram>} meta={["Since 10:58"]}>
            <Digits value={3} /><small>%</small>
          </Screen>
        </ScreenAt>
      </Role>
      <Role title="Unavailable" rule="The screen blanks and says so, with when it was last seen; every control lies flat and disabled. No reading or target is made up.">
        <div style={{ display: "grid", gap: 10, width: "100%" }}>
          <ScreenAt>
            <Screen pict={<Pictogram lit={false}>{BULB}</Pictogram>} meta={["Unavailable", "Seen 10:42"]}>
              <Blank label="Unavailable" />
            </Screen>
          </ScreenAt>
          <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 10, alignItems: "center" }}>
            <Key label="Shelf strip" pressed={false} disabled onPress={() => {}}><IconBulb /></Key>
            <Fader id="palette-unavailable" label="Shelf strip brightness" legend="Brightness" value={30} min={1} max={100} lit={false} disabled valueText="Unavailable" onChange={() => {}} />
          </div>
        </div>
      </Role>
      <Role title="A lamp's colour: data" rule="Shown only as a swatch on a colour key, and on the screen while the lamp shows it. Never a signal.">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LAMP_COLORS.map((c) => (
            <Key key={c.name} label={c.name} pressed={c.name === "Amber"} onPress={() => {}}><Swatch lamp={c.name} /></Key>
          ))}
        </div>
      </Role>
    </div>
  );
}

export const Roles: Story = { render: () => <Parts /> };
