import { MySkinCoverCard } from "./MySkinCoverCard";

/** Card gallery metadata for the conformance check and for a plain Storybook-style viewer. */
export default {
  title: "My Skin/Cards/Cover",
  component: MySkinCoverCard,
  args: { name: "Living room blinds", area: "Living room", state: "closed", onOpenCover: () => undefined, onCloseCover: () => undefined },
};

export const Closed = {};
export const Open = { args: { state: "open", position: 100 } };
export const HalfOpen = { args: { state: "open", position: 50 } };
export const Unavailable = { args: { state: "unavailable" } };
