/**
 * An action that asks first is never one press, in every skin (spec/skins.md → Rules every skin keeps): a press opens
 * the details on the skin's question or keypad, and its control says so in the skin's one idiom, Orb's `…` at the end
 * of the name or Field's `: asks first`, which no other control carries. While no question stands, the details say what
 * asks first, once, in core's words (spec/cards.md → What every card says).
 *
 * The domains held are the ones whose actions are declared guarded (`<NAME>_ACTIONS`, read through the scaffolder's
 * `domains.json`, with `when` applied), so a domain that comes to ask joins on its own. Each skin's card is drawn on every
 * seed of its domain, the demo seeds and the worst case, on the dashboard in each footprint and in its bare details,
 * with a spy for every handler; every button there is pressed on a fresh drawing (where nothing may be one press for
 * the seed, only those that carry the mark):
 *
 * - a press never calls an action that asks for this entity, nor sends a code the entity wants (no press carries one);
 * - a press that opens the question, or a keypad whose code ends in an action that asks, is a control whose name ends
 *   in the skin's mark; a marked control that does nothing at all is an in-progress word (Orb's `Locking…`), not a
 *   control's name, and any other marked control fails;
 * - a seed whose drawing has a control that asks says, in its bare details, a sentence ending `asks first.` (or `ask
 *   first.`): the hint, which verify/card-words.test.ts keeps in core.
 *
 * And every state the guard draws has a seed every skin shares (spec/cards.md → a seed for every state): each value an
 * action's `when` names has a seed, some seed is one it doesn't ask for, and a domain that can stop has a seed that
 * asks and is on its way without being able to.
 *
 * Studies keep their own design (spec/skins.md → Studies), so only the two skins are drawn here; the generated skin's
 * baseline is held by the scaffold's own checks.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComponentType, ReactNode } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { skinTemplates } from "../scripts/packages.js";
import { ALARM_SEEDS, ALARM_WORST_CASE } from "@dashhaus/core/seeds/alarm";
import { COVER_SEEDS, COVER_WORST_CASE } from "@dashhaus/core/seeds/cover";
import { GUEST_WIFI_SEEDS, GUEST_WIFI_WORST_CASE } from "@dashhaus/core/seeds/guestWifi";
import { DEMO_CODE, LOCK_SEEDS, LOCK_WORST_CASE } from "@dashhaus/core/seeds/lock";
import * as orbSkin from "@dashhaus/orb";
import * as fieldSkin from "@dashhaus/field";

interface Guarded { action: string; asks: boolean; code?: boolean; when?: Record<string, string[]> }
type Entity = Record<string, unknown> & { name: string; state: string };
const domains = JSON.parse(readFileSync(join(process.cwd(), skinTemplates.package, "src/domains.json"), "utf8")) as Record<string, { guarded: Guarded[] }>;

/**
 * Guest Wi-Fi's New password asks first in both skins (a new password ends the old one for every device already in),
 * but `GUEST_WIFI_ACTIONS` doesn't declare it yet, so it is held here as if it did.
 */
const UNDECLARED: Record<string, Guarded[]> = { guestWifi: [{ action: "onNewCode", asks: true, when: { access: ["password"] } }] };

/** Each domain's seeds, every handler its cards take (the card's prop name for the domain's handler), and its seeds' read-only flag. */
const DOMAINS: Record<string, { seeds: { entity: Entity; readOnly?: boolean }[]; handlers: Record<string, string> }> = {
  alarm: { seeds: [...Object.values(ALARM_SEEDS), ...ALARM_WORST_CASE], handlers: { onArm: "onArm", onDisarm: "onDisarm" } },
  cover: { seeds: [...Object.values(COVER_SEEDS), ...COVER_WORST_CASE], handlers: { onOpenCover: "onOpenCover", onCloseCover: "onCloseCover", onStopCover: "onStopCover", onSetPosition: "onSetPosition", onSetTilt: "onSetTilt" } },
  guestWifi: { seeds: [...Object.values(GUEST_WIFI_SEEDS), ...GUEST_WIFI_WORST_CASE], handlers: { onRefresh: "onRefresh", onNewCode: "onNewCode" } },
  lock: { seeds: [...Object.values(LOCK_SEEDS), ...LOCK_WORST_CASE], handlers: { onLock: "onLock", onUnlock: "onUnlock", onOpen: "onOpenDoor" } },
} as never;

type Draw = (entity: Entity, handlers: Record<string, unknown>, surface: string, readOnly?: boolean) => ReactNode;
interface Skin { mark: RegExp; question: string; keypad: string; footprints: string[]; cards: Record<string, Draw> }
/** A skin's card for a domain, from its entry, by the name its noun gives it (Orb's `LockTile`, Field's `LockModule`). */
const card = (skin: object, name: string): Draw => (e, handlers, surface, readOnly) => {
  const Card = (skin as Record<string, ComponentType<Record<string, unknown>> | undefined>)[name];
  if (!Card) throw new Error(`the skin's entry exports no ${name}`);
  const details = surface === "details";
  return <Card {...(readOnly ? {} : handlers)} entity={e} readOnly={readOnly} footprint={details ? "standard" : surface} defaultOpen={details} />;
};
const drawn = (skin: object, noun: string) => Object.fromEntries(Object.keys(DOMAINS).map((domain) => [domain, card(skin, `${domain[0].toUpperCase()}${domain.slice(1)}${noun}`)]));
const SKINS: Record<string, Skin> = {
  orb: { mark: /…$/, question: ".hd-cf", keypad: ".hd-kp", footprints: ["compact", "standard", "featured"], cards: drawn(orbSkin, "Tile") },
  field: { mark: /: asks first$/, question: ".fd-cf", keypad: ".fd-pad", footprints: ["compact", "standard"], cards: drawn(fieldSkin, "Module") },
};

const guardedOf = (domain: string) => [...(domains[domain]?.guarded ?? []), ...(UNDECLARED[domain] ?? [])];
const asksFor = (g: Guarded, e: Entity) => g.asks && Object.entries(g.when ?? {}).every(([field, values]) => values.includes(String(e[field])));
/** What a press may never do for this entity: an action that asks for it, or one that takes a code it wants. */
const neverOnePress = (domain: string, e: Entity) => guardedOf(domain).filter((g) => asksFor(g, e) || (g.code && !!e.codeFormat));
const asking = (domain: string, e: Entity) => guardedOf(domain).filter((g) => asksFor(g, e)).map((g) => g.action);

const nameOf = (b: Element) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim();
const enabled = (b: HTMLButtonElement) => !b.disabled && b.getAttribute("aria-disabled") !== "true";
/**
 * The buttons of one surface that could ask: the card's on the dashboard, or those of the open details, leaving out a
 * question's or a keypad's own (they answer; they don't ask).
 */
const buttons = (surface: string, skin: Skin) => [...document.querySelectorAll<HTMLButtonElement>("button")]
  .filter((b) => enabled(b) && (surface === "details" ? !!b.closest("dialog[open]") : !b.closest("dialog")) && !b.closest(`${skin.question}, ${skin.keypad}`));

const press = async (button: HTMLButtonElement) => { await act(async () => { fireEvent.click(button); }); };
const byName = (name: string) => [...document.querySelectorAll<HTMLButtonElement>("dialog[open] button, button")].find((b) => nameOf(b) === name && enabled(b));

beforeAll(() => {
  // jsdom has no modal dialog; these do what a browser's do to the `open` attribute.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
});
afterEach(cleanup);

describe("an action that asks first", () => {
  it("is held for every domain that declares one, and those are drawn in both skins", () => {
    const declared = Object.entries(domains).filter(([, d]) => d.guarded.length).map(([name]) => name);
    expect(declared.filter((name) => !(name in DOMAINS)), "add the domain's seeds and handlers here").toEqual([]);
    for (const [name, skin] of Object.entries(SKINS)) for (const [domain, draw] of Object.entries(skin.cards)) {
      expect(() => render(<>{draw(DOMAINS[domain].seeds[0].entity, {}, "standard")}</>), `${name} ${domain}`).not.toThrow();
      cleanup();
    }
  });

  it("has a seed for every state the guard draws, the same in every skin", () => {
    const missing: string[] = [];
    for (const [domain, { seeds }] of Object.entries(DOMAINS)) {
      for (const g of guardedOf(domain).filter((x) => x.asks)) {
        const asked = seeds.filter((s) => asksFor(g, s.entity));
        if (!asked.length) missing.push(`${domain}.${g.action}: no seed it asks for`);
        for (const [field, values] of Object.entries(g.when ?? {})) {
          for (const value of values) if (!seeds.some((s) => s.entity[field] === value)) missing.push(`${domain}.${g.action}: no seed with ${field} ${value}`);
          if (seeds.every((s) => asksFor(g, s.entity))) missing.push(`${domain}.${g.action}: no seed it doesn't ask for`);
        }
        const stops = seeds.some((s) => "supportsStop" in s.entity);
        if (stops && !asked.some((s) => /ing$/.test(s.entity.state) && s.entity.supportsStop === false)) missing.push(`${domain}.${g.action}: no seed that asks and is on its way without a stop`);
      }
    }
    expect(missing).toEqual([]);
  });

  for (const [skinName, skin] of Object.entries(SKINS)) {
    for (const [domain, { seeds, handlers }] of Object.entries(DOMAINS)) {
      it(`${skinName} ${domain}: never one press, marked ${skin.mark.source}, and the details say what asks first`, async () => {
        const wrong: string[] = [];
        let asksSeen = 0;
        for (const seed of seeds) {
          const e = seed.entity;
          const forbidden = neverOnePress(domain, e).map((g) => handlers[g.action] ?? g.action);
          const asks = asking(domain, e).map((action) => handlers[action] ?? action);
          let asked = false;
          // A control drawn alike in several footprints is pressed in the first: a footprint changes its place, not what it does.
          const pressed = new Set<string>();
          for (const surface of [...skin.footprints, "details"]) {
            const draw = () => {
              const spies = Object.fromEntries(Object.values(handlers).map((prop) => [prop, vi.fn(async () => true)]));
              render(<>{skin.cards[domain](e, spies, surface, seed.readOnly)}</>);
              return spies;
            };
            draw();
            const names = buttons(surface, skin).map(nameOf);
            cleanup();
            for (const [i, name] of names.entries()) {
              if (surface !== "details" && pressed.has(name)) continue;
              // Where nothing may be one press here, only a control that says it asks has anything to prove.
              if (!forbidden.length && !skin.mark.test(name)) continue;
              pressed.add(name);
              const spies = draw();
              const button = buttons(surface, skin)[i];
              const where = `${e.name} (${e.state}, ${surface}) "${name}"`;
              if (!button || nameOf(button) !== name) { wrong.push(`${where}: drawn differently the second time`); cleanup(); continue; }
              await press(button);
              const called = Object.entries(spies).filter(([, spy]) => spy.mock.calls.length).map(([prop]) => prop);
              for (const prop of called.filter((p) => forbidden.includes(p))) wrong.push(`${where}: one press called ${prop}`);
              const question = !!document.querySelector(skin.question);
              let keypadAsks = false;
              const keypad = !!document.querySelector(skin.keypad);
              if (keypad && !question) {
                for (const digit of DEMO_CODE) { const key = byName(digit); if (key) await press(key); }
                const enter = byName("Enter code");
                if (enter) await press(enter);
                keypadAsks = Object.entries(spies).some(([prop, spy]) => asks.includes(prop) && spy.mock.calls.length);
              }
              const hasMark = skin.mark.test(name);
              if (question || keypadAsks) { asked = true; asksSeen += 1; }
              if ((question || keypadAsks) && !hasMark) wrong.push(`${where}: asks first, but its name doesn't end in the mark`);
              if (hasMark && !question && !keypad && called.length) wrong.push(`${where}: carries the mark, but asks nothing`);
              cleanup();
            }
          }
          if (asked) {
            draw0(skin, domain, e, handlers, seed.readOnly);
            const said = [...document.querySelectorAll("dialog[open] p")].some((p) => /\basks? first\.$/.test(p.textContent?.trim() ?? ""));
            if (!said) wrong.push(`${e.name} (${e.state}): something asks first, but its details don't say so`);
            cleanup();
          }
        }
        expect(wrong).toEqual([]);
        if (seeds.some((seed) => asking(domain, seed.entity).length)) expect(asksSeen, "no press asked first: the drawing changed").toBeGreaterThan(0);
      });
    }
  }
});

/** The bare details, for the hint. */
function draw0(skin: Skin, domain: string, e: Entity, handlers: Record<string, string>, readOnly?: boolean) {
  const spies = Object.fromEntries(Object.values(handlers).map((prop) => [prop, vi.fn(async () => true)]));
  render(<>{skin.cards[domain](e, spies, "details", readOnly)}</>);
}
