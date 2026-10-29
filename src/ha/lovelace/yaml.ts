import { MAIN_PAGE } from "./nav";
import type { NavEntry } from "./nav";

/*
 * Reading a Lovelace card's YAML, for every skin's Lovelace card: each check records its problem with the path to it, so
 * every mistake shows at once in the card editor, and a near-miss key or word gets a "did you mean".
 */

export class DashboardConfigError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Home Dashboard config has ${problems.length === 1 ? "a problem" : `${problems.length} problems`}:\n${problems.map((p) => `• ${p}`).join("\n")}`);
    this.name = "DashboardConfigError";
    this.problems = problems;
  }
}

export type Raw = Record<string, unknown>;
export const isRaw = (value: unknown): value is Raw => typeof value === "object" && value !== null && !Array.isArray(value);
const ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const NAV_KINDS = ["section", "page", "navigate"] as const;
const PAGE_ID = /^[a-z0-9][a-z0-9_-]*$/;

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row[j];
      row[j] = next;
    }
  }
  return row[b.length];
}

/** The closest allowed word, if the typo is small enough to be one. */
export function suggest(word: string, allowed: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of allowed) {
    const d = distance(word.toLowerCase(), candidate);
    if (d < bestDistance) { best = candidate; bestDistance = d; }
  }
  return bestDistance <= Math.max(2, Math.floor(word.length / 3)) ? best : undefined;
}

export const oneOf = (allowed: readonly string[]) => allowed.map((a) => `"${a}"`).join(", ");

/** Checks values, collecting every problem. A skin's Lovelace card extends it with its own sections and cards. */
export class Reader {
  readonly problems: string[] = [];

  problem(path: string, message: string) { this.problems.push(path ? `${path}: ${message}` : message); }

  keys(raw: Raw, path: string, allowed: readonly string[]) {
    for (const key of Object.keys(raw)) {
      if (allowed.includes(key)) continue;
      const near = suggest(key, allowed);
      this.problem(path, `unknown key "${key}"${near ? ` — did you mean "${near}"?` : ""}`);
    }
  }

  string(raw: Raw, key: string, path: string): string | undefined {
    const value = raw[key];
    if (value == null) return undefined;
    if (typeof value === "string" || typeof value === "number") return String(value);
    this.problem(path, `"${key}" must be text`);
  }

  boolean(raw: Raw, key: string, path: string): boolean | undefined {
    const value = raw[key];
    if (value == null) return undefined;
    if (typeof value === "boolean") return value;
    this.problem(path, `"${key}" must be true or false`);
  }

  number(raw: Raw, key: string, path: string, min: number, max: number, integer = true): number | undefined {
    const value = raw[key];
    if (value == null) return undefined;
    if (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value))) return value;
    this.problem(path, `"${key}" must be ${integer ? "a whole number" : "a number"} from ${min} to ${max}`);
  }

  choice<T extends string>(raw: Raw, key: string, path: string, allowed: readonly T[]): T | undefined {
    const value = raw[key];
    if (value == null) return undefined;
    if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
    const near = typeof value === "string" ? suggest(value, allowed) : undefined;
    this.problem(path, `"${key}" must be one of ${oneOf(allowed)}${near ? ` — did you mean "${near}"?` : ""}`);
  }

  entityId(value: unknown, path: string, domains?: readonly string[]): string | undefined {
    if (typeof value !== "string" || !ENTITY_ID.test(value)) {
      this.problem(path, `"${String(value)}" is not an entity id like light.kitchen`);
      return undefined;
    }
    const domain = value.slice(0, value.indexOf("."));
    if (domains && !domains.includes(domain)) {
      this.problem(path, `${value} must be a ${domains.map((d) => `${d}.*`).join(" or ")} entity`);
      return undefined;
    }
    return value;
  }

  optionalEntity(raw: Raw, key: string, path: string, domains: readonly string[]): string | undefined {
    if (raw[key] == null) return undefined;
    return this.entityId(raw[key], `${path}.${key}`, domains);
  }

  /** One nav destination: exactly one of `section`, `page` or `navigate`, and an optional `label`. */
  navEntry(value: unknown, path: string): NavEntry | undefined {
    if (!isRaw(value)) {
      this.problem(path, "a nav item is a map with one of \"section\", \"page\" or \"navigate\"");
      return undefined;
    }
    this.keys(value, path, [...NAV_KINDS, "label"]);
    const kinds = NAV_KINDS.filter((k) => value[k] != null);
    if (kinds.length !== 1) {
      this.problem(path, `needs exactly one of ${oneOf(NAV_KINDS)}`);
      return undefined;
    }
    const label = this.string(value, "label", path);
    const target = this.string(value, kinds[0], path);
    if (target == null) return undefined;
    if (kinds[0] === "section") return { kind: "section", title: target, label };
    if (kinds[0] === "page") return { kind: "page", id: target, label };
    if (!target.startsWith("/")) {
      this.problem(path, `"navigate" is a Home Assistant path like /baby-view/0`);
      return undefined;
    }
    return { kind: "navigate", path: target, label };
  }

  /**
   * The card's `nav` (docs/deploy.md → Navigation): a list of destinations, `false` for none, or left out. A page must
   * be one of `pages` or the main page; a section, one of `titles`, the main page's titled sections, when the YAML
   * lays them out (an automatic layout's can't be named ahead), and the only one of its title.
   */
  nav(raw: Raw, pages: readonly { id: string }[], titles?: readonly string[]): NavEntry[] | false | undefined {
    if (raw.nav === false) return false;
    if (raw.nav == null) return undefined;
    if (!Array.isArray(raw.nav)) {
      this.problem("nav", "must be a list of destinations, or false for no nav");
      return undefined;
    }
    const nav = raw.nav.map((n, i) => this.navEntry(n, `nav[${i}]`)).filter((n): n is NavEntry => !!n);
    const pageIds = [MAIN_PAGE, ...pages.map((p) => p.id)];
    nav.forEach((n, i) => {
      if (n.kind === "page" && !pageIds.includes(n.id)) {
        const near = suggest(n.id, pageIds);
        this.problem(`nav[${i}]`, `no page "${n.id}"${near ? ` — did you mean "${near}"?` : ` (pages: ${oneOf(pageIds)})`}`);
      }
      if (n.kind === "section" && titles && !titles.includes(n.title)) {
        const near = titles.find((t) => t.toLowerCase() === n.title.toLowerCase()) ?? suggest(n.title, titles);
        this.problem(`nav[${i}]`, `no section titled "${n.title}" in the top-level sections${near ? ` — did you mean "${near}"?` : ""}`);
      }
      if (n.kind === "section" && titles && titles.filter((t) => t === n.title).length > 1) {
        this.problem(`nav[${i}]`, `${titles.filter((t) => t === n.title).length} sections are titled "${n.title}"; give each its own title so the nav can tell them apart`);
      }
    });
    return nav;
  }

  /** One of the card's `pages`: its id, its title and its `sections`, each read by the skin's `block`. */
  page<B>(value: unknown, path: string, block: (value: unknown, path: string) => B | undefined): { id: string; title: string; blocks: B[] } | undefined {
    if (!isRaw(value)) {
      this.problem(path, "a page is a map with \"id\", \"title\" and \"sections\"");
      return undefined;
    }
    this.keys(value, path, ["id", "title", "sections"]);
    const id = this.string(value, "id", path);
    const title = this.string(value, "title", path);
    if (id == null || !PAGE_ID.test(id)) this.problem(path, "\"id\" is required: lower-case letters, digits, - and _, like living-room");
    else if (id === MAIN_PAGE) this.problem(path, `"id" can't be "${MAIN_PAGE}": that is the top-level sections`);
    if (title == null) this.problem(path, "\"title\" is required");
    if (!Array.isArray(value.sections) || value.sections.length === 0) {
      this.problem(path, "\"sections\" must be a list of at least one section");
      return undefined;
    }
    const blocks = value.sections.map((s, i) => block(s, `${path}.sections[${i}]`)).filter((b): b is B => !!b);
    return id && title && PAGE_ID.test(id) && id !== MAIN_PAGE ? { id, title, blocks } : undefined;
  }

  /** The card's `pages`, more pages opened from its nav, each id its own; left out, none. */
  pages<B>(raw: Raw, block: (value: unknown, path: string) => B | undefined): { id: string; title: string; blocks: B[] }[] | undefined {
    if (raw.pages == null) return undefined;
    if (!Array.isArray(raw.pages) || raw.pages.length === 0) {
      this.problem("pages", "must be a list of at least one page, or left out");
      return undefined;
    }
    const pages = raw.pages.map((p, i) => this.page(p, `pages[${i}]`, block)).filter((p): p is { id: string; title: string; blocks: B[] } => !!p);
    const ids = pages.map((p) => p.id);
    for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) this.problem("pages", `two pages have the id "${id}"`);
    return pages;
  }
}
