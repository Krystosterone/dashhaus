import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { ReactNode } from "react";
import type { HourSample } from "../../../domains/history";
import { Blank, Digits, Fader, Glyph, Key, Legend, Pictogram, RangeFader, Screen, Swatch, Today, Warn } from "../shared/ui";
import { BULB, IconBulb } from "../cards/light/icons";
import { IconThermo, THERMO } from "../cards/sensor/icons";
import { ModeIcon } from "../cards/climate/icons";

const meta = {
  title: "Field/Foundations/Parts",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Field's parts, the styled controls in src/skins/field/shared/ that every module is built from, each across its states. " +
          "Primitives (src/primitives/) are their behaviour; these are what a module draws. Try both finishes with the Finish toolbar.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** One part: its name and rule, then its states. */
function Part({ name, rule, children }: { name: string; rule: string; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 12, padding: "16px 0", borderTop: "1px solid var(--fd-hairline)" }}>
      <div style={{ display: "grid", gap: 2 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>{name}</h2>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--fd-ink-2)" }}>{rule}</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 20 }}>{children}</div>
    </section>
  );
}

/** One state of a part, captioned. */
function State({ label, width, children }: { label: string; width?: number; children: ReactNode }) {
  return (
    <figure style={{ margin: 0, display: "grid", gap: 6, justifyItems: width ? "stretch" : "start", width, maxWidth: "100%" }}>
      {children}
      <figcaption style={{ fontSize: 12, color: "var(--fd-ink-2)" }}>{label}</figcaption>
    </figure>
  );
}

/** A screen at a module's standard height, outside a module. */
function ScreenAt({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", height: 56, width: "100%" }}>{children}</div>;
}

const DAY: HourSample[] = [0, 0, 0, 0, 0, 0, 0.3, 0.8, 0.6, 0, 0, 0, 0.4, 0.5, "unavailable", "unavailable", 0.7, 0.9, 1, null, null, null, null, null];

function AllParts() {
  const [on, setOn] = useState(true);
  const [mode, setMode] = useState<"heat" | "cool" | "off">("heat");
  const [level, setLevel] = useState(64);
  const [warmth, setWarmth] = useState(40);
  const [range, setRange] = useState<[number, number]>([20, 24]);

  return (
    <div style={{ maxWidth: 760, fontFamily: "var(--fd-sans)", fontStretch: "var(--fd-wide)", color: "var(--fd-ink)" }}>
      <Part name="Key" rule="Flat-topped and just raised: press it. A latching key sits lower with its LED lit while on; a key that acts once has no LED; a chosen key of a group lies flat; a key that can't be pressed lies flat and dim.">
        <State label="Latching, off"><Key label="Lamp off" pressed={false} onPress={() => {}}><IconBulb /></Key></State>
        <State label="Latching, press it"><Key label="Lamp" pressed={on} onPress={() => setOn(!on)}><IconBulb /></Key></State>
        <State label="Acts once"><Key label="Half, 50%" wide onPress={() => {}}><span className="fd-key-fig">50</span></Key></State>
        <State label="A group, one chosen">
          <div style={{ display: "flex", gap: 6 }}>
            {(["heat", "cool", "off"] as const).map((m) => <Key key={m} label={m} chosen={mode === m} caption={m} onPress={() => setMode(m)}><ModeIcon mode={m} /></Key>)}
          </div>
        </State>
        <State label="Colour"><Key label="Amber" pressed onPress={() => {}}><Swatch lamp="Amber" /></Key></State>
        <State label="Disabled"><Key label="Lamp unavailable" pressed={false} disabled onPress={() => {}}><IconBulb /></Key></State>
      </Part>

      <Part name="Glyph" rule="A reading's identity where a key would sit: the domain's glyph on a plate that lies flat. Not a control.">
        <State label="A reading"><Glyph><IconThermo /></Glyph></State>
        <State label="Unavailable"><Glyph unavailable><IconThermo /></Glyph></State>
      </Part>

      <Part name="Fader" rule="A printed legend, a thin slot, a dotted scale and a round thumb in its parameter's colour: tap to jump, drag to follow the finger. Off keeps the thumb; with no trustworthy value there is no thumb at all.">
        <State label="On, first parameter" width={300}><Fader id="parts-a" label="Brightness" legend="Brightness" value={level} min={1} max={100} lit valueText={`${level} percent`} onChange={setLevel} /></State>
        <State label="Second parameter" width={300}><Fader id="parts-b" label="Warmth" legend="Warmth" value={warmth} min={0} max={100} lit param="b" valueText={`${warmth} percent`} onChange={setWarmth} /></State>
        <State label="Off" width={300}><Fader id="parts-off" label="Brightness, off" legend="Brightness" value={30} min={1} max={100} lit={false} valueText="Off. Last set to 30 percent" onChange={() => {}} /></State>
        <State label="Disabled" width={300}><Fader id="parts-disabled" label="Brightness, unavailable" legend="Brightness" value={30} min={1} max={100} lit={false} disabled valueText="Unavailable" onChange={() => {}} /></State>
        <State label="No value" width={300}><Fader id="parts-empty" label="Brightness, unknown" legend="Brightness" min={1} max={100} lit={false} valueText="Unknown" onChange={() => {}} /></State>
      </Part>

      <Part name="Range fader" rule="Two ordered values on one fader: the lower thumb is the first parameter, the upper the second. A tap or a drag moves the nearer thumb.">
        <State label="Heat below, cool above" width={300}>
          <RangeFader id="parts-range" name="Thermostat" legend="Range" low={range[0]} high={range[1]} min={16} max={30} step={0.5}
            lowValueText={`Heat below ${range[0]} degrees`} highValueText={`Cool above ${range[1]} degrees`} onChange={(lo, hi) => setRange([lo, hi])} />
        </State>
        <State label="Disabled" width={300}>
          <RangeFader id="parts-range-off" name="Thermostat, unavailable" legend="Range" low={20} high={24} min={16} max={30} step={0.5} disabled
            lowValueText="Unavailable" highValueText="Unavailable" onChange={() => {}} />
        </State>
      </Part>

      <Part name="Screen" rule="Always dark, in both finishes: a pictogram and a figure, then up to two meta lines. Numbers keep their digit count; a missing reading is blank segments. Never pressed.">
        <State label="A figure" width={300}>
          <ScreenAt><Screen pict={<Pictogram level={level / 100} lit>{BULB}</Pictogram>} meta={["2700K", "Since 10:31"]}><Digits value={level} /><small>%</small></Screen></ScreenAt>
        </State>
        <State label="Leading digits unlit" width={300}>
          <ScreenAt><Screen pict={<Pictogram level={0.28} lit>{BULB}</Pictogram>} meta={["Since 10:58"]}><Digits value={3} /><small>%</small></Screen></ScreenAt>
        </State>
        <State label="A reading" width={300}>
          <ScreenAt><Screen pict={<Pictogram lit param="neutral">{THERMO}</Pictogram>} meta={["48% RH"]}><Digits text="21.4" places={4} /><small>°</small></Screen></ScreenAt>
        </State>
        <State label="Unavailable" width={300}>
          <ScreenAt><Screen pict={<Pictogram lit={false}>{BULB}</Pictogram>} meta={["Unavailable", "Seen 10:42"]}><Blank label="Unavailable" /></Screen></ScreenAt>
        </State>
      </Part>

      <Part name="Pictogram" rule="The shape is always there unlit, and lights from the bottom up to its level in its parameter's colour, or in a colour lamp's own.">
        {[0.15, 0.5, 1].map((l) => (
          <State key={l} label={`Lit to ${l * 100}%`} width={150}><ScreenAt><Screen pict={<Pictogram level={l} lit>{BULB}</Pictogram>}><Digits value={l * 100} /><small>%</small></Screen></ScreenAt></State>
        ))}
        <State label="Second parameter" width={150}><ScreenAt><Screen pict={<Pictogram level={0.6} lit param="b">{BULB}</Pictogram>}><Digits value={60} /><small>%</small></Screen></ScreenAt></State>
        <State label="A colour lamp" width={150}><ScreenAt><Screen pict={<Pictogram lit lamp="Amber">{BULB}</Pictogram>}><Digits value={80} /><small>%</small></Screen></ScreenAt></State>
        <State label="Unlit" width={150}><ScreenAt><Screen pict={<Pictogram lit={false}>{BULB}</Pictogram>}><Digits value={0} /><small>%</small></Screen></ScreenAt></State>
      </Part>

      <Part name="Today" rule="A printed legend with its summary over the hour meter: one segment column per hour, the hour now marked under it. Hours not yet come are dark; unavailable hours show a dash.">
        <State label="First parameter" width={300}><Today summary="4h 10m" label="Brightness today." samples={DAY} currentHour={18} /></State>
        <State label="Neutral, an activity" width={300}><Today summary="2h" label="Heating today." samples={DAY} currentHour={18} tone="neutral" /></State>
        <State label="No history" width={300}><Today label="No history today." /></State>
      </Part>

      <Part name="Legend and warning" rule="A printed label with its rule, for a group of keys or a meter. A warning is an outlined marker before its words: field has no warning colour.">
        <State label="Legend" width={300}><Legend value="Amber">Colour</Legend></State>
        <State label="Warning"><Warn>Battery 8%</Warn></State>
      </Part>
    </div>
  );
}

export const Parts: Story = { render: () => <AllParts /> };
