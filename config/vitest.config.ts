import { defineConfig } from "vitest/config";
import { projects } from "./vitest.projects.ts";

export default defineConfig({ test: { projects } });
