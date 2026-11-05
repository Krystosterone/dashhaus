import { defineCollection } from "astro:content";
import type { Loader } from "astro/loaders";
import { z } from "astro/zod";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { KIND_GROUPS } from "./lib/groups.js";
import { pendingChanges, releases } from "./lib/releases";

/**
 * An entity page's `kind`: the words about a kind that only the site has, which `src/lib/kinds.ts` joins with what the
 * code says (its Home Assistant domains, its hook, component, tile and module), for every list of kinds on the site.
 */
const kind = z.strictObject({
  /** Its group in the sidebar's Entities section. */
  group: z.enum(KIND_GROUPS),
  /** Its place in that group, from 1. */
  order: z.number().int().positive(),
  /** One line for the person installing a skin, on the home page. */
  summary: z.string(),
  /** The companion entities its hook reads beside it, after "with" (`its device's battery sensor`). */
  with: z.string().optional(),
  /** On the home page's Readings list rather than its Controls. */
  reading: z.boolean().default(false),
});

/**
 * The release notes page's entries (`src/lib/releases.ts`): one per release record, newest first, its notes rendered
 * as the site renders any Markdown, and `next` for the change notes not released yet, which are plain sentences.
 */
const releaseLoader: Loader = {
  name: "dashhaus-releases",
  async load({ store, renderMarkdown, generateDigest }) {
    store.clear();
    const changes = pendingChanges();
    if (changes.length) store.set({ id: "next", data: { version: "", order: 0, changes }, digest: generateDigest(JSON.stringify(changes)) });
    for (const [index, { version, notes }] of releases().entries()) {
      store.set({ id: version, data: { version, order: index + 1, changes: [] }, body: notes, digest: generateDigest(notes), rendered: notes ? await renderMarkdown(notes) : undefined });
    }
  },
};

const change = z.object({ type: z.enum(["breaking", "feature", "fix"]), body: z.string() });

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: z.object({ kind: kind.optional() }) }) }),
  releases: defineCollection({ loader: releaseLoader, schema: z.object({ version: z.string(), order: z.number(), changes: z.array(change) }) }),
};
