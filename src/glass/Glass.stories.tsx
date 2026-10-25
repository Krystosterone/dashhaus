import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { GlassCard, GlassGrid, GlassHeader, GlassPage, PowerButton, RoomBar } from "./ui";
import type { GlassMode, GlassSize, Room } from "./ui";
import { IconAirConditioner, IconBulb, IconRouter, IconSpeaker, IconTv, IconWeather } from "./icons";

/** A morning, so the greeting doesn't change with the clock the stories are opened at. */
const NOW = new Date(2026, 9, 25, 9, 30);

const ROOMS: Room[] = [
  { id: "home", name: "Home" },
  { id: "living", name: "Living room" },
  { id: "bedroom", name: "Bedroom" },
  { id: "nursery", name: "Nursery" },
  { id: "kitchen", name: "Kitchen" },
  { id: "office", name: "Office" },
];

interface Sample { id: string; size: GlassSize; name: string; subtitle: string; icon: ReactNode; state?: "on" | "off" | "unavailable" }

const SAMPLES: Sample[] = [
  { id: "weather", size: "xl", name: "Weather", subtitle: "Home", icon: <IconWeather /> },
  { id: "ac", size: "l", name: "Air conditioner", subtitle: "Living room", icon: <IconAirConditioner />, state: "on" },
  { id: "tv", size: "m", name: "TV", subtitle: "Living room", icon: <IconTv />, state: "off" },
  { id: "speaker", size: "s", name: "Speaker", subtitle: "Kitchen", icon: <IconSpeaker />, state: "unavailable" },
  { id: "wifi", size: "s", name: "WiFi", subtitle: "Office", icon: <IconRouter />, state: "on" },
  { id: "led", size: "m", name: "Ambient LED", subtitle: "Living room", icon: <IconBulb />, state: "on" },
];

const WORST: Sample[] = [
  { id: "weather", size: "xl", name: "Weather station on the north-facing balcony railing", subtitle: "Outdoor · last updated a long while ago", icon: <IconWeather /> },
  { id: "ac", size: "l", name: "Climatiseur de la chambre principale à l'étage", subtitle: "Chambre principale et salle de bain attenante", icon: <IconAirConditioner />, state: "on" },
  { id: "tv", size: "m", name: "リビングルームのテレビ", subtitle: "リビングルーム", icon: <IconTv />, state: "off" },
  { id: "speaker", size: "s", name: "Kitchen speaker beside the coffee machine", subtitle: "Kitchen", icon: <IconSpeaker />, state: "unavailable" },
  { id: "wifi", size: "s", name: "W", subtitle: "", icon: <IconRouter />, state: "on" },
  { id: "led", size: "m", name: "superlongunbrokenlightnamewithoutanyspaces_led_strip", subtitle: "Basement home theatre and games room", icon: <IconBulb />, state: "on" },
];

const MANY_ROOMS: Room[] = [
  { id: "home", name: "Home" },
  ...["Living room", "Primary bedroom", "Nursery", "Kitchen", "Office", "Guest bedroom", "Basement", "Garage", "Laundry", "Backyard", "Front porch"].map((name) => ({ id: name, name })),
];

const SIZE_NOTE: Record<GlassSize, string> = { s: "s · 1 × 2", m: "m · 2 × 2", l: "l · 2 × 4", xl: "xl · 2 × 4, 3 × 4 on 6 columns" };

function Foundations({ glass, samples = SAMPLES, rooms = ROOMS, title = "Laid-back home", name = "Sam" }: { glass: GlassMode; samples?: Sample[]; rooms?: Room[]; title?: string; name?: string }) {
  const [room, setRoom] = useState(rooms[0].id);
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(samples.map((s) => [s.id, s.state === "on"])));
  return (
    <GlassPage glass={glass} bar={<RoomBar rooms={rooms} current={room} onPick={setRoom} />}>
      <GlassHeader title={title} name={name} now={NOW} />
      <GlassGrid label="Devices">
        {samples.map((s) => {
          const unavailable = s.state === "unavailable";
          const state = !s.state ? undefined : unavailable ? "unavailable" : on[s.id] ? "on" : "off";
          return (
            <GlassCard
              key={s.id}
              size={s.size}
              name={s.name}
              subtitle={s.subtitle || undefined}
              icon={s.icon}
              state={state}
              action={s.state && <PowerButton label={s.name} on={on[s.id]} unavailable={unavailable} onToggle={() => setOn((prev) => ({ ...prev, [s.id]: !prev[s.id] }))} />}
            >
              <p className="gl-sub">{SIZE_NOTE[s.size]}</p>
            </GlassCard>
          );
        })}
      </GlassGrid>
    </GlassPage>
  );
}

const meta = {
  title: "Glass/Foundations",
  component: Foundations,
  parameters: { layout: "fullscreen" },
  args: { glass: "flat" },
  argTypes: { glass: { control: "inline-radio", options: ["flat", "blur"] } },
} satisfies Meta<typeof Foundations>;
export default meta;

type Story = StoryObj<typeof meta>;

/** The default: panels opaque enough to read with no backdrop filter. Compare with Blur on a mid-range phone. */
export const Flat: Story = {};

/** The live backdrop blur. Over a smooth gradient it changes little you can see, and re-blurs every panel as the page scrolls. */
export const Blur: Story = { args: { glass: "blur" } };

/** Long, short, unbroken and non-Latin names, an empty subtitle, and more rooms than fit the bar. */
export const WorstCase: Story = {
  args: { samples: WORST, rooms: MANY_ROOMS, title: "A very long dashboard title that has to wrap across several lines on a phone", name: "Maximiliana-Alexandrina" },
};
