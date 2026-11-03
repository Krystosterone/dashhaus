import { useState } from "react";
import type { LockEntity, LockOutcome } from "../entities/lock/types";
import { codeFits } from "../entities/lock/code";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const stamp = "11:54";

/** The demo code for every seed that asks for one. */
export const DEMO_CODE = "1234";

export interface LockSeed {
  entity: LockEntity;
}

const base = { supportsOpen: false, codeFormat: null } as const;

export const LOCK_SEEDS = {
  /** Can unlatch the door too: Open door in its sheet. */
  locked: {
    entity: { ...base, supportsOpen: true, entityId: "lock.front_door", name: "Front door", area: "Hall", state: "locked", lastChanged: "10:58", changedBy: "Keypad", battery: 64 },
  },
  unlocked: {
    entity: { ...base, entityId: "lock.back_door", name: "Back door", area: "Kitchen", state: "unlocked", lastChanged: "07:15", changedBy: "Alex" },
  },
  locking: {
    entity: { ...base, entityId: "lock.side_gate", name: "Side gate", area: "Garden", state: "locking", lastChanged: "11:54" },
  },
  jammed: {
    entity: { ...base, entityId: "lock.garage_side", name: "Garage side door", area: "Garage", state: "jammed", lastChanged: "09:40", changedBy: "Auto-lock" },
  },
  /** Asks for a code to unlock, and unlatches the door too: the keypad and Open door. */
  code: {
    entity: { entityId: "lock.porch", name: "Porch", area: "Entrance", state: "locked", supportsOpen: true, codeFormat: "number", codePattern: "^\\d{4}$", lastChanged: "08:02", changedBy: "Manual", battery: 12 },
  },
  /** Asks for a text code (`code_format: text`): letters work too, so the keypad draws a field a touch screen can type into. */
  textCode: {
    entity: { ...base, entityId: "lock.studio", name: "Studio", area: "Garden", state: "locked", codeFormat: "text", codePattern: "^\\w{4,12}$", lastChanged: "07:40", changedBy: "Manual", battery: 64 },
  },
  /** Supports open, and is open: the door unlatched. */
  open: {
    entity: { entityId: "lock.apartment", name: "Apartment door", area: "Hall", state: "open", supportsOpen: true, codeFormat: null, lastChanged: "11:50", changedBy: "Nuki app", battery: 81 },
  },
  unavailable: {
    entity: { ...base, entityId: "lock.shed", name: "Shed", area: "Garden", state: "unavailable", lastSeen: "08:20" },
  },
  /** Worst case: names, areas and who changed it long enough to truncate at every width, and a battery near empty (break-ui skill). */
  long: {
    entity: {
      entityId: "lock.basement_bulkhead", name: "Basement bulkhead door to the garden stairs", area: "Utility room behind the laundry and boiler",
      state: "jammed", supportsOpen: true, codeFormat: "text", codePattern: "^\\w{4,12}$", lastChanged: "Fri 18:30", changedBy: "Front door keypad (user 12, Grandparents)", battery: 3,
    },
  },
} satisfies Record<string, LockSeed>;

export type LockSeedName = keyof typeof LOCK_SEEDS;

/** Worst-case data: every skin's Worst case story draws these. */
export const LOCK_WORST_CASE: LockSeed[] = [
  LOCK_SEEDS.long,
  { entity: { ...LOCK_SEEDS.long.entity, state: "unlocking", battery: 0 } },
  { entity: { ...LOCK_SEEDS.long.entity, state: "locked", changedBy: undefined, battery: undefined, lastChanged: undefined } },
];

/**
 * Local state that behaves like a `lock` entity, for stories and prototypes: a lock or unlock lands at once, a seed
 * with a code takes DEMO_CODE and answers `wrong_code` for any other.
 */
export function useDemoLock(seed: LockSeed) {
  const [entity, setEntity] = useState<LockEntity>(seed.entity);
  const act = (state: LockEntity["state"]) => async (code?: string): Promise<LockOutcome> => {
    if (entity.state === "unavailable") return "failed";
    if (entity.codeFormat && state !== "locked" && (!code || code !== DEMO_CODE || !codeFits(entity.codePattern, code))) return "wrong_code";
    setEntity((e) => ({ ...e, state, lastChanged: stamp, changedBy: "Dashboard" }));
    return "done";
  };
  return { entity, onLock: act("locked"), onUnlock: act("unlocked"), onOpenDoor: act("open") };
}
