import { define__Skin__Card } from "./card";

/**
 * The Lovelace bundle's entry. Every component imports its own stylesheet; vite.config.js collects them all, in the
 * order below, into the one string the card puts in its shadow root, so the built file is one ES module carrying its
 * own CSS. A card added later needs no edit here. `custom:__card_type__` is registered for Home Assistant's card
 * picker.
 */
const sheets = import.meta.glob(["../styles/*.css", "../shared/*.css", "../dashboards/*.css", "../lovelace/*.css", "../cards/*/*.css"], { query: "?inline", import: "default", eager: true }) as Record<string, string>;
const ORDER = ["/styles/", "/shared/", "/dashboards/", "/lovelace/", "/cards/"];
const rank = (path: string) => ORDER.findIndex((folder) => path.includes(folder));
define__Skin__Card(Object.keys(sheets).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map((path) => sheets[path]).join("\n"));
console.info("Dashhaus __Section__ loaded");
