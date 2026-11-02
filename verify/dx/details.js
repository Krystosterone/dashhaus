#!/usr/bin/env node
/**
 * Open and close a deployed skin's light and sensor details, on a live Home Assistant or the fake one:
 *
 *   node verify/dx/details.js http://homeassistant:8123/dashhaus-my-skin --token <long-lived token> [--screenshot <file>]
 *
 * The token becomes the page's own frontend session (`localStorage.hassTokens`); it is never printed or written. Omit
 * it for the fake Home Assistant, whose dashboard needs no login. `--screenshot` saves each open dialog as
 * `<file>-lt.png` and `<file>-sn.png`. The check is the same one the author journey runs after `npm run deploy`, so a
 * live smoke records the observation CI proves.
 */
import { exerciseDetails } from "./harness.js";

const argv = process.argv.slice(2);
const tokenAt = argv.indexOf("--token");
const token = tokenAt === -1 ? undefined : argv[tokenAt + 1];
const shotAt = argv.indexOf("--screenshot");
const screenshot = shotAt === -1 ? undefined : argv[shotAt + 1];
const url = argv.find((arg, index) => !arg.startsWith("--") && index !== tokenAt + 1 && index !== shotAt + 1);

if (!url) {
  console.error("Usage: node verify/dx/details.js <dashboard-url> [--token <long-lived token>] [--screenshot <file>]");
  process.exit(2);
}

const CARDS = [
  { code: "lt", facts: ["Area", "State", "Brightness"], close: "button" },
  { code: "sn", facts: ["Area", "Temperature", "Humidity", "Unit"], close: "escape" },
];

try {
  const result = await exerciseDetails(url, CARDS, { token, screenshot });
  console.log(`✓ details — ${result}`);
} catch (error) {
  console.error(`! details — ${error?.message ?? String(error)}`);
  process.exitCode = 1;
}
