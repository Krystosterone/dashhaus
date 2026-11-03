import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const bin = fileURLToPath(new URL("../bin.js", import.meta.url));

describe("the fake-home-assistant command", () => {
  it("prints its options for --help", () => {
    const result = spawnSync(process.execPath, [bin, "--help"], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("--state");
  });

  it("starts on an ephemeral port and prints the settings", async () => {
    const folder = await mkdtemp(join(tmpdir(), "fake-ha-cli-"));
    const child = spawn(process.execPath, [bin, "--port", "0", "--token", "cli-token", "--state", join(folder, "state.json")], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    try {
      const stdout = child.stdout;
      const stderr = child.stderr;
      if (!stdout || !stderr) throw new Error("the CLI has no stdio");

      const { promise, resolve, reject } = Promise.withResolvers<string>();
      let text = "";
      stdout.setEncoding("utf8");
      stdout.on("data", (chunk: string) => {
        text += chunk;
        if (text.includes("HA_WWW=")) resolve(text);
      });
      stderr.setEncoding("utf8");
      stderr.on("data", (chunk: string) => {
        text += chunk;
      });
      child.once("exit", (code) => reject(new Error(`the CLI exited ${code}:\n${text}`)));

      const output = await promise;
      const url = /^HA_URL=(.+)$/m.exec(output)?.[1]?.trim();
      if (!url) throw new Error(`the CLI printed no HA_URL:\n${output}`);
      expect(/^HA_TOKEN=(.+)$/m.exec(output)?.[1]?.trim()).toBe("cli-token");
      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

      const response = await fetch(`${url}/api/states`, { headers: { authorization: "Bearer cli-token" } });
      expect(response.status).toBe(200);
      expect((await response.json()) as unknown[]).toHaveLength(16);
    } finally {
      child.kill();
      if (child.exitCode === null && child.signalCode === null) await once(child, "exit");
      await rm(folder, { recursive: true, force: true });
    }
  });
});
