/**
 * What the page around Titan needs, read by the Lovelace card (`lovelace/card.tsx`) and by any page that draws
 * the skin outside Home Assistant.
 */

/**
 * The theme attribute styles/tokens.css reads, `light` or `dark` (absent: the system's scheme). It is the skin's own,
 * so another skin's attribute on the same <html> never re-colours this one. The card sets it on its host from Home
 * Assistant's dark mode; a page outside Home Assistant sets it on <html>.
 */
export const TITAN_THEME_ATTRIBUTE = "data-titan-theme";

/**
 * The skin's web font, Antonio (SIL OFL 1.1), as a stylesheet URL. The card links it from Home Assistant's page
 * (`fontHref`; a font can't load from inside a shadow root), as Storybook does for this skin's stories.
 */
export const TITAN_FONT_HREF = "https://fonts.googleapis.com/css2?family=Antonio:wght@400;600;700&display=swap";
