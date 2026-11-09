import { asksFirst } from "../guard";
import type { GuestWifiEntity } from "./types";

const UNIT_MINUTES: Record<string, number> = { d: 1440, h: 60, min: 1, s: 1 / 60 };

/**
 * A duration as UniFi Hotspot Manager writes it ("1 d", "2 h, 30 min", "45 s"), in minutes; undefined for anything
 * else, never a guess.
 */
export function durationMinutes(text: unknown): number | undefined {
  if (typeof text !== "string" || !text.trim()) return undefined;
  let minutes = 0;
  for (const part of text.split(",")) {
    const match = part.trim().match(/^(\d+)\s*(d|h|min|s)$/);
    if (!match) return undefined;
    minutes += Number(match[1]) * UNIT_MINUTES[match[2]];
  }
  return Math.round(minutes);
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "1 day", "2 days 4 h", "8 h", "1 h 30 min", "45 min": the largest two units, whole. */
export function durationWords(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return hours ? `${plural(days, "day")} ${hours} h` : plural(days, "day");
  if (hours) return mins ? `${hours} h ${mins} min` : `${hours} h`;
  return `${Math.max(mins, 1)} min`;
}

/** How many uses it has: "Single use", "3 of 5 uses left", "Unlimited uses". Undefined while there is no code. */
export function usesWords(e: Pick<GuestWifiEntity, "allowed" | "used">): string | undefined {
  if (e.allowed == null) return undefined;
  if (e.allowed === "unlimited") return "Unlimited uses";
  const left = Math.max(0, e.allowed - (e.used ?? 0));
  if (e.allowed === 1) return left ? "Single use" : "Used";
  return left === e.allowed ? plural(e.allowed, "use") : `${left} of ${e.allowed} uses left`;
}

/** How long it lasts: "18 h left" once used, else "Lasts 1 day". Undefined when Home Assistant says neither. */
export function lastsWords(e: Pick<GuestWifiEntity, "lastsMinutes" | "leftMinutes">): string | undefined {
  if (e.leftMinutes != null) return `${durationWords(e.leftMinutes)} left`;
  if (e.lastsMinutes != null) return `Lasts ${durationWords(e.lastsMinutes)}`;
  return undefined;
}

/** The largest unit alone, for a screen's short line: "1 day", "363 days", "18 h", "45 min". */
export function durationShort(minutes: number): string {
  if (minutes >= 1440) return plural(Math.floor(minutes / 1440), "day");
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h`;
  return `${Math.max(minutes, 1)} min`;
}

/** Uses and length in a segment screen's room: ["Single use", "Lasts 1 day"], ["3 of 5 left", "18 h left"]. */
export function shortTerms(e: Pick<GuestWifiEntity, "allowed" | "used" | "lastsMinutes" | "leftMinutes">): string[] {
  const uses = e.allowed == null ? undefined
    : e.allowed === "unlimited" ? "Unlimited"
    : (e.used ?? 0) > 0 && e.allowed > 1 ? `${Math.max(0, e.allowed - (e.used ?? 0))} of ${e.allowed} left`
    : usesWords(e);
  const lasts = e.leftMinutes != null ? `${durationShort(e.leftMinutes)} left` : e.lastsMinutes != null ? `Lasts ${durationShort(e.lastsMinutes)}` : undefined;
  return [uses, lasts].filter((word): word is string => word != null);
}

/** Whether someone has joined with it. */
export const inUse = (e: Pick<GuestWifiEntity, "used" | "leftMinutes">) => (e.used ?? 0) > 0 || e.leftMinutes != null;

/** A code of digit groups, as a voucher's ("98668-49366"): drawn in its groups, not as free text. */
export const isGroupedCode = (code: string) => /^\d+(?:[\s-]\d+)*$/.test(code.trim());

const CHARACTER_NAMES: Record<string, string> = { "-": "dash", "_": "underscore", " ": "space", ".": "dot", "@": "at", "#": "hash", "!": "exclamation mark", "?": "question mark", "&": "ampersand", "*": "star", "/": "slash" };

/**
 * What a guest types, read a character at a time: a code of digit groups with its groups apart ("9 8 6 6 8, 4 9 3 6
 * 6"); anything else every character, capitals and symbols named ("capital R i p e dash 4 2").
 */
export function spokenCode(code: string): string {
  if (isGroupedCode(code)) return codeGroups(code).map((group) => group.split("").join(" ")).join(", ");
  return [...code].map((c) => CHARACTER_NAMES[c] ?? (c !== c.toLowerCase() ? `capital ${c}` : c)).join(" ");
}

/** The code's groups, for a screen that stacks them: ["98668", "49366"]. */
export const codeGroups = (code: string) => code.split(/[\s-]+/).filter(Boolean);

/** What a guest types, in words: "code" or "password". */
export const secretWord = (e: Pick<GuestWifiEntity, "access">) => (e.access === "password" ? "password" : "code");

/** Its state while there is nothing to give, the same on every card and in every skin: "No code", "No password". */
export const noneWord = (e: Pick<GuestWifiEntity, "access">) => (e.access === "password" ? "No password" : "No code");

/** Why there is nothing to give, and what to do, in a sentence: every code used, or no password set. */
export const noneSentence = (e: Pick<GuestWifiEntity, "access">) =>
  (e.access === "password" ? "No password is set. Make one to give." : "Every code has been used. Make a new one to give.");

/**
 * What to do, where the card has no room for `noneSentence` and no New code of its own: Orb's card outside its
 * sheet, Field's meta line. New code is in the details.
 */
export const NONE_HINT = "Make one in details";

/** When the code it shows was made, in small print after when it last reported: "Made 08:00", or "". */
export const madeFact = (created?: string) => (created ? `Made ${created}` : "");

/**
 * How to join, in a sentence: "Join Maple Guests, then enter the code on the page that opens." for a code; for a
 * password, "Scan to join Maple Guests, or choose it in Wi-Fi settings and type the password." (without its QR code,
 * the second half alone).
 */
export function joinWords(e: Pick<GuestWifiEntity, "network" | "access" | "qr">): string {
  const network = e.network ?? "the network";
  if (e.access !== "password") return `Join ${network}, then enter the code on the page that opens.`;
  return e.qr ? `Scan to join ${network}, or choose it in Wi-Fi settings and type the password.` : `Choose ${network} in Wi-Fi settings and type the password.`;
}

/**
 * A join QR code that failed to load (a network error, a token that expired before the attribute rotated): the skin
 * draws its frame empty, and its line says so before how to join without it, as a still that fails says `No picture`.
 * "No QR code. Choose Maple Guests 5G in Wi-Fi settings and type the password."
 */
export const NO_QR = "No QR code";
export const qrFailedWords = (e: Pick<GuestWifiEntity, "network" | "access">) => `${NO_QR}. ${joinWords({ ...e, qr: undefined })}`;

/** What making a new one does to the guests already in: a code leaves theirs working; a new password needs typing again. */
export const newSecretWords = (e: Pick<GuestWifiEntity, "access">) => (e.access === "password" ? "Devices already joined will need the new password." : "The codes already given keep working.");

/**
 * A new password ends the old one for every device already in, so it asks first (a code doesn't: the codes given keep
 * working). The yes said in full, its question, its yes's word, what the details say while it is on its way (a skin adds its end punctuation) and
 * the details' line while no question stands.
 */
export const newPasswordLabel = (e: Pick<GuestWifiEntity, "network" | "name">) => `Change the password for ${e.network ?? e.name}`;
export const newPasswordQuestion = (e: Pick<GuestWifiEntity, "network" | "name">) => `${newPasswordLabel(e)}?`;
export const NEW_PASSWORD_ACTION = "Change";
export const NEW_PASSWORD_WAITING = "Changing the password";
export const NEW_PASSWORD_HINT = asksFirst(["Changing the password"])!;
