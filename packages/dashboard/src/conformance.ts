/**
 * The generic card checks for any skin that draws on `@dashhaus/dashboard/card`: each folder under a skin's `cards/`
 * is one card, with its component, its stories titled for the skin's Storybook section, its own class prefix and a
 * code no other card shares. A skin supplies only what it knows — where its cards are, what its files are called, how
 * a card's code is read and which classes it may use. The repo's own conformance tests call this preset and keep
 * their repo-wide assertions (exports, docs, Storybook order, Lovelace wiring, the Home Assistant slice) beside it.
 *
 * Node-only: this reads a skin's files from disk, so it lives on its own subpath and never reaches a browser bundle.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** The one place this preset reads from: the project root that holds the skin. */
export interface ConformanceOptions {
  /** Absolute path the declared files are resolved from. Default: `process.cwd()`. */
  root?: string;
}

/** A card folder, as the preset names it. */
export interface CardRef {
  /** The folder name, e.g. "light". */
  name: string;
  /** The folder name in PascalCase, e.g. "Light". */
  Name: string;
  /** The card's code, when the skin declares how to read one. */
  code?: string;
}

/** What a skin declares so the generic checks can read it. */
export interface CardCheck {
  /** The skin's folder, relative to `root`; its `cards/` holds one folder per card. */
  skin: string;
  /** The Storybook title prefix; each card's stories are titled `<storyPrefix>/<Name>`. */
  storyPrefix: string;
  /** The card component in a card folder, e.g. `(Name) => `${Name}Card.tsx``. */
  component: (Name: string) => string;
  /** The card's stories file in its folder, e.g. `(Name) => `${Name}.stories.tsx``. */
  stories: (Name: string) => string;
  /** The card's code, read from its component source, e.g. `useCard("lw"`. Omit when a skin has no codes. */
  code?: (source: string) => string | undefined;
  /** Whether a class may appear in a card folder: its own code's classes, or a shared system's. */
  allowedClass: (cls: string, card: CardRef) => boolean;
  /** A specifier the component may not import, e.g. the Home Assistant slice. */
  forbiddenImport?: (specifier: string) => boolean;
}

/** The rule a finding breaks. */
export type ConformanceRule = "component" | "stories" | "story-title" | "code" | "class-prefix" | "import" | "unique-code";

/** One failed check, named by its rule and the card it belongs to. */
export interface ConformanceFinding {
  /** The card folder's name. */
  card: string;
  rule: ConformanceRule;
  message: string;
}

/** The folders in a skin's `cards/`, one per card, in a stable order. */
export function cardFolders(skin: string, options: ConformanceOptions = {}): string[] {
  const root = options.root ?? process.cwd();
  const cards = join(root, skin, "cards");
  if (!existsSync(cards) || !statSync(cards).isDirectory()) throw new Error(`conformance: ${skin}/cards is not a directory`);
  return readdirSync(cards, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Every file in a folder, recursively, with `/` separators. */
function walk(dir: string, root: string, base = ""): string[] {
  return readdirSync(join(root, dir, base), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = base ? `${base}/${entry.name}` : entry.name;
      return entry.isDirectory() ? walk(dir, root, path) : [path];
    });
}

/**
 * Every class a card folder's CSS defines or its TSX sets that `allowed` refuses, as `<dir>/<file>: .<class>`.
 * A skin supplies the allowance; the scan itself is shared, so every skin reads classes the same way.
 */
export function strayClasses(dir: string, allowed: (cls: string) => boolean, options: ConformanceOptions = {}): string[] {
  const root = options.root ?? process.cwd();
  const bad: string[] = [];
  for (const file of walk(dir, root).filter((path) => /\.(css|tsx)$/.test(path))) {
    const body = readFileSync(join(root, dir, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const classes = file.endsWith(".css")
      ? [...body.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((match) => match[1])
      : [...body.matchAll(/className="([^"]*)"/g)].flatMap((match) => match[1].split(/\s+/)).filter(Boolean);
    for (const cls of classes) if (!allowed(cls)) bad.push(`${dir}/${file}: .${cls}`);
  }
  return bad;
}

const IMPORT_SPECS = [
  /\bfrom\s+["']([^"']+)["']/g,
  /^\s*import\s+["']([^"']+)["']/gm,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];

/**
 * The generic checks over every card in a skin. Returns every failure rather than throwing, so a test can assert
 * the exact rules that broke and a generator can report them. A missing `cards/` folder throws: the declaration,
 * not a card, is wrong.
 */
export function checkCards(check: CardCheck, options: ConformanceOptions = {}): ConformanceFinding[] {
  const root = options.root ?? process.cwd();
  const findings: ConformanceFinding[] = [];
  const cards: CardRef[] = [];
  const fail = (card: string, rule: ConformanceRule, message: string) => findings.push({ card, rule, message });

  for (const name of cardFolders(check.skin, options)) {
    const ref: CardRef = { name, Name: name.charAt(0).toUpperCase() + name.slice(1) };
    cards.push(ref);
    const dir = `${check.skin}/cards/${name}`;
    const component = check.component(ref.Name);
    if (!existsSync(join(root, dir, component))) {
      fail(name, "component", `missing ${dir}/${component}`);
      continue;
    }
    const source = readFileSync(join(root, dir, component), "utf8");

    const stories = check.stories(ref.Name);
    if (!existsSync(join(root, dir, stories))) {
      fail(name, "stories", `missing ${dir}/${stories}`);
    } else if (!readFileSync(join(root, dir, stories), "utf8").includes(`title: "${check.storyPrefix}/${ref.Name}"`)) {
      fail(name, "story-title", `${dir}/${stories} must title the stories "${check.storyPrefix}/${ref.Name}"`);
    }

    if (check.code) ref.code = check.code(source);
    if (check.code && !ref.code) fail(name, "code", `${dir}/${component} declares no card code`);

    if (check.forbiddenImport) {
      const specifiers = new Set(IMPORT_SPECS.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1])));
      for (const specifier of specifiers) {
        if (check.forbiddenImport(specifier)) fail(name, "import", `${dir}/${component} imports "${specifier}", which a card may not reach`);
      }
    }

    // Without a code there is no prefix to judge a class by; the code finding above already says what is missing.
    if (!check.code || ref.code) {
      for (const bad of strayClasses(dir, (cls) => check.allowedClass(cls, ref), options)) fail(name, "class-prefix", bad);
    }
  }

  const byCode = new Map<string, CardRef[]>();
  for (const ref of cards) {
    if (!ref.code) continue;
    byCode.set(ref.code, [...(byCode.get(ref.code) ?? []), ref]);
  }
  for (const [code, owners] of byCode) {
    if (owners.length < 2) continue;
    for (const owner of owners) {
      const others = owners.filter((other) => other !== owner).map((other) => other.name);
      fail(owner.name, "unique-code", `code "${code}" is also used by ${others.join(", ")}`);
    }
  }

  return findings;
}
