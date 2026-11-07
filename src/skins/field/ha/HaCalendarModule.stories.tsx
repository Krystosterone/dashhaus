import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaCalendarModule } from "./HaCalendarModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoCalendarHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/Calendar",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedCalendar() {
  const store = useMemo(() => createHaStore(createDemoCalendarHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaCalendarModule entityId="calendar.family" calendarEntityIds={["calendar.school"]} />
        <HaCalendarModule entityId="calendar.family" footprint="compact" />
        <HaCalendarModule entityId="calendar.school" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's calendar tile uses, over the demo transport: each module reads its events with calendar.get_events, the school's beside the family's on the first. */
export const InjectedTransport: Story = { render: () => <DemoConnectedCalendar /> };
