#!/usr/bin/env node
/**
 * The skin's conformance check: the packed preset over this skin's cards. It reads the same declarations the repo's
 * generated skins use, so renaming a card or its story is caught here before the bundle is built.
 */
import assert from "node:assert/strict";
import { cardFolders, checkCards } from "@dashhaus/dashboard/conformance";

const findings = checkCards(
  {
    skin: ".",
    storyPrefix: "__Section__/Cards",
    component: (Name) => `__Skin__${Name}Card.tsx`,
    stories: (Name) => `__Skin__${Name}Card.stories.tsx`,
    code: (source) => source.match(/const CARD_CODE = "([a-z]{2})"/)?.[1],
    allowedClass: (cls) => cls.startsWith("__skin__-"),
    forbiddenImport: (specifier) =>
      specifier === "@dashhaus/core" ||
      /^@dashhaus\/core\/(?:ha|websocket|demo|testing|fixtures)(?:\/|$)/.test(specifier) ||
      specifier === "@dashhaus/dashboard",
  },
  { root: process.cwd() },
);

assert.deepEqual(findings, []);
console.log(`conformance: ${cardFolders(".", { root: process.cwd() }).length} cards, no findings`);
