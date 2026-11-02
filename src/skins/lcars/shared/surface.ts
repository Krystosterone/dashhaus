/**
 * What the page around Lcars needs, read by the Lovelace card (`lovelace/card.tsx`) and by any page that draws
 * the skin outside Home Assistant.
 */

/**
 * The theme attribute styles/tokens.css reads, `light` or `dark` (absent: the system's scheme). It is the skin's own,
 * so another skin's attribute on the same <html> never re-colours this one. The card sets it on its host from Home
 * Assistant's dark mode; a page outside Home Assistant sets it on <html>.
 */
export const LCARS_THEME_ATTRIBUTE = "data-lcars-theme";

/**
 * The skin's web fonts, as one stylesheet URL, e.g.
 * "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&display=swap".
 * The card links it from Home Assistant's page (`fontHref`; a font can't load from inside a shadow root), and any
 * other page drawing the skin links the same URL. Name the families in styles/tokens.css. Undefined keeps the system
 * stack, and a page without the network keeps it too.
 */
export const LCARS_FONT_HREF: string | undefined = "https://fonts.googleapis.com/css2?family=Antonio:wght@400;600;700&display=swap";
