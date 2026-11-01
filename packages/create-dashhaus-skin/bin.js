#!/usr/bin/env node
// The npm-created bin: the packed install runs `dist/index.js`; a workspace checkout runs the source.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const packed = new URL("./dist/index.js", import.meta.url);
const source = new URL("./src/index.js", import.meta.url);
await import(existsSync(fileURLToPath(packed)) ? packed : source);
