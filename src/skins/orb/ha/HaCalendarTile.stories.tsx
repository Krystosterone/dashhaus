import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaCalendarTile } from "./HaCalendarTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoCalendarHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/Calendar",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store, mapper and events read (`calendar.get_events`) over an injected demo transport, the school's calendar read beside the family's. */
function DemoConnectedCalendar() {
  const store = useMemo(() => createHaStore(createDemoCalendarHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaCalendarTile entityId="calendar.family" calendarEntityIds={["calendar.school"]} footprint="featured" />
        <HaCalendarTile entityId="calendar.family" footprint="compact" />
        <HaCalendarTile entityId="calendar.school" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedCalendar /> };
