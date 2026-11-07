import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { ReactNode } from "react";
import type { HourSample } from "@dashhaus/core/entities/history";
import { Blank, Confirm, Digits, Facts, Fader, Glyph, Key, KeyGroup, Keypad, Legend, ModuleFrame, ModuleRow, Notices, PanelBody, Pictogram, Picture, RangeFader, Screen, Swatch, Temperature, Today, useDetails, Warn } from "../shared/ui";
import type { ModuleFrameProps } from "../shared/ui";
import { usePicture } from "@dashhaus/core/hooks";
import type { PictureStatus } from "@dashhaus/core/hooks";
import { ARTWORK_TALL, ARTWORK_TIDES, PICTURE_DOORSTEP, PICTURE_NURSERY, PICTURE_WIDE } from "@dashhaus/core/seeds/pictures";
import { LAMP_COLORS } from "@dashhaus/core/entities/light/color";
import { BULB, IconBulb } from "../cards/light/icons";
import { IconThermo, THERMO } from "../cards/sensor/icons";
import { ModeIcon } from "../cards/climate/icons";
import { IconLock } from "../cards/lock/icons";

const meta = {
  title: "Field/Foundations/Parts",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Field's parts, the styled controls in src/skins/field/shared/ that every module is built from, each across its states. " +
          "Primitives (packages/core/src/primitives/) are their behaviour; these are what a module draws. Try both finishes with the Finish toolbar.",
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

/** A panel's plate, for what is drawn on it rather than on the page (its small print). */
function Plate({ children }: { children: ReactNode }) {
  return <div style={{ background: "var(--fd-module)", padding: 12, borderRadius: 6 }}>{children}</div>;
}

/** A screen at a module's standard height, outside a module. */
function ScreenAt({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", height: 56, width: "100%" }}>{children}</div>;
}

const DAY: HourSample[] = [0, 0, 0, 0, 0, 0, 0.3, 0.8, 0.6, 0, 0, 0, 0.4, 0.5, "unavailable", "unavailable", 0.7, 0.9, 1, null, null, null, null, null];

/** A picture through the real lifecycle: it loads once on screen and decodes before it draws. */
function Live({ src, ...props }: { src: string } & Omit<Parameters<typeof Picture>[0], "picture">) {
  return <Picture picture={usePicture<HTMLElement>(src)} {...props} />;
}

/** A picture held in one status, for the states a lifecycle passes through. */
const held = (status: PictureStatus, src?: string) => ({ ref: () => {}, src, status });

/** The module frame on its own, its name opening its panel. */
function Frame(props: Omit<ModuleFrameProps, "details" | "kind" | "pict" | "lead"> & Partial<Pick<ModuleFrameProps, "pict" | "lead">>) {
  const details = useDetails(false);
  return (
    <ModuleFrame kind="fd-parts" details={details} pict={<Pictogram lit param="neutral">{THERMO}</Pictogram>} lead={<Glyph><IconThermo /></Glyph>}
      row={<ModuleRow><Glyph><IconThermo /></Glyph><Today summary="19.5°–21.4°" label="Temperature by hour today." samples={DAY} currentHour={18} tone="neutral" /></ModuleRow>}
      facts={{ start: "Updated 10:42", end: "Battery 80%" }} {...props} />
  );
}

function AllParts() {
  const [on, setOn] = useState(true);
  const [mode, setMode] = useState<"heat" | "cool" | "off">("heat");
  const [level, setLevel] = useState(64);
  const [warmth, setWarmth] = useState(40);
  const [range, setRange] = useState<[number, number]>([20, 24]);
  const [position, setPosition] = useState(60);

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

      <Part name="Fader" rule="A printed legend, a thin slot, a dotted scale and a round thumb in its parameter's colour: tap to jump, drag to follow the finger. Off keeps the thumb where a level is known; off with none reported has no thumb but still takes a slide, which turns it on; with no trustworthy value and nothing to set there is no thumb at all. A fader may snap a pointer onto its own grid: a cover's ends pull the thumb to closed and open.">
        <State label="On, first parameter" width={300}><Fader id="parts-a" label="Brightness" legend="Brightness" value={level} min={1} max={100} lit valueText={`${level} percent`} onChange={setLevel} /></State>
        <State label="Second parameter" width={300}><Fader id="parts-b" label="Warmth" legend="Warmth" value={warmth} min={0} max={100} lit param="b" valueText={`${warmth} percent`} onChange={setWarmth} /></State>
        <State label="Off" width={300}><Fader id="parts-off" label="Brightness, off" legend="Brightness" value={30} min={1} max={100} lit={false} valueText="Off. Last set to 30 percent" onChange={() => {}} /></State>
        <State label="Off, no level" width={300}><Fader id="parts-off-empty" label="Brightness, off" legend="Brightness" value={100} min={1} max={100} lit={false} empty valueText="Off" onChange={() => {}} /></State>
        <State label="Disabled" width={300}><Fader id="parts-disabled" label="Brightness, unavailable" legend="Brightness" value={30} min={1} max={100} lit={false} disabled valueText="Unavailable" onChange={() => {}} /></State>
        <State label="No value" width={300}><Fader id="parts-empty" label="Brightness, unknown" legend="Brightness" min={1} max={100} lit={false} valueText="Unknown" onChange={() => {}} /></State>
        <State label="Magnetic ends: slide near one and it snaps there" width={300}><Fader id="parts-snap" label="Curtains position" legend="Position" value={position} min={0} max={100} lit={position > 0} valueText={`${position} percent open`} snap={(raw) => (raw <= 4 ? 0 : raw >= 96 ? 100 : Math.round(raw))} onChange={setPosition} /></State>
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
          <ScreenAt><Screen pict={<Pictogram lit={false}>{BULB}</Pictogram>} meta={["Unavailable", "Last seen 10:42"]}><Blank label="Unavailable" /></Screen></ScreenAt>
        </State>
      </Part>

      <Part name="Picture" rule="Field's media surface, a camera's still or a player's artwork on usePicture: a window in the screen, its own dark well with the frame clipped into it, no bezel and no words on it. It loads once seen, decodes before it draws, and keeps its last frame while the next loads. Before a frame, with none to keep and while unavailable, it is the screen with the card's pictogram unlit. It never inverts with an alarm. Pressed, it opens the stream or the panel; unavailable, it takes no press.">
        <State label="A still, 16:9" width={300}><Live src={PICTURE_DOORSTEP} label="Front door camera" onOpen={() => {}} openLabel="Open live view" /></State>
        <State label="At night" width={300}><Live src={PICTURE_NURSERY} label="Nursery camera" /></State>
        <State label="21:9, cropped" width={300}><Live src={PICTURE_WIDE} label="Driveway camera" /></State>
        <State label="21:9 whole, in a panel" width={300}><Live src={PICTURE_WIDE} label="Driveway camera" fit="contain" /></State>
        <State label="Artwork, 1:1" width={96}><Live src={ARTWORK_TIDES} label="Artwork" ratio="1 / 1" /></State>
        <State label="3:4 artwork, cropped" width={96}><Live src={ARTWORK_TALL} label="Artwork" ratio="1 / 1" /></State>
        <State label="Before a frame" width={300}><Picture picture={held("loading")} label="Front door camera" /></State>
        <State label="Failed, nothing kept" width={300}><Picture picture={held("failed")} label="Front door camera" /></State>
        <State label="Unavailable" width={300}><Picture picture={held("ready", PICTURE_DOORSTEP)} label="Front door camera" unavailable onOpen={() => {}} /></State>
      </Part>

      <Part name="Pictogram" rule="The shape is always there unlit, and lights from the bottom up to its level in its parameter's colour, or in a colour lamp's own.">
        {[0.15, 0.5, 1].map((l) => (
          <State key={l} label={`Lit to ${l * 100}%`} width={150}><ScreenAt><Screen pict={<Pictogram level={l} lit>{BULB}</Pictogram>}><Digits value={l * 100} /><small>%</small></Screen></ScreenAt></State>
        ))}
        <State label="Second parameter" width={150}><ScreenAt><Screen pict={<Pictogram level={0.6} lit param="b">{BULB}</Pictogram>}><Digits value={60} /><small>%</small></Screen></ScreenAt></State>
        <State label="A colour lamp" width={150}><ScreenAt><Screen pict={<Pictogram lit lamp="Amber">{BULB}</Pictogram>}><Digits value={80} /><small>%</small></Screen></ScreenAt></State>
        <State label="Unlit" width={150}><ScreenAt><Screen pict={<Pictogram lit={false}>{BULB}</Pictogram>}><Digits value={0} /><small>%</small></Screen></ScreenAt></State>
      </Part>

      <Part name="Module row" rule="A standard module's row under its screen: the key, or a reading's glyph, in its 44 px column, then its fader or today. Solo, with nothing to set, the key spans the row with its word.">
        <State label="A key and its fader" width={300}><ModuleRow><Key label="Ceiling" pressed onPress={() => {}}><IconBulb /></Key><Fader id="parts-row" label="Ceiling brightness" legend="Brightness" value={64} min={0} max={100} lit valueText="64 percent" onChange={() => {}} /></ModuleRow></State>
        <State label="A glyph and today" width={300}><ModuleRow><Glyph><IconThermo /></Glyph><Today summary="19.5°–21.4°" label="Temperature by hour today." samples={DAY} currentHour={18} tone="neutral" /></ModuleRow></State>
        <State label="Solo" width={300}><ModuleRow solo><Key label="Porch light" pressed wide caption="On" onPress={() => {}}><IconBulb /></Key></ModuleRow></State>
      </Part>

      <Part name="Panel body and notices" rule="A detail panel's content: the screen, then each block, 16 px apart, the container its key groups read. Under the screen, what the panel prints in full: every warning behind its marker, then the state in words.">
        <State label="A panel's content" width={300}>
          <Plate>
            <PanelBody state="ok">
              <ScreenAt><Screen pict={<Pictogram lit param="neutral">{THERMO}</Pictogram>} meta={["48% RH"]}><Digits text="21.4" places={4} /><small>°</small></Screen></ScreenAt>
              <Notices warnings={["Wind gusts 90 km/h", "Ice on the roads"]} words="Partly cloudy, then rain" />
              <Facts start="Updated 10:42" />
            </PanelBody>
          </Plate>
        </State>
      </Part>

      <Part name="Module frame" rule="Every module's frame (ModuleFrame): its header, then the screen and the row under it, or a compact row's lead and screen; its name opens the panel, the screen again, the controls and the small print. What a card hands it is generic: rest, a known resting state, its figure dim here and in the panel; a note in place of the area; its own body in place of the screen and the row; a picture over the panel's screen. Tap a name for its panel.">
        <State label="A screen and its row" width={300}><Frame name="Hall" area="Downstairs" state="ok" read={<Temperature value={21.4} unit="°" />} meta={["48% RH", "Since 10:31"]} /></State>
        <State label="A row" width={340}><Frame name="Hall" area="Downstairs" state="ok" footprint="compact" read={<Temperature value={21.4} unit="°" />} /></State>
        <State label="Resting" width={300}><Frame name="Garage door" area="Garage" state="closed" rest pict={null} read="SHUT" meta={["Closed", "Since 08:16"]} /></State>
        <State label="A note in place of the area" width={300}><Frame name="Nursery" area="Upstairs" note="Base station off" state="ok" read={<Temperature value={20.1} unit="°" />} meta={["52% RH"]} /></State>
        <State label="Its own body; a picture over the panel's screen" width={300}>
          <Frame name="Front door" area="Porch" state="idle" rest read="IDLE" meta={["Idle", "Still from 10:42"]}
            body={<div style={{ gridRow: "2 / -1", display: "grid", minHeight: 0 }}><Screen meta={["The card's own body", "Under the header"]}>IDLE</Screen></div>}
            panelPicture={<Picture picture={held("ready", PICTURE_DOORSTEP)} label="Front door camera" fit="contain" />} />
        </State>
      </Part>

      <Part name="Today" rule="A printed legend with its summary over the hour meter: one segment column per hour, the hour now marked under it. Hours not yet come are dark; unavailable hours show a dash.">
        <State label="First parameter" width={300}><Today summary="4h 10m" label="Brightness today." samples={DAY} currentHour={18} /></State>
        <State label="Neutral, an activity" width={300}><Today summary="2h" label="Heating today." samples={DAY} currentHour={18} tone="neutral" /></State>
        <State label="No history" width={300}><Today label="No history today." /></State>
      </Part>

      <Part name="Key group" rule="A row of keys, each filling its cell: every key on one row, or n to a row, and fewer to a row on a narrow panel (300 px and under, or under 420 px), under a printed legend where it has one.">
        <State label="One row" width={300}><KeyGroup label="Cover"><Key label="Open" wide caption="Open" onPress={() => {}}><IconBulb /></Key><Key label="Stop" wide caption="Stop" onPress={() => {}}><IconBulb /></Key><Key label="Close" wide caption="Close" onPress={() => {}}><IconBulb /></Key></KeyGroup></State>
        <State label="Two to a row, with a legend" width={300}><KeyGroup legend="Mode" columns={2}>{["Off", "Home", "Away", "Night"].map((m, i) => <Key key={m} label={m} chosen={i === 1} wide caption={m} onPress={() => {}}><IconBulb /></Key>)}</KeyGroup></State>
        <State label="Seven to a row, four on a panel under 420 px" width={380}>
          <div style={{ containerType: "inline-size" }}>
            <KeyGroup legend="Colour" value={LAMP_COLORS[1].name} columns={7} narrow={4} narrowAt={420}>{LAMP_COLORS.map((c, i) => <Key key={c.name} label={c.name} pressed={i === 1} wide onPress={() => {}}><Swatch lamp={c.name} /></Key>)}</KeyGroup>
          </div>
        </State>
      </Part>

      <Part name="Facts" rule="The panel's small print: a fact at its start and, where there is one, its end, in the words @dashhaus/core/entities/facts gives every module.">
        <State label="Last changed" width={300}><Plate><Facts start="Last changed 10:58 by Keypad" end="Code to unlock" /></Plate></State>
        <State label="Unavailable" width={300}><Plate><Facts start="Last seen 10:42" /></Plate></State>
      </Part>

      <Part name="Confirm and Keypad" rule="A guarded action's answer, in the panel, on useGuardedAction: the question as a legend when no code is asked for (Cancel and the action as two keys, Cancel focused, the action taking no press for a moment), or the keypad when one is (the code on a strip of screen, the keys three by four).">
        <State label="The question" width={300}><Confirm question="Unlock Front door?" detail="Anyone at the door can open it." action="Unlock" icon={<IconLock open />} onConfirm={() => {}} onCancel={() => {}} /></State>
        <State label="Waiting for the answer" width={300}><Confirm question="Unlock Front door?" detail="Anyone at the door can open it." action="Unlock" icon={<IconLock open />} busy waiting="Waiting for the lock" onConfirm={() => {}} onCancel={() => {}} /></State>
        <State label="Didn't go through" width={300}><Confirm question="Unlock Front door?" detail="Anyone at the door can open it." action="Unlock" icon={<IconLock open />} error="Didn’t go through. Try again" onConfirm={() => {}} onCancel={() => {}} /></State>
        <State label="The keypad (1234)" width={300}><Keypad prompt="Code to disarm" onSubmit={(code) => code === "1234"} onCancel={() => {}} /></State>
      </Part>

      <Part name="Legend and warning" rule="A printed label with its rule, for a group of keys or a meter. A warning is an outlined marker before its words: field has no warning colour.">
        <State label="Legend" width={300}><Legend value="Amber">Colour</Legend></State>
        <State label="Warning"><Warn>Battery 8%</Warn></State>
      </Part>
    </div>
  );
}

export const Parts: Story = { render: () => <AllParts /> };
