import type { DurationOption } from "./types";

/** Default ways to turn a mode on: for a while, until morning, or until turned off. Every skin offers the same. */
export const DEFAULT_DURATIONS: DurationOption[] = [
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
  { value: "morning", label: "Morning", sub: "07:00" },
  { value: "manual", label: "Until off", sub: "No end" },
];
