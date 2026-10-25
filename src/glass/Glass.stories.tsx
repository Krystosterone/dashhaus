import { Fragment, useState } from "react";
import type { ReactElement } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { GlassGrid, GlassHeader, GlassPage, RoomBar } from "./ui";
import type { Room } from "./ui";
import { GlassWeatherCard } from "./WeatherCard";
import { CLIMATES, DAILY, DEMO_NOW, DemoClimate, DemoLight, DemoToggle, LIGHTS, TOGGLES, WEATHERS } from "./demo";

const HOME: Room = { id: "home", name: "Home" };

interface Item { id: string; area?: string; card: ReactElement }

const ITEMS: Item[] = [
  { id: "weather", card: <GlassWeatherCard entity={WEATHERS.home} daily={DAILY} now={DEMO_NOW} /> },
  { id: "ac", area: CLIMATES.cooling.area, card: <DemoClimate seed={CLIMATES.cooling} /> },
  { id: "wifi", area: TOGGLES.wifi.area, card: <DemoToggle seed={TOGGLES.wifi} /> },
  { id: "quiet", area: TOGGLES.quiet.area, card: <DemoToggle seed={TOGGLES.quiet} /> },
  { id: "led", area: LIGHTS.colour.area, card: <DemoLight seed={LIGHTS.colour} /> },
  { id: "lamp", area: LIGHTS.warm.area, card: <DemoLight seed={LIGHTS.warm} /> },
  { id: "thermostat", area: CLIMATES.range.area, card: <DemoClimate seed={CLIMATES.range} /> },
  { id: "pendant", area: LIGHTS.dimmable.area, card: <DemoLight seed={LIGHTS.dimmable} /> },
];

const WORST: Item[] = [
  { id: "weather", card: <GlassWeatherCard entity={WEATHERS.worst} daily={DAILY} now={DEMO_NOW} /> },
  { id: "ac", area: CLIMATES.worst.area, card: <DemoClimate seed={CLIMATES.worst} /> },
  { id: "toggle", area: TOGGLES.worst.area, card: <DemoToggle seed={TOGGLES.worst} /> },
  { id: "unav", area: TOGGLES.unavailable.area, card: <DemoToggle seed={TOGGLES.unavailable} /> },
  { id: "led", area: LIGHTS.worst.area, card: <DemoLight seed={LIGHTS.worst} /> },
  { id: "night", area: LIGHTS.unavailable.area, card: <DemoLight seed={LIGHTS.unavailable} /> },
];

/** Home shows every card; a room shows the cards in it, the way the room bar filters. */
function Page({ items, title, name, extraRooms = [] }: { items: Item[]; title: string; name?: string; extraRooms?: string[] }) {
  const areas = [...new Set([...items.flatMap((i) => (i.area && i.area !== "Home" ? [i.area] : [])), ...extraRooms])];
  const rooms: Room[] = [HOME, ...areas.map((a) => ({ id: a, name: a }))];
  const [room, setRoom] = useState(HOME.id);
  const shown = room === HOME.id ? items : items.filter((i) => i.area === room);
  return (
    <GlassPage bar={<RoomBar rooms={rooms} current={room} onPick={setRoom} />}>
      <GlassHeader title={title} name={name} now={DEMO_NOW} />
      <GlassGrid label={rooms.find((r) => r.id === room)?.name ?? "Home"}>
        {shown.map((i) => <Fragment key={i.id}>{i.card}</Fragment>)}
      </GlassGrid>
    </GlassPage>
  );
}

const meta = {
  title: "Glass/Foundations",
  component: Page,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Page>;
export default meta;

type Story = StoryObj<typeof meta>;

/** The page: greeting and title, the bento of live-shaped cards, and the room bar filtering them. */
export const Home: Story = { args: { items: ITEMS, title: "Laid-back home", name: "Sam" } };

/** Long, unbroken and non-Latin names, extreme readings, unavailable cards, and more rooms than fit the bar. */
export const WorstCase: Story = {
  args: {
    items: WORST,
    title: "A very long dashboard title that has to wrap across several lines on a phone",
    name: "Maximiliana-Alexandrina",
    extraRooms: ["Primary bedroom", "Guest bedroom", "Garage", "Laundry", "Backyard", "Front porch"],
  },
};
