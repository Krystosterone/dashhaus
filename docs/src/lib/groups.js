/**
 * The entity pages' groups, in their sidebar order, and the sidebar's Entities section built from each page's own
 * `kind` frontmatter (its `group` and its `order` in it). A kind's page places itself, so a new page can't be left out
 * of the sidebar and a group can't name a page that doesn't exist.
 *
 * Plain JavaScript: `astro.config.js` reads it before Astro has a content collection to read pages from, and
 * `content.config.ts` takes its group names for the frontmatter's schema.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export const KIND_GROUPS = /** @type {const} */ (["Controls", "Comfort", "Readings", "Safety"]);

/** The Entities section's groups, each with its pages' slugs in order. */
export function entityGroups(dir) {
  const pages = readdirSync(dir)
    .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
    .map((file) => {
      const front = readFileSync(join(dir, file), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1];
      const kind = front ? parse(front)?.kind : undefined;
      if (!kind) throw new Error(`docs: entities/${file} has no kind in its frontmatter (group, order, summary)`);
      if (!KIND_GROUPS.includes(kind.group)) throw new Error(`docs: entities/${file}'s kind.group is "${kind.group}", not one of ${KIND_GROUPS.join(", ")}`);
      return { slug: `entities/${file.replace(/\.mdx$/, "")}`, group: kind.group, order: kind.order };
    });
  return KIND_GROUPS.map((label) => ({
    label,
    items: pages.filter((page) => page.group === label).sort((a, b) => a.order - b.order).map((page) => page.slug),
  })).filter((group) => group.items.length > 0);
}
