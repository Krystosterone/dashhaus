import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider, useHaSelector, useHaStatus, useHaStore } from "../../provider";
import { createHaStore } from "../../store";
import type { HaTransport } from "../../types";
import { createDemoHouseTransport } from "../demo";
import { parseGlassConfig } from "./config";
import { autoGlassCards } from "./auto";
import { GlassDashboard } from "./GlassDashboard";

const meta = {
  title: "Home Assistant/Glass dashboard",
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "The `custom:home-dashboard-glass` Lovelace card (docs/deploy.md), on the demo transports. The greeting's clock is fixed at 9:30." } },
  },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

const NOW = new Date(2026, 9, 24, 9, 30);

/** The YAML in docs/deploy.md's glass example, as Lovelace hands it to the card. */
const YAML = {
  type: "custom:home-dashboard-glass",
  title: "Laid-back home",
  name: "Sam",
  cards: [
    "weather.home",
    { entity: "climate.living_room", area: "Living room" },
    { entity: "light.living_room", area: "Living room" },
    { entity: "input_boolean.guest_mode", icon: "guest" },
    { entity: "input_boolean.dnd", icon: "bell-off" },
    { entity: "switch.office", area: "Office" },
    { entity: "switch.porch", area: "Front porch" },
  ],
};

function House({ children, transport }: { children: ReactNode; transport?: HaTransport }) {
  const store = useMemo(() => createHaStore(transport ?? createDemoHouseTransport()), [transport]);
  return <HaProvider store={store}>{children}</HaProvider>;
}

function Configured() {
  const config = parseGlassConfig(YAML);
  return <GlassDashboard title={config.title} name={config.name} items={config.cards ?? []} now={NOW} />;
}

/** Every supported entity, as the card draws it when `cards` is left out. The demo house has no areas, so no room bar. */
function Automatic() {
  const entities = useHaSelector((snapshot) => snapshot.entities);
  const items = useMemo(() => autoGlassCards({ states: entities }), [entities]);
  return <GlassDashboard title="Home" name="Sam" items={items} now={NOW} />;
}

function FailedAction() {
  const store = useHaStore();
  const status = useHaStatus();
  const attempted = useRef(false);
  useEffect(() => {
    if (status !== "connected" || attempted.current) return;
    attempted.current = true;
    void store.callService("light", "toggle", { entity_id: "light.living_room" }).catch(() => undefined);
  }, [status, store]);
  return <GlassDashboard title="Home" items={[{ entity: "light.living_room", kind: "light", area: "Living room" }, { entity: "switch.office", kind: "toggle", domain: "switch", area: "Office" }]} now={NOW} />;
}

function ActionFailureExample() {
  const transport = useMemo<HaTransport>(() => {
    const demo = createDemoHouseTransport();
    return { ...demo, callService: async () => { throw new Error("Demo action rejected"); } };
  }, []);
  return <House transport={transport}><FailedAction /></House>;
}

export const FromYaml: Story = { name: "From YAML", render: () => <House><Configured /></House> };
export const AutomaticLayout: Story = { name: "Automatic layout", render: () => <House><Automatic /></House> };
export const ActionFailure: Story = { name: "Action failure and retry", render: () => <ActionFailureExample /> };
