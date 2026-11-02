/**
 * What the page around __Section__ needs, read by both surfaces: the Lovelace card (`lovelace/card.tsx`) and Storybook
 * (`storybook.tsx`).
 */

/**
 * The theme attribute styles/tokens.css reads, `light` or `dark` (absent: the system's scheme). It is the skin's own,
 * so another skin's attribute on the same <html> never re-colours this one. The card sets it on its host from Home
 * Assistant's dark mode; Storybook's __Section__ theme toolbar sets it on <html>.
 */
export const __SKIN_CONST___THEME_ATTRIBUTE = "data-__skin__-theme";

/**
 * The skin's web fonts, as one stylesheet URL, e.g.
 * "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&display=swap".
 * The card links it from Home Assistant's page (`fontHref`; a font can't load from inside a shadow root) and
 * .storybook/preview.tsx links it for this skin's stories (the setup's `fontHref`). Name the families in
 * styles/tokens.css. Undefined keeps the system stack, and a page without the network keeps it too.
 */
export const __SKIN_CONST___FONT_HREF: string | undefined = undefined;
