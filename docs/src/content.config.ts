import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { KIND_GROUPS } from "./lib/groups.js";

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

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: z.object({ kind: kind.optional() }) }) }),
};
