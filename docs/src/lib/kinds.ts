/**
 * Every kind of entity Dashhaus draws, joined at build time from where each fact lives, for every list of kinds on the
 * site (the home page, the Entities overview, the Hooks reference, the YAML guide):
 *
 * - which kinds there are, from `@dashhaus/core`'s sources (`coreKinds`);
 * - the hook, headless component, Orb tile and Field module, each only if its package exports it;
 * - the Home Assistant entities a Lovelace card draws it for, from the skins' own kind tables, which must agree;
 * - its title, group, order and the words only the site has, from its entity page's `kind` frontmatter.
 *
 * A kind with no page, or a page with no kind, fails the build, so a new card can't be missing from a list.
 */
import { getCollection } from "astro:content";
import { DOMAIN_KIND, SHARED_KINDS } from "../../../src/skins/orb/lovelace/config";
import { FIELD_KINDS } from "../../../src/skins/field/lovelace/config";
import { coreKinds, exports } from "./api";
import { KIND_GROUPS } from "./groups.js";

export interface Kind {
  /** `fan`: the entity folder, the page's slug, the Lovelace card's `card:` value. */
  name: string;
  /** The entity page's title. */
  title: string;
  href: string;
  group: (typeof KIND_GROUPS)[number];
  summary: string;
  with?: string;
  reading: boolean;
  hook: string;
  component: string;
  tile?: string;
  module?: string;
  /** The Home Assistant domains a Lovelace card draws it for. */
  domains: string[];
  /** The entity ids that pick it on a domain another card draws, said as a glob (`sensor.*_sleep_state`). */
  pattern?: string;
  /** Whether it is its domains' own card; a card that isn't is picked by `pattern` or with `card:`. */
  own: boolean;
}

const capitalized = (name: string) => name[0].toUpperCase() + name.slice(1);

/** A kind's page slug: its name in kebab case, since page ids are lower case (`guestWifi` → `guest-wifi`). */
export const pageSlug = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** An entity-id pattern in the words a reader writes: `^sensor\.\w+_sleep_state$` is `sensor.*_sleep_state`. */
function glob(id: RegExp): string {
  const text = id.source.replace(/^\^/, "").replace(/\$$/, "").replace(/\\w\+/g, "*").replace(/\\\./g, ".");
  if (/[\\()[\]{}|+?^$]/.test(text)) throw new Error(`kinds: ${id} can't be said as a glob; say it in docs/src/lib/kinds.ts`);
  return text;
}

/** Orb's and Field's way of picking a kind: its domains, its id pattern, and whether it is the domain's own. */
function lovelace(name: string) {
  const ownIn = Object.keys(DOMAIN_KIND).filter((domain) => DOMAIN_KIND[domain] === name);
  const shared = SHARED_KINDS[name as keyof typeof SHARED_KINDS];
  const orb = { domains: [...ownIn, ...(shared?.domains ?? [])].sort(), id: shared?.id?.source, own: ownIn.length > 0 };
  const spec = FIELD_KINDS[name as keyof typeof FIELD_KINDS];
  // Field's own card for a domain is the first that draws it without an `id` (`FIELD_KINDS`).
  const fieldOwn = spec != null && !spec.id && spec.domains.every((domain) =>
    Object.entries(FIELD_KINDS).find(([, other]) => !other.id && other.domains.includes(domain))?.[0] === name);
  const field = spec && { domains: [...spec.domains].sort(), id: spec.id?.source, own: fieldOwn };
  if (field && JSON.stringify(field) !== JSON.stringify(orb)) {
    throw new Error(`kinds: Orb and Field pick ${name} differently (${JSON.stringify(orb)} and ${JSON.stringify(field)}); the YAML guide says one table for both`);
  }
  return { domains: orb.domains, pattern: shared?.id ? glob(shared.id) : undefined, own: orb.own };
}

let cached: Promise<Kind[]> | undefined;

/** Every kind, in the sidebar's order: by group, then by its order in it. */
export function kinds(): Promise<Kind[]> {
  cached ??= (async () => {
    const pages = await getCollection("docs", (entry) => entry.id.startsWith("entities/") && entry.id !== "entities");
    const names = coreKinds();
    for (const page of pages) {
      if (!page.data.kind) throw new Error(`kinds: ${page.id} has no kind in its frontmatter`);
      if (!names.some((name) => `entities/${pageSlug(name)}` === page.id)) throw new Error(`kinds: ${page.id} is a page for a kind @dashhaus/core doesn't model`);
    }
    return names.map((name): Kind => {
      const page = pages.find((entry) => entry.id === `entities/${pageSlug(name)}`);
      if (!page?.data.kind) throw new Error(`kinds: @dashhaus/core models ${name}, and the site has no entities/${pageSlug(name)}.mdx for it`);
      const Name = capitalized(name);
      const hook = `useHa${Name}`;
      const component = `Ha${Name}`;
      for (const required of [hook, component]) if (!exports("@dashhaus/core", required)) throw new Error(`kinds: @dashhaus/core exports no ${required}`);
      const { group, summary, reading } = page.data.kind;
      return {
        name,
        title: page.data.title,
        href: `${import.meta.env.BASE_URL.replace(/\/$/, "")}/entities/${pageSlug(name)}/`,
        group,
        summary,
        with: page.data.kind.with,
        reading,
        hook,
        component,
        tile: exports("@dashhaus/orb", `${component}Tile`) ? `${component}Tile` : undefined,
        module: exports("@dashhaus/field", `${component}Module`) ? `${component}Module` : undefined,
        ...lovelace(name),
      };
    }).sort((a, b) => {
      const order = (kind: Kind) => pages.find((entry) => entry.id === `entities/${pageSlug(kind.name)}`)?.data.kind?.order ?? 0;
      return KIND_GROUPS.indexOf(a.group) - KIND_GROUPS.indexOf(b.group) || order(a) - order(b);
    });
  })();
  return cached;
}

/** Text with `code` spans, split so a template can draw each odd part as `<code>`. */
export const spans = (text: string): string[] => text.split("`");
