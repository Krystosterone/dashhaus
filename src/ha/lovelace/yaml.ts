/*
 * Reading a dashboard card's YAML, for every skin's card: each check records its problem with the path to it, so
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

/** Checks values, collecting every problem. A skin's card extends it with its own sections and widgets. */
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
}
