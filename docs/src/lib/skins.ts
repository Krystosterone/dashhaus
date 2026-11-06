/**
 * The skins as the site presents them, each on its own landing page (`<page>.mdx`): what scripts/skin-repositories.js
 * says about its repository and install, plus what only the site draws, its live stories, posters and colours. A
 * landing page is the skin's alone; its one way to Dashhaus is the foot (`components/skin/Foot.astro`).
 */
import type { ImageMetadata } from "astro";
import { SKIN_REPOSITORIES, myLink, pageUrl } from "../../../scripts/skin-repositories.js";
import type { SkinRepository } from "../../../scripts/skin-repositories.js";
import orbDark from "../assets/skins/phone-orb-dark.webp";
import orbLight from "../assets/skins/phone-orb-light.webp";
import fieldDark from "../assets/skins/phone-field-dark.webp";
import fieldLight from "../assets/skins/phone-field-light.webp";

export interface SiteSkin extends SkinRepository {
  /** The My link that opens its repository in the Marketplace, or HACS before 2026.11. */
  myLink: string;
  /** Its landing page's address. */
  url: string;
  /** One line under its name. */
  tagline: string;
  /** Its Storybook toolbar global for the site's light and dark look. */
  light: string;
  dark: string;
  /** Where the phone story's screen starts and how it rounds, for the hero's frame. */
  screen: { top: number; radius: number };
  poster: { light: ImageMetadata; dark: ImageMetadata };
  /** The YAML key its own colours take, and its values; the first is the default. */
  colours: { key: "theme" | "finish"; values: readonly string[]; text: string };
}

const SITE: Record<SkinRepository["skin"], Omit<SiteSkin, keyof SkinRepository | "myLink" | "url">> = {
  orb: {
    tagline: "Soft, round cards you read at a glance. Every device in your house, room by room, laid out for you.",
    light: "theme:light",
    dark: "theme:dark",
    screen: { top: 47, radius: 36 },
    poster: { light: orbLight, dark: orbDark },
    colours: {
      key: "theme",
      values: ["home-assistant", "auto", "light", "dark"],
      text: "Orb's colours. `home-assistant` follows Home Assistant's light or dark mode; `auto` follows the device; `light` and `dark` hold one.",
    },
  },
  field: {
    tagline: "A hardware panel for your house: keys you press, faders you slide, screens you read. Laid out for you, room by room.",
    light: "finish:alloy",
    dark: "finish:black",
    screen: { top: 44, radius: 28 },
    poster: { light: fieldLight, dark: fieldDark },
    colours: {
      key: "finish",
      values: ["home-assistant", "auto", "alloy", "black"],
      text: "Field's finish. `home-assistant` follows Home Assistant's light or dark mode, Alloy in light and Black in dark; `auto` follows the device; `alloy` and `black` hold one.",
    },
  },
};

export const SKINS: SiteSkin[] = SKIN_REPOSITORIES.map((entry) => ({ ...entry, ...SITE[entry.skin], myLink: myLink(entry), url: pageUrl(entry) }));

/** The skin whose landing page this is, by the page's id. */
export const skinOf = (id: string) => SKINS.find((skin) => skin.page === id);

export const skin = (id: SkinRepository["skin"]) => SKINS.find((candidate) => candidate.skin === id)!;
