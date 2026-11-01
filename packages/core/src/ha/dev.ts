/**
 * Development-only entity contract checks for the `useHa<Name>` hooks.
 *
 * A malformed entity id or one from the wrong domain is almost always a config typo, and it fails silently at
 * runtime: the store simply has no such entity. These checks name the hook and what it expected, once per entity and
 * hook. They never throw, are silent in production, and say nothing about a missing entity — a dashboard may
 * legitimately draw one before Home Assistant delivers it.
 */

const ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;

const warned = new Set<string>();

/** Production builds are silent. With no `process` (a browser without Vite's define) the check stays silent too. */
function inDevelopment(): boolean {
  return typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
}

/**
 * Warn once when `entityId` is malformed or its domain is not one of `domains`. `hook` is the caller's name, so the
 * warning points at the call site in a stack trace and in the console.
 */
export function checkEntityId(entityId: string, domains: readonly string[], hook: string): void {
  if (!inDevelopment()) return;
  const key = `${hook}\u0000${entityId}`;
  if (warned.has(key)) return;

  let message: string | undefined;
  if (!ENTITY_ID.test(entityId)) {
    message = `${hook}: "${entityId}" is not a Home Assistant entity id (expected "domain.object_id" in lower-case letters, digits and underscores)`;
  } else {
    const domain = entityId.slice(0, entityId.indexOf("."));
    if (!domains.includes(domain)) {
      const expected = domains.length === 1 ? `${domains[0]}.*` : domains.map((name) => `${name}.*`).join(" or ");
      message = `${hook}: "${entityId}" is a ${domain} entity; expected ${expected}`;
    }
  }
  if (!message) return;

  warned.add(key);
  console.warn(message);
}
