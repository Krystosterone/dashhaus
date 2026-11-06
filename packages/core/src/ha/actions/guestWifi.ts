import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";
import type { ActionKinds } from "./kinds";

export interface GuestWifiHandlers {
  /**
   * Fetch the code again now: presses its refresh action (UniFi Hotspot Manager's `button.*_update`; the integration
   * fetches every 5 minutes on its own). Answers once Home Assistant has. Only while that action is reachable.
   */
  onRefresh?: () => Promise<void>;
  /**
   * Make a new code or password: presses its new-code action (UniFi Hotspot Manager's `button.*_create`, which makes one
   * with the integration's own uses and length, the codes already given still working). Answers once Home Assistant
   * has. Only while that action is reachable.
   */
  onNewCode?: () => Promise<void>;
}

/** What each handler is, for a card drawing guest Wi-Fi without knowing it (`ActionKind`). */
export const GUEST_WIFI_ACTIONS = {
  onRefresh: { takes: "nothing" },
  onNewCode: { takes: "nothing" },
} as const satisfies ActionKinds<GuestWifiHandlers>;

/**
 * An action as the store has it: a `button.*`, `input_button.*` or `script.*` entity, its id and its state (a press's
 * time, `on` while a script runs, `unknown`, or `unavailable`).
 */
export interface GuestWifiButton { entityId: string; state: string }

/** How each kind of action entity is pressed. */
const PRESS: Record<string, string> = { button: "press", input_button: "press", script: "turn_on" };

/** The entity domains an action can be. */
export const GUEST_WIFI_ACTION_DOMAINS = Object.keys(PRESS);

export interface GuestWifiHandlerOptions {
  onError?: (error: HaActionError) => void;
  /** What fetches the code again; without it, or while it is unavailable, there is no refresh. */
  refresh?: GuestWifiButton;
  /** What makes a new one; without it, or while it is unavailable, no new code. */
  newCode?: GuestWifiButton;
}

/**
 * Create safe callback handlers for the guest Wi-Fi card: its two actions, pressed (`button.press`,
 * `input_button.press`, `script.turn_on`), and nothing else (the code itself is read-only). Each answers when Home
 * Assistant has, so a card can say it is waiting; a rejection is reported through `onError`, never thrown.
 */
export function createGuestWifiHandlers(caller: Pick<HaStore, "callService">, { onError, refresh, newCode }: GuestWifiHandlerOptions = {}): GuestWifiHandlers {
  const press = (button: GuestWifiButton | undefined) => {
    const domain = button?.entityId.slice(0, button.entityId.indexOf("."));
    if (!button || !domain || !PRESS[domain] || button.state === "unavailable") return undefined;
    const runner = serviceRunner(caller, domain, button, onError);
    return async () => {
      const error = await runner.attempt(PRESS[domain]);
      if (error) runner.report(error);
    };
  };
  return { onRefresh: press(refresh), onNewCode: press(newCode) };
}
