import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { GlassGrid, GlassPage } from "./ui";
import { GlassWeatherCard } from "./WeatherCard";
import { CLIMATES, DAILY, DEMO_NOW, DemoClimate, DemoLight, DemoToggle, LIGHTS, TOGGLES, WEATHERS } from "./demo";

function Board({ label, children }: { label: string; children: ReactNode }) {
  return <GlassPage><GlassGrid label={label}>{children}</GlassGrid></GlassPage>;
}

const meta = {
  title: "Glass/Cards",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** Cooling with fan and preset; a heat/cool range edited one end at a time; off; unavailable; worst case. */
export const Climate: Story = {
  render: () => (
    <Board label="Climate">
      {Object.entries(CLIMATES).map(([k, seed]) => <DemoClimate key={k} seed={seed} />)}
    </Board>
  ),
};

/** A colour lamp, a warm-white lamp, an off dimmer, an on/off light, unavailable, worst case. */
export const Light: Story = {
  render: () => (
    <Board label="Lights">
      {Object.entries(LIGHTS).map(([k, seed]) => <DemoLight key={k} seed={seed} />)}
    </Board>
  ),
};

/** On, off, on until a time, unavailable, and a long name. */
export const Toggle: Story = {
  render: () => (
    <Board label="Toggles">
      {Object.entries(TOGGLES).map(([k, seed]) => <DemoToggle key={k} seed={seed} />)}
    </Board>
  ),
};

/** Today with the next days, unavailable, and a stormy night in Fahrenheit with a long name. */
export const Weather: Story = {
  render: () => (
    <Board label="Weather">
      <GlassWeatherCard entity={WEATHERS.home} daily={DAILY} now={DEMO_NOW} />
      <GlassWeatherCard entity={WEATHERS.unavailable} now={DEMO_NOW} />
      <GlassWeatherCard entity={WEATHERS.worst} daily={DAILY.map((d) => ({ ...d, high: d.high * 4.5, low: d.low * -3 }))} now={DEMO_NOW} />
    </Board>
  ),
};
