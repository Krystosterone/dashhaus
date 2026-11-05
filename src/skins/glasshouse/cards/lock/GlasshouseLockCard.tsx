import type { LockEntity } from "@dashhaus/core/entities/lock/types";
import type { GuardedResult } from "@dashhaus/core/primitives";
import { GlasshouseCardFrame, GlasshouseChip, GlasshouseFacts, glasshouseWords } from "../../shared/ui";
import type { GlasshouseGuardedAction, GlasshouseFootprint } from "../../shared/ui";
import { IconLock, IconShield } from "./icons";
import "./GlasshouseLockCard.css";

export interface GlasshouseLockCardProps {
  entity: LockEntity;
  footprint?: GlasshouseFootprint;
  defaultOpen?: boolean;
  /** Runs at once, and asks for the code where the entity wants one. */
  onLock?: (code?: string) => GuardedResult;
  /** Asks first: the question, or the keypad where the entity wants a code; never one tap. */
  onUnlock?: (code?: string) => GuardedResult;
  /** Asks first: the question, or the keypad where the entity wants a code; never one tap. */
  onOpen?: (code?: string) => GuardedResult;
}

const SECURE = new Set(["locked", "locking"]);
const OPEN = new Set(["unlocked", "unlocking", "open", "opening"]);

/**
 * A door lock, drawn as the reference's security panel: a shield that glows cyan while locked, its state in words,
 * and the one action that changes it. Unlocking always asks first; a jammed lock is marked, not just coloured.
 */
export function GlasshouseLockCard({ entity: e, footprint = "standard", defaultOpen = false, onLock, onUnlock, onOpen }: GlasshouseLockCardProps) {
  const secure = SECURE.has(e.state);
  const open = OPEN.has(e.state);
  const jammed = e.state === "jammed";
  const code = { code: !!e.codeFormat, text: e.codeFormat === "text" };
  const guarded: GlasshouseGuardedAction[] = [
    ...(onLock && !secure ? [{ key: "lock", label: "Lock", ...code, run: onLock }] : []),
    ...(onUnlock && !open ? [{ key: "unlock", label: "Unlock", asks: true, ...code, run: onUnlock }] : []),
    ...(onOpen && e.supportsOpen && e.state !== "open" ? [{ key: "open", label: "Open", asks: true, ...code, run: onOpen }] : []),
  ];
  const said = glasshouseWords(e.state);
  const face = (
    <div className="glasshouse-lock-face">
      <span className="glasshouse-lock-shield" data-secure={secure ? "" : undefined}><IconShield open={!secure} /></span>
      <div className="glasshouse-lock-copy">
        <p className="glasshouse-lock-state">{said}</p>
        <p className="glasshouse-caption">{jammed ? "Check the door" : secure ? "Door secured" : "Door not secured"}{e.lastChanged ? ` · ${e.lastChanged}` : ""}</p>
      </div>
    </div>
  );
  const battery = e.battery == null ? undefined : <GlasshouseChip tone={e.battery <= 15 ? "warn" : undefined}>{e.battery}%</GlasshouseChip>;
  return (
    <GlasshouseCardFrame card="lock" name={e.name} entityId={e.entityId} area={e.area} state={e.state} summary={said} icon={<IconLock open={!secure} />} footprint={footprint} lit={secure} alert={jammed} control={battery} face={face} guarded={guarded} defaultOpen={defaultOpen}>
      <GlasshouseFacts facts={[
        ["State", e.state === "unavailable" ? "Unavailable" : said],
        e.changedBy && ["Changed by", e.changedBy],
        e.lastChanged && ["Last changed", e.lastChanged],
        e.battery != null && ["Battery", `${e.battery}%`],
        e.codeFormat && ["Code", e.codeFormat === "text" ? "Letters and digits" : "Digits"],
        e.state === "unavailable" && e.lastSeen && ["Last seen", e.lastSeen],
      ]} />
    </GlasshouseCardFrame>
  );
}
