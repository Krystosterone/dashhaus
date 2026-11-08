import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useSlider } from "@dashhaus/core/primitives";
import { usePicture } from "@dashhaus/core/hooks";
import type { PictureStatus } from "@dashhaus/core/hooks";
import { ARTWORK_SUNDAY, ARTWORK_TALL, PICTURE_DOORSTEP, PICTURE_NURSERY, PICTURE_WIDE } from "@dashhaus/core/seeds/pictures";
import {
  AlarmPill, AlertStatus, CardFrame, CardTitle, ChoiceChips, CircleButton, Confirm, Facts, IconClose, Keypad, Orb, Picture, Readout, Stepper, TodayStrip, TogglePill, Track, UnavailableSlot, paint, useCard,
} from "../shared/ui";
import type { CardFootprint, CardFrameProps, HourSample } from "../shared/ui";
import { BrightnessBar, ColorChips, IconBulb, WarmthRuler } from "../cards/light/parts";
import { LAMP_COLORS } from "../cards/light/color";
import type { LampColor } from "../cards/light/color";
import { VolumeBar } from "../cards/sound/parts";
import { PositionBar } from "../cards/cover/parts";
import { RangeBar } from "../cards/climate/RangeBar";
import { ModeIcon } from "../cards/climate/modes";
// The card tracks below bring their own fills, and an alarm its Disarm; their cards' CSS draws them.
import "../cards/light/LightCard.css";
import "../cards/sound/SoundCard.css";
import "../cards/cover/CoverCard.css";
import "../cards/climate/ClimateCard.css";
import "../cards/alarm/AlarmCard.css";

const meta = {
  title: "Orb/Foundations/Parts",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Orb's parts, the styled controls in src/skins/orb/shared/ that every card is built from, each across its states. " +
          "Primitives (packages/core/src/primitives/) are their behaviour; these are what a card draws. Everything here can be pressed or slid.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** One part: its name and rule, then its states on a card's surface, so the card system's tokens apply. */
function Part({ name, rule, cardRole = "energy", surface = "", children }: { name: string; rule: string; cardRole?: "energy" | "state" | "reading"; surface?: string; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 10, padding: "16px 0", borderTop: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gap: 2 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{name}</h2>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)" }}>{rule}</p>
      </div>
      <div className="hd-c">
        <div className={`hd ${surface}`} data-role={cardRole} style={{ height: "auto", gridTemplateRows: "none", display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 20 }}>
          {children}
        </div>
      </div>
    </section>
  );
}

/** One state of a part, captioned; `width` gives it its own size container, as a card of that width would. */
function State({ label, width, children }: { label: string; width?: number; children: ReactNode }) {
  return (
    <figure style={{ margin: 0, display: "grid", gap: 6, justifyItems: width ? "stretch" : "start", width, maxWidth: "100%" }}>
      {width ? <div className="hd-c">{children}</div> : children}
      <figcaption style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}>{label}</figcaption>
    </figure>
  );
}

const DAY: HourSample[] = [0, 0, 0, 0, 0, 0, 0.3, 0.8, 0.6, 0, 0, 0, 0.4, 0.5, "unavailable", "unavailable", 0.7, 0.9, 1, null, null, null, null, null];

/** The track with its own fill, as a card that only needs a level would draw it. */
function PlainTrack({ id, initial, lit = true }: { id: string; initial: number; lit?: boolean }) {
  const [v, setV] = useState(initial);
  const slider = useSlider<HTMLDivElement>({ value: v, min: 0, max: 100, inset: 0, valueText: (x) => `${x} percent`, onChange: setV });
  return (
    <Track
      slider={slider}
      inputs={[{ id, "aria-label": `Level, ${lit ? "on" : "off"}`, ...slider.inputProps }]}
      text={lit ? `${slider.value}%` : "Off"}
      lit={lit}
      style={{ "--v": slider.fraction(slider.value).toFixed(4) }}
    />
  );
}

/**
 * The card frame on its own, drawing a lamp's words, orb and pill as a card hands them over; a state passes what it
 * shows on top. `footprint` and `variant` are `useCard`'s.
 */
function Frame({ footprint = "standard", variant = "card", ...props }: Partial<Omit<CardFrameProps, "card">> & { footprint?: CardFootprint; variant?: "card" | "sheet" }) {
  const card = useCard("pt", { variant, footprint });
  return (
    <CardFrame
      card={card}
      name="Desk lamp"
      attrs={{ "data-state": "on", ...paint("energy", 0) }}
      orb={{ label: "Desk lamp", pressed: true, onToggle: () => {}, children: <IconBulb /> }}
      status="Study"
      value="On"
      onOpen={() => {}}
      control={<TogglePill label="Desk lamp: On" on onToggle={() => {}}>On</TogglePill>}
      facts={{ start: "Last changed 10:58", end: "Dimmable" }}
      {...props}
    />
  );
}

/** A thermostat's slot as it swaps: Turn on while off, the stepper while on; tap the orb. */
function SlotChange() {
  const [on, setOn] = useState(true);
  const [target, setTarget] = useState(21.5);
  return (
    <Frame
      name="Hall thermostat"
      attrs={{ "data-state": on ? "active" : "off", ...paint("energy", 0) }}
      orb={{ label: `Hall thermostat, ${on ? "heat" : "off"}`, pressed: on, onToggle: () => setOn(!on), children: <ModeIcon mode="heat" /> }}
      status={on ? "Heating" : "Off"}
      value={on ? `${target.toFixed(1)}°` : "Off"}
      slotKind={on ? "setpoint" : "off"}
      control={on
        ? <Stepper label="Hall thermostat target temperature" value={target} unit="°" format={(v) => v.toFixed(1)} min={16} max={26} step={0.5} onChange={setTarget} />
        : <TogglePill label="Hall thermostat: Off, turn on" on={false} turnOn onToggle={() => setOn(true)}>Turn on</TogglePill>}
    />
  );
}

/** A picture through the real lifecycle: it loads once on screen and decodes before it draws. */
function Live({ src, ...props }: { src: string } & Omit<Parameters<typeof Picture>[0], "picture">) {
  return <Picture picture={usePicture<HTMLElement>(src)} {...props} />;
}

/** A picture held in one status, for the states a lifecycle passes through. */
const held = (status: PictureStatus, src?: string) => ({ ref: () => {}, src, status });

function AllParts() {
  const [lamp, setLamp] = useState(true);
  const [pill, setPill] = useState(true);
  const [preset, setPreset] = useState<number>(50);
  const [setpoint, setSetpoint] = useState(21.5);
  const [level, setLevel] = useState(64);
  const [kelvin, setKelvin] = useState(3000);
  const [volume, setVolume] = useState(35);
  const [curtain, setCurtain] = useState(60);
  const [shade, setShade] = useState(30);
  const [range, setRange] = useState<[number, number]>([20, 24]);
  const setRangePair = (lo: number, hi: number) => setRange([lo, hi]);
  const [colour, setColour] = useState<LampColor | null>(LAMP_COLORS[1]);

  return (
    <div style={{ maxWidth: 760, fontFamily: "var(--font)", color: "var(--ink)" }}>
      <Part name="Orb" rule="The round main toggle, raised: tap it to switch, press and hold for details. On is the accent; energy adds a bloom that scales with how much is flowing. Unavailable is dashed.">
        <State label="Off"><Orb label="Lamp off" pressed={false} onToggle={() => {}}><IconBulb /></Orb></State>
        <State label="On, tap it"><Orb label="Lamp" pressed={lamp} onToggle={() => setLamp(!lamp)}><IconBulb /></Orb></State>
        <State label="On, dim"><Orb label="Lamp at 10%" pressed intensity={0.1} onToggle={() => {}}><IconBulb /></Orb></State>
        <State label="Small"><Orb label="Small lamp" pressed small onToggle={() => {}}><IconBulb /></Orb></State>
        <State label="Unavailable"><Orb label="Lamp unavailable" pressed={false} unavailable onToggle={() => {}}><IconBulb /></Orb></State>
      </Part>
      <Part name="Orb, a state" cardRole="state" rule="On without energy (a mode, an armed alarm): the same accent, no bloom.">
        <State label="On"><Orb label="Do not disturb" pressed onToggle={() => {}}><IconBulb /></Orb></State>
      </Part>

      <Part name="Card frame" rule="Every card's frame (CardFrame): the head, with the orb or a reading's icon, the name that opens details over its status line, and the readout; then the slot and the card's own blocks; the sheet adds its close button and its small print. What a card hands it is generic: what its slot shows, so a control that swaps for another fades in; a word for why it is unavailable; its own hint for the name's button; its own close label.">
        <State label="A card" width={300}><Frame /></State>
        <State label="Its slot changes: tap the orb" width={300}><SlotChange /></State>
        <State label="Unavailable, saying why" width={300}><Frame unavailable unavailableWord="Charging" lastSeen="10:42" attrs={{ "data-state": "unavailable", ...paint("energy", 0) }} /></State>
        <State label="Its own hint: the name reads “Desk lamp settings”" width={300}><Frame openHint="settings" /></State>
        <State label="In its sheet, its own close label" width={340}><Frame variant="sheet" closeLabel="Close Desk lamp details" closeFocus={false} onClose={() => {}} /></State>
      </Part>

      <Part name="Card title" rule="The name, and the button that opens details when the card has them, marked by a chevron. Warnings ride under it as text with a cue.">
        <State label="Opens details" width={220}><CardTitle id="parts-title-open" name="Living room lamp" onOpen={() => {}}><p className="hd-area">Living room</p></CardTitle></State>
        <State label="No details" width={220}><CardTitle id="parts-title-plain" name="Living room lamp"><p className="hd-area">Living room</p></CardTitle></State>
        <State label="Warning" width={220}><CardTitle id="parts-title-warn" name="Front door"><p className="hd-area"><AlertStatus label="Warning">Open 25 min</AlertStatus></p></CardTitle></State>
      </Part>

      <Part name="Toggle pill" rule="A full-width button: raised when off, the accent when on. A unit whose status already says Off gets the quieter Turn on.">
        <State label="Off" width={220}><TogglePill label="Fan off" on={false} onToggle={() => {}}>Off</TogglePill></State>
        <State label="On, tap it" width={220}><TogglePill label="Fan" on={pill} onToggle={() => setPill(!pill)}>{pill ? "On" : "Off"}</TogglePill></State>
        <State label="Turn on" width={220}><TogglePill label="Turn on heat" on={false} turnOn onToggle={() => {}}>Turn on</TogglePill></State>
      </Part>

      <Part name="Chips" rule="One of several: raised, the chosen one in the accent. A card's own chips add their class to the chip's (light's colours, each with its swatch).">
        <State label="One chosen" width={340}>
          <ChoiceChips id="parts-chips" label="Preset" value={preset} onChange={setPreset} options={[{ value: 5, label: "Night", sub: "5%" }, { value: 25, label: "Dim", sub: "25%" }, { value: 50, label: "Half", sub: "50%" }, { value: 100, label: "Full", sub: "100%" }]} />
        </State>
        <State label="Light: colour chips, as in its sheet" width={480}><ColorChips id="parts-colour" value={colour} onChange={setColour} /></State>
      </Part>

      <Part name="Stepper" rule="A groove with a raised minus and plus at its ends, the value between. At an end its button lies flat. Its kicker shows from 260 px.">
        <State label="From 260 px" width={280}><Stepper label="Heat to" kicker="Heat to" value={setpoint} unit="°" format={(v) => v.toFixed(1)} min={18} max={23} step={0.5} onChange={setSetpoint} /></State>
        <State label="Narrow" width={200}><Stepper label="Heat to, narrow" kicker="Heat to" value={setpoint} unit="°" format={(v) => v.toFixed(1)} min={18} max={23} step={0.5} onChange={setSetpoint} /></State>
        <State label="At the top" width={200}><Stepper label="Heat to, at max" value={23} unit="°" format={(v) => v.toFixed(1)} min={18} max={23} step={0.5} onChange={() => {}} /></State>
        <State label="Its cue: a compact row's mode" width={200}><Stepper label="Heat to, with its mode" cue={<ModeIcon mode="heat" />} value={setpoint} unit="°" format={(v) => v.toFixed(1)} min={18} max={23} step={0.5} onChange={setSetpoint} /></State>
      </Part>

      <Part name="Track" rule="A groove you slide along or set: tap to jump (animated), drag to follow the finger, a vertical swipe scrolls the page. The fill is the accent; the value flips where it passes. Off is the plain groove.">
        <State label="On, slide it" width={280}><PlainTrack id="parts-track-on" initial={40} /></State>
        <State label="Off" width={280}><PlainTrack id="parts-track-off" initial={40} lit={false} /></State>
      </Part>

      <Part name="Track, each card's fill" rule="The same track, with the fill each card brings: light keeps a lit end cap, curtains part from the middle, the heat/cool range fills the zone the unit works in and its handles ride it, and the warmth ruler is a scale with no groove.">
        <State label="Light: brightness" width={280}><BrightnessBar id="parts-light" label="Brightness" value={level} on onChange={setLevel} /></State>
        <State label="Sound: volume" width={280}><VolumeBar id="parts-sound" value={volume} on onChange={setVolume} /></State>
        <State label="Cover: curtains" width={280}><PositionBar id="parts-curtain" label="Curtains position" kind="curtain" position={curtain} moving={false} text={`${curtain}% open`} onChange={setCurtain} /></State>
        <State label="Cover: shade" width={280}><PositionBar id="parts-shade" label="Shade position" kind="shade" position={shade} moving={false} text={`${shade}% open`} onChange={setShade} /></State>
        <State label="Climate: heat/cool range, cooling" width={280}>
          <div data-action="cooling" className="cw"><RangeBar id="parts-range" name="Thermostat" low={range[0]} high={range[1]} current={22.5} min={16} max={30} step={0.5} onChange={setRangePair} /></div>
        </State>
        <State label="Light: warmth" width={280}><WarmthRuler id="parts-warmth" kelvin={kelvin} min={2200} max={6500} onChange={setKelvin} /></State>
        <State label="Light: warmth, lamp off" width={280}><WarmthRuler id="parts-warmth-off" kelvin={2700} min={2200} max={6500} disabled onChange={() => {}} /></State>
      </Part>

      <Part name="Readout" cardRole="reading" rule="A reading's figures with no container: look at it. With details, the whole readout opens them.">
        <State label="Opens details" width={220}>
          <Readout label="21.4 degrees, 48 percent humidity" onOpen={() => {}}><span className="hd-bar"><span className="hd-metric">21.4°</span></span></Readout>
        </State>
        <State label="No reading yet" width={220}>
          <Readout label="No reading yet"><span className="hd-bar"><span className="hd-none">No reading yet</span></span></Readout>
        </State>
      </Part>

      <Part name="Picture" cardRole="reading" rule="A camera's still or a player's artwork, on usePicture: a readout, so a neutral well with no edge of its own, the frame in it and never a word over it. It loads once seen, decodes before it draws, and keeps its last frame while the next loads. Before a frame, or with none to keep, the well holds the card's glyph; unavailable is dashed and shows no frame at all. Pressed, it opens the stream or the details; unavailable, it takes no press.">
        <State label="A still, 16:9" width={280}><Live src={PICTURE_DOORSTEP} label="Front door camera" onOpen={() => {}} openLabel="Open live view" /></State>
        <State label="At night" width={280}><Live src={PICTURE_NURSERY} label="Nursery camera" /></State>
        <State label="21:9, cropped" width={280}><Live src={PICTURE_WIDE} label="Driveway camera" /></State>
        <State label="21:9 whole, in a sheet" width={280}><Live src={PICTURE_WIDE} label="Driveway camera" fit="contain" /></State>
        <State label="Artwork, 1:1" width={120}><Live src={ARTWORK_SUNDAY} label="Artwork" ratio="1 / 1" /></State>
        <State label="3:4 artwork, cropped" width={120}><Live src={ARTWORK_TALL} label="Artwork" ratio="1 / 1" /></State>
        <State label="Before a frame" width={280}><Picture picture={held("loading")} label="Front door camera" /></State>
        <State label="Failed, nothing kept" width={280}><Picture picture={held("failed")} label="Front door camera" /></State>
        <State label="Unavailable" width={280}><Picture picture={held("ready", PICTURE_DOORSTEP)} label="Front door camera" unavailable onOpen={() => {}} /></State>
      </Part>

      <Part name="Unavailable" rule="What stands in a card's slot when its entity is unavailable: a dashed outline and muted text. Nothing else is dashed.">
        <State label="In a card" width={280}><UnavailableSlot lastSeen="10:42" /></State>
      </Part>

      <Part name="Alarm pill" cardRole="reading" rule="An alarm that has gone off (a baby's oxygen, smoke): the one place warn fills, in the slot over the control, in every footprint. Its alert on the left, its figure or since when on the right; the fill deepens under the words, and holds still under reduced motion.">
        <State label="Smoke" width={280}><AlarmPill alert="Smoke alarm" value="Since 11:52" /></State>
        <State label="Two vitals, a figure" width={340}><AlarmPill alert="Low oxygen" more="High pulse" value="84% O₂" /></State>
        <State label="With the one thing to do" width={340}><AlarmPill alert="Alarm" more="Hall motion" action={<button type="button" className="al-cd-b al-alarm-b">Disarm</button>} /></State>
      </Part>

      <Part name="Today strip" surface="hd--featured" rule="24 hourly sticks: height is that hour's level, the current hour is the accent. Hours not yet come are a short line; unavailable hours are dashed.">
        <State label="A day so far" width={340}><TodayStrip samples={DAY} currentHour={18} summary="On 4h 10m" /></State>
      </Part>

      <Part name="Confirm and Keypad" cardRole="state" rule="A guarded action's answer, in the sheet, on useGuardedAction: the question when no code is asked for (Cancel raised and focused, the action in the inverse, taking no press for a moment), or the keypad when one is (raised digits, enter in the inverse; a wrong code shakes the dots).">
        <State label="The question" width={340}><Confirm question="Unlock Front door?" detail="Anyone at the door can open it." action="Unlock" onConfirm={() => {}} onCancel={() => {}} /></State>
        <State label="Waiting for the answer" width={340}><Confirm question="Unlock Front door?" detail="Anyone at the door can open it." action="Unlock" busy waiting="Waiting for the lock…" onConfirm={() => {}} onCancel={() => {}} /></State>
        <State label="Didn't go through" width={340}><Confirm question="Unlock Front door?" detail="Anyone at the door can open it." action="Unlock" error="Didn’t go through. Try again." onConfirm={() => {}} onCancel={() => {}} /></State>
        <State label="The keypad (1234)" width={340}><Keypad prompt="Enter the code to disarm" onSubmit={(code) => code === "1234"} onCancel={() => {}} /></State>
      </Part>

      <Part name="Facts" rule="The sheet's small print: two facts, at its start and end, in the words @dashhaus/core/entities/facts gives every card. Under a hairline, in the faint ink; a warning keeps its colour.">
        <State label="Last changed" width={340}><Facts start="Last changed 10:58" end="Dimmable, warmth" /></State>
        <State label="Unavailable" width={340}><Facts start="Last seen 10:42" end="Kitchen" /></State>
        <State label="A warning" width={340}><Facts start="Battery 8%, replace soon" warn end="Updated 10:42" /></State>
      </Part>

      <Part name="Circle button" rule="The sheet's close button: round and raised. A card has no other.">
        <State label="Close"><CircleButton label="Close"><IconClose /></CircleButton></State>
      </Part>
    </div>
  );
}

export const Parts: Story = { render: () => <AllParts /> };
