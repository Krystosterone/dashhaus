import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useSlider } from "@dashhaus/core/primitives";
import {
  AlarmPill, AlertStatus, CardTitle, ChoiceChips, CircleButton, Confirm, Facts, IconClose, Keypad, Orb, Readout, Stepper, TodayStrip, TogglePill, Track, UnavailableSlot,
} from "../shared/ui";
import type { HourSample } from "../shared/ui";
import { BrightnessBar, IconBulb, WarmthRuler } from "../cards/light/parts";
import { VolumeBar } from "../cards/sound/parts";
import { PositionBar } from "../cards/cover/parts";
import { RangeBar } from "../cards/climate/RangeBar";
// The card tracks below bring their own fills; their cards' CSS draws them.
import "../cards/light/LightCard.css";
import "../cards/sound/SoundCard.css";
import "../cards/cover/CoverCard.css";
import "../cards/climate/ClimateCard.css";

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

      <Part name="Chips" rule="One of several: raised, the chosen one in the accent.">
        <State label="One chosen" width={340}>
          <ChoiceChips id="parts-chips" label="Preset" value={preset} onChange={setPreset} options={[{ value: 5, label: "Night", sub: "5%" }, { value: 25, label: "Dim", sub: "25%" }, { value: 50, label: "Half", sub: "50%" }, { value: 100, label: "Full", sub: "100%" }]} />
        </State>
      </Part>

      <Part name="Stepper" rule="A groove with a raised minus and plus at its ends, the value between. At an end its button lies flat. Its kicker shows from 260 px.">
        <State label="From 260 px" width={280}><Stepper label="Heat to" kicker="Heat to" value={setpoint} unit="°" format={(v) => v.toFixed(1)} min={18} max={23} step={0.5} onChange={setSetpoint} /></State>
        <State label="Narrow" width={200}><Stepper label="Heat to, narrow" kicker="Heat to" value={setpoint} unit="°" format={(v) => v.toFixed(1)} min={18} max={23} step={0.5} onChange={setSetpoint} /></State>
        <State label="At the top" width={200}><Stepper label="Heat to, at max" value={23} unit="°" format={(v) => v.toFixed(1)} min={18} max={23} step={0.5} onChange={() => {}} /></State>
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

      <Part name="Unavailable" rule="What stands in a card's slot when its entity is unavailable: a dashed outline and muted text. Nothing else is dashed.">
        <State label="In a card" width={280}><UnavailableSlot lastSeen="10:42" /></State>
      </Part>

      <Part name="Alarm pill" cardRole="reading" rule="An alarm that has gone off (a baby's oxygen, smoke): the one place warn fills, in the slot over the control, in every footprint. Its alert on the left, its figure or since when on the right; the fill deepens under the words, and holds still under reduced motion.">
        <State label="Smoke" width={280}><AlarmPill alert="Smoke alarm" value="Since 11:52" /></State>
        <State label="Two vitals, a figure" width={340}><AlarmPill alert="Low oxygen" more="High heart rate" value="84% O₂" /></State>
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
