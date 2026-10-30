import { defineConfig } from "vitest/config";
import { projects } from "./vitest.projects";

export default defineConfig({ test: { projects } });
