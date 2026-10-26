import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { NavBar } from "./NavBar";
import type { NavBarItem } from "./NavBar";

interface Destination { key: string; label: string; kind: NavBarItem["kind"]; leaves?: boolean }

/** The bar at a phone's width, framed as the page's dock frames it (a centred column), with the current pill
    following the taps; a leaving pill only marks the tap. */
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
      <p style={{ margin: 0, minHeight: "1.4em", font: "500 13px var(--font)", color: "var(--ink-2)" }}>{left ? `Would leave for ${left}` : ""}</p>
    </div>
  );
}

const meta = {
  title: "Orb/Nav bar",
  component: Bar,
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "The page's bottom nav: one raised pill per destination, the current one in the solid accent, and an arrow on a pill that leaves the dashboard. On a page it docks at the bottom (Orb → Dashboards → Phone); the Lovelace card fills it from its sections, pages and `nav:` (Orb → Home Assistant → Config dashboard → Nav and pages)." } },
  },
} satisfies Meta<typeof Bar>;
export default meta;

type Story = StoryObj<typeof meta>;

/** A page's sections: a tap jumps there, and the section being read is the current pill. */
export const Sections: Story = {
  args: {
    destinations: [
      { key: "quick", label: "Quick actions", kind: "section" },
      { key: "status", label: "Home status", kind: "section" },
      { key: "nursery", label: "Nursery", kind: "section" },
    ],
  },
};

/** The card's own pages, and another dashboard, which carries the arrow (and says so to a screen reader). */
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

/** More pills than fit: the bar scrolls sideways, its ends fade, and the current pill is scrolled into view. */
export const MoreThanFit: Story = {
  name: "More than fit",
  args: {
    start: 7,
    destinations: ["Comfort", "Modes", "Bedroom", "Kitchen", "Living room", "Office", "Other", "Security", "Nursery", "Outside", "Rooms"]
      .map((label) => ({ key: label, label, kind: "section" as const })),
  },
};

/** Long, non-Latin and one-letter labels, a leaving pill at the end, at the narrowest phone width. */
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
