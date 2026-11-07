import type { HassEntity } from "./types";

/** States in which an entity shows no picture: a past frame must never read as now. */
const NO_PICTURE = new Set(["unavailable", "unknown"]);

/**
 * An entity's own picture path, Home Assistant's `entity_picture` (`/api/camera_proxy/camera.door?token=…`), or
 * nothing while the entity is missing, unavailable or unknown, or names none.
 */
export function picturePath(entity: HassEntity | undefined): string | undefined {
  if (!entity || NO_PICTURE.has(entity.state)) return undefined;
  const path = entity.attributes.entity_picture;
  return typeof path === "string" && path.trim() !== "" ? path.trim() : undefined;
}

/** A URL a page may load as a picture: http(s), an inline image, or a blob. */
function loadable(url: string): boolean {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase();
  if (scheme === "http" || scheme === "https" || scheme === "blob") return true;
  return scheme === "data" && /^data:image\/[a-z0-9.+-]+[;,]/i.test(url);
}

/**
 * A picture path as a URL this page can load, or nothing. An inline `data:image/…` or `blob:` URL is kept as it is;
 * anything else goes through `resolve` (the transport's, which knows Home Assistant's base URL), else stays as Home
 * Assistant gave it, relative to the page. Whatever comes back must be http(s), an inline image or a blob: a
 * `javascript:`, `file:` or `data:text/html` picture, or a protocol-relative `//host` one, is no picture.
 */
export function resolvePicture(path: string | undefined, resolve?: (path: string) => string | undefined): string | undefined {
  if (!path) return undefined;
  if (/^(data|blob):/i.test(path)) return loadable(path) ? path : undefined;
  if (path.startsWith("//")) return undefined;
  const url = resolve ? resolve(path) : path;
  if (!url || url.startsWith("//")) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return loadable(url) ? url : undefined;
  // Still relative: the page's own origin, which inside Home Assistant is Home Assistant.
  return url.startsWith("/") ? url : undefined;
}

/** A relative Home Assistant path against its base URL (`hassUrl`), as the frontend's `hass.hassUrl()` does. */
export function againstBase(path: string, base: string | undefined): string | undefined {
  if (!base) return path;
  try {
    return new URL(path, base).href;
  } catch {
    return undefined;
  }
}
