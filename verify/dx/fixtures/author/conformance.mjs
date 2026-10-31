/**
 * The author app's test: the packed conformance preset over this skin's cards. It imports only the app's installed
 * `@dashhaus/dashboard/conformance`, never this repo.
 */
import assert from "node:assert/strict";
import { cardFolders, checkCards } from "@dashhaus/dashboard/conformance";

const skin = "skin";
const findings = checkCards(
  {
    skin,
    storyPrefix: "Fixture/Cards",
    component: (Name) => `${Name}Card.tsx`,
    stories: (Name) => `${Name}.stories.tsx`,
    code: (source) => source.match(/const CARD_CODE = "([a-z]{2})"/)?.[1],
    allowedClass: (cls, { code }) => code !== undefined && (cls === `fx-${code}` || cls.startsWith(`fx-${code}-`)),
    forbiddenImport: (specifier) =>
      specifier === "@dashhaus/core" ||
      /^@dashhaus\/core\/(?:websocket|demo|testing|fixtures)(?:\/|$)/.test(specifier) ||
      specifier === "@dashhaus/dashboard",
  },
  { root: process.cwd() },
);

assert.deepEqual(findings, []);
console.log(`conformance: ${cardFolders(skin, { root: process.cwd() }).length} cards, no findings`);
