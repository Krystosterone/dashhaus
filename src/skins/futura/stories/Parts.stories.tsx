import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { HourSample } from "@dashhaus/core/entities/history";
import { FuturaAction, FuturaCardFrame, FuturaDial, FuturaDialKey, FuturaLevel, FuturaMeter, FuturaReadout, FuturaStats, FuturaStepper } from "../shared/ui";
import { IconLight } from "../cards/light/icons";
import { IconToggle } from "../cards/toggle/icons";
import { IconSensor } from "../cards/sensor/icons";
import { IconHeat } from "../cards/climate/icons";
import "./foundations.css";

const ahead = (n: number) => Array<HourSample>(n).fill(null);
const LAMP_DAY: HourSample[] = [0, 0, 0, 0, 0, 0, 0.3, 0.6, 0.8, 0.8, 0.5, 0.8, ...ahead(12)];
const GAP_DAY: HourSample[] = [0.4, 0.4, 0.5, 0.4, 0.3, 0.3, 0.2, 0.1, "unavailable", "unavailable", "unavailable", "unavailable", ...ahead(12)];
const READING_DAY: HourSample[] = [0.5, 0.42, 0.36, 0.3, 0.26, 0.3, 0.52, 0.74, 0.9, 0.84, 0.84, 0.88, ...ahead(12)];

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return <section aria-label={title}><h2>{title}</h2><p className="futura-board-note">{note}</p>{children}</section>;
}

function Specimen({ caption, wide, children }: { caption: string; wide?: boolean; children: ReactNode }) {
  return <figure className={wide ? "futura-specimen futura-specimen-wide" : "futura-specimen"}>{children}<figcaption>{caption}</figcaption></figure>;
}

function Parts() {
  const [lamp, setLamp] = useState(true);
  const [mode, setMode] = useState(false);
  const [level, setLevel] = useState(64);
  const [target, setTarget] = useState(21.5);
  const [key, setKey] = useState(true);
  return (
    <div className="futura-board">
      <div className="futura-board-inner">
        <Section title="Dial" note="Every card leads with one: 24 hour ticks, a 270° groove and the lit arc on it, the domain glyph in a raised core. Lit glows; unlit keeps the arc at half strength; unavailable breaks the ring.">
          <div className="futura-board-row">
            <Specimen caption="Off"><span className="futura-specimen-dial"><FuturaDial level={0}><IconToggle /></FuturaDial></span></Specimen>
            <Specimen caption="Cyan · lit"><span className="futura-specimen-dial"><FuturaDial level={1} lit><IconToggle /></FuturaDial></span></Specimen>
            <Specimen caption="Amber · 30%"><span className="futura-specimen-dial"><FuturaDial level={0.3} tone="amber" lit><IconLight /></FuturaDial></span></Specimen>
            <Specimen caption="Amber · 80%"><span className="futura-specimen-dial"><FuturaDial level={0.8} tone="amber" lit><IconLight /></FuturaDial></span></Specimen>
            <Specimen caption="Heating"><span className="futura-specimen-dial"><FuturaDial level={0.6} tone="amber" lit><IconHeat /></FuturaDial></span></Specimen>
            <Specimen caption="Reading · 44%"><span className="futura-specimen-dial"><FuturaDial level={0.44}><IconSensor /></FuturaDial></span></Specimen>
            <Specimen caption="Unavailable"><span className="futura-specimen-dial"><FuturaDial level={0.7} unavailable><IconLight /></FuturaDial></span></Specimen>
          </div>
        </Section>
        <Section title="Dial key" note="The dial as a card's switch: tap it, it latches (aria-pressed) and lights. Press shrinks it; unavailable stays focusable and does nothing.">
          <div className="futura-board-row">
            <Specimen caption={lamp ? "Lamp · on" : "Lamp · off"}><span className="futura-specimen-dial"><FuturaDialKey label="Power, Ceiling" pressed={lamp} onPress={() => setLamp(!lamp)} level={lamp ? 0.8 : 0} tone="amber"><IconLight /></FuturaDialKey></span></Specimen>
            <Specimen caption={mode ? "Mode · on" : "Mode · off"}><span className="futura-specimen-dial"><FuturaDialKey label="Power, Guest mode" pressed={mode} onPress={() => setMode(!mode)} level={mode ? 1 : 0}><IconToggle icon="guest" /></FuturaDialKey></span></Specimen>
            <Specimen caption="Unavailable"><span className="futura-specimen-dial"><FuturaDialKey label="Power, Shelf strip" pressed={false} unavailable onPress={() => undefined} level={0}><IconLight /></FuturaDialKey></span></Specimen>
          </div>
        </Section>
        <Section title="Readout and telemetry" note="Figures in the console's mono face; a lit card's figure takes its tone. Telemetry is a mono caps label over its value; a warning is alert ink, in words.">
          <div className="futura-board-row">
            <Specimen caption="Reading"><FuturaReadout value="21.4" unit="°C" /></Specimen>
            <Specimen caption="Percent"><FuturaReadout value="80" unit="%" /></Specimen>
            <Specimen caption="Word"><FuturaReadout value="OFF" /></Specimen>
            <Specimen caption="Unavailable"><FuturaReadout value="—" /></Specimen>
            <Specimen caption="Telemetry" wide><FuturaStats items={[{ label: "Humidity", value: "44%" }, { label: "Battery", value: "8% · low", alert: true }, { label: "Updated", value: "11:52" }]} /></Specimen>
          </div>
        </Section>
        <Section title="Meter" note="Today in 24 segments: lit hours in the tone at their strength, empty hours a faint stub, hours ahead dim, an unavailable hour a dotted gap, the current hour marked.">
          <div className="futura-board-row">
            <Specimen caption="A lamp's day" wide><FuturaMeter samples={LAMP_DAY} currentHour={11} caption="Lit 4h 54m" tone="amber" /></Specimen>
            <Specimen caption="A reading" wide><FuturaMeter samples={READING_DAY} currentHour={11} caption="Low 19.5° · high 21.4°" /></Specimen>
            <Specimen caption="Gone unavailable" wide><FuturaMeter samples={GAP_DAY} currentHour={11} caption="On 2h 36m" /></Specimen>
          </div>
        </Section>
        <Section title="Keys, stepper and level" note="Raised bezel keys are pressed; the sunk groove is slid or tapped. A latched key lights in its tone; an unavailable one turns dashed and stays focusable.">
          <div className="futura-board-row">
            <Specimen caption="Key"><FuturaAction label="Heat" onPress={() => undefined} /></Specimen>
            <Specimen caption="Latched · cyan"><FuturaAction label="Cool" pressed={key} onPress={() => setKey(!key)} /></Specimen>
            <Specimen caption="Latched · amber"><FuturaAction label="Heat" tone="amber" pressed onPress={() => undefined} /></Specimen>
            <Specimen caption="Unavailable"><FuturaAction label="Auto" unavailable onPress={() => undefined} /></Specimen>
            <Specimen caption="Stepper"><FuturaStepper label="Target temperature" value={`${target}°`} tone="amber" onDown={() => setTarget(target - 0.5)} onUp={() => setTarget(target + 0.5)} /></Specimen>
          </div>
          <div className="futura-board-row" style={{ marginTop: 18 }}>
            <Specimen caption={`Level · ${level}%`} wide><FuturaLevel label="Brightness, Ceiling" value={level} min={1} max={100} tone="amber" valueText={(v) => `${v} percent`} onChange={setLevel} /></Specimen>
            <Specimen caption="Level · off" wide><FuturaLevel label="Brightness, Reading lamp" value={70} min={1} max={100} tone="amber" lit={false} valueText={(v) => `Off. Last set to ${v} percent`} onChange={() => undefined} /></Specimen>
            <Specimen caption="Level · unavailable" wide><FuturaLevel label="Brightness, Shelf strip" value={30} min={1} max={100} unavailable valueText={(v) => `${v} percent`} onChange={() => undefined} /></Specimen>
          </div>
        </Section>
        <Section title="Bezel" note="The card: a raised panel with a bright index tick. Lit, its edge and halo glow in its tone; unavailable, the bezel is dashed and the dial broken. 176 px standard, 72 px compact, whatever its state.">
          <div className="futura-board-grid">
            <FuturaCardFrame name="Ceiling" area="Living room" state="on" tone="amber" lit level={0.8} icon={<IconLight />} status="On · 2700 K" summary={<FuturaReadout value="80" unit="%" />} meter={{ samples: LAMP_DAY, currentHour: 11, caption: "Lit 4h 54m" }} stats={[{ label: "Warmth", value: "2700 K" }, { label: "Changed", value: "10:31" }]} />
            <FuturaCardFrame name="Guest mode" area="Whole home" state="off" level={0} icon={<IconToggle icon="guest" />} status="Off" summary={<FuturaReadout value="OFF" />} meter={{ samples: READING_DAY.map((x) => (typeof x === "number" ? 0 : x)), currentHour: 11, caption: "Off all day" }} stats={[{ label: "Changed", value: "Fri 18:30" }]} />
            <FuturaCardFrame name="Shelf strip" area="Living room" state="unavailable" icon={<IconLight />} summary={<FuturaReadout value="—" />} meter={{ samples: GAP_DAY, currentHour: 11, caption: "Lit 2h 36m" }} stats={[{ label: "Last seen", value: "10:42" }]} />
          </div>
          <div className="futura-board-grid" style={{ marginTop: 12 }}>
            <FuturaCardFrame footprint="compact" name="Ceiling" area="Living room" state="on" tone="amber" lit level={0.8} icon={<IconLight />} status="On · 2700 K" summary={<FuturaReadout value="80" unit="%" />} />
            <FuturaCardFrame footprint="compact" name="Living room" area="Living room" state="ok" level={0.44} icon={<IconSensor />} status="Steady · comfortable" summary={<FuturaReadout value="21.4" unit="°C" />} />
            <FuturaCardFrame footprint="compact" name="Shelf strip" area="Living room" state="unavailable" icon={<IconLight />} summary={<FuturaReadout value="—" />} />
          </div>
        </Section>
      </div>
    </div>
  );
}

const meta = { title: "Futura/Foundations/Parts", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const States: Story = { render: () => <Parts /> };
