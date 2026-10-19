/**
 * Serves the static storybook build on :6006 and runs @storybook/test-runner against it,
 * exiting with the runner's status. One command = deterministic smoke + axe gate.
 */
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import http from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../storybook-static/", import.meta.url));
const TYPES = {
  ".css": "text/css",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
  ".json": "application/json",
  ".map": "application/json",
  ".mjs": "text/javascript",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const file = path === "/" ? "/index.html" : path;
  try {
    const body = await readFile(join(root, file));
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(root, "index.html"));
      res.writeHead(200, { "content-type": "text/html" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  }
});

server.listen(6006, "127.0.0.1", () => {
  const bin = join(root, "..", "node_modules", ".bin", "test-storybook");
  const child = spawn(bin, ["--url", "http://127.0.0.1:6006"], { stdio: "inherit" });
  child.on("exit", (code) => {
    server.close();
    process.exit(code ?? 1);
  });
});
