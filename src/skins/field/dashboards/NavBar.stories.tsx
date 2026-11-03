import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { NavBar } from "./NavBar";
import type { NavBarItem } from "./NavBar";

interface Destination { key: string; label: string; kind: NavBarItem["kind"]; leaves?: boolean }

/** The bar at a phone's width, framed as the page's dock frames it (a centred column), the current key following the
    taps; a key that leaves only says where it would go. */
function Bar({ destinations, start = 0, width = 390 }: { destinations: Destination[]; start?: number; width?: number }) {
  const [current, setCurrent] = useState(destinations[start]?.key);
  const [left, setLeft] = useState<string | null>(null);
  return (
    <div style={{ width, maxWidth: "100%", margin: "32px auto", padding: "0 16px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <NavBar
        items={destinations.map((d) => ({
          ...d,
          current: d.key === current,
          onSelect: () => {
            if (d.leaves) return setLeft(d.label);
            setCurrent(d.key);
            setLeft(null);
          },
        }))}
      />
      <p style={{ margin: 0, minHeight: "1.4em", font: "500 11px var(--fd-sans)", fontStretch: "var(--fd-wide)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fd-ink-2)" }}>{left ? `Would leave for ${left}` : ""}</p>
    </div>
  );
}

const meta = {
  title: "Field/Dashboards/Nav bar",
  component: Bar,
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "The page's bottom nav: a plate of keys, one per destination, its word printed on it; where you are is the key that stays down, as a group's chosen key does, and a key that leaves the dashboard carries an arrow. The Lovelace card fills it from its titled rows, pages and `nav:` and docks it at the bottom (Field → Dashboards → Lovelace card → Rows and nav, Nav and pages)." } },
  },
} satisfies Meta<typeof Bar>;
export default meta;

type Story = StoryObj<typeof meta>;

/** A page's areas: a tap jumps there, and the area being read is the key that stays down. */
export const Sections: Story = {
  args: {
    destinations: [
      { key: "quick", label: "Quick", kind: "section" },
      { key: "living", label: "Living room", kind: "section" },
      { key: "nursery", label: "Nursery", kind: "section" },
    ],
  },
};

/** The card's own pages, and another dashboard, whose key carries the arrow (and says so to a screen reader). */
export const PagesAndAnotherDashboard: Story = {
  name: "Pages and another dashboard",
  args: {
    destinations: [
      { key: "home", label: "Home", kind: "page" },
      { key: "living", label: "Living room", kind: "page" },
      { key: "nursery", label: "Nursery", kind: "page" },
      { key: "baby", label: "Baby view", kind: "navigate", leaves: true },
    ],
  },
};

/** More keys than fit: the row scrolls sideways under the plate's edge, and the current key is scrolled into view. */
export const MoreThanFit: Story = {
  name: "More than fit",
  args: {
    start: 7,
    destinations: ["Comfort", "Modes", "Bedroom", "Kitchen", "Living room", "Office", "Other", "Security", "Nursery", "Outside", "Rooms"]
      .map((label) => ({ key: label, label, kind: "section" as const })),
  },
};

/** Long, non-Latin and one-letter words, a leaving key at the end, at the narrowest phone width: a long word is cut. */
export const WorstCase: Story = {
  name: "Worst case",
  args: {
    width: 320,
    destinations: [
      { key: "a", label: "A", kind: "page" },
      { key: "long", label: "Chambre principale et salle de bain attenante", kind: "page" },
      { key: "jp", label: "リビングルーム", kind: "page" },
      { key: "out", label: "Tableau de bord du bébé", kind: "navigate", leaves: true },
    ],
  },
};
