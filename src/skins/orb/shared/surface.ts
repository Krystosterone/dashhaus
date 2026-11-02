/**
 * What the page around Orb needs, read by both surfaces: the Lovelace card (`lovelace/card.tsx`) and Storybook
 * (`storybook.tsx`).
 */

/**
 * The theme attribute styles/tokens.css reads, `light` or `dark` (absent: the system's scheme). It is Orb's own, so
 * another skin's theme on the same <html> never re-colours Orb, and Orb's never re-colours another skin. The card sets
 * it on its host from its YAML `theme` (or Home Assistant's dark mode); Storybook's Theme toolbar sets it on <html>.
 */
export const ORB_THEME_ATTRIBUTE = "data-orb-theme";

/** Orb's typeface, Urbanist. The card links it from Home Assistant's page; .storybook/preview.tsx, for Orb's stories. */
export const ORB_FONT_HREF = "https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700&display=swap";
