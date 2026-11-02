import { useHaStatus } from "@dashhaus/core";
import type { HaConnectionStatus } from "@dashhaus/core";

const WORDS: Record<Exclude<HaConnectionStatus, "connected">, string> = {
  idle: "Not connected yet.",
  connecting: "Connecting to Home Assistant…",
  disconnected: "Lost Home Assistant. Reconnecting…",
  error: "Can't reach Home Assistant. Reload to try again.",
};

/** While the connection is down the store clears its entities, so every card reads as unavailable; say why. */
export function ConnectionLine() {
  const status = useHaStatus();
  if (status === "connected") return null;
  return <p role="status">{WORDS[status]}</p>;
}
