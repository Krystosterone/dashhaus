/** The `fake-home-assistant` command: read the options, start the server and print the `.env` settings. */
import { startFakeHomeAssistant } from "./server.js";

export const USAGE = `Fake Home Assistant — a focused in-memory Home Assistant over its websocket, REST and /local APIs.

Usage:
  fake-home-assistant [options]

Options:
  --port <port>     Port to listen on (default 8123; 0 picks a free one)
  --host <host>     Interface to bind (default 127.0.0.1)
  --www <dir>       Folder served at /local/ (default: a new temporary folder)
  --token <token>   Long-lived token clients must use (default fake-ha-token)
  --state <file>    Write resources, dashboards, saved layouts and the command log here after every command
  -h, --help        Print this help

It prints HA_URL, HA_TOKEN and HA_WWW when it starts.`;

const VALUE_OPTIONS = new Set(["--port", "--host", "--www", "--token", "--state"]);

const option = (argv, name) => {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
};

/** Run the command; resolves with the process exit code. A started server keeps the process alive. */
export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!VALUE_OPTIONS.has(name) || argv[index + 1] === undefined) {
      console.error(`Unknown option: ${name}\n`);
      console.error(USAGE);
      return 2;
    }
  }
  const port = Number(option(argv, "--port") ?? 8123);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`Invalid port: ${option(argv, "--port")}\n`);
    console.error(USAGE);
    return 2;
  }
  try {
    const { settings } = await startFakeHomeAssistant({
      port,
      host: option(argv, "--host") ?? "127.0.0.1",
      www: option(argv, "--www"),
      token: option(argv, "--token"),
      stateFile: option(argv, "--state"),
    });
    console.log(`Fake Home Assistant listening.\nHA_URL=${settings.HA_URL}\nHA_TOKEN=${settings.HA_TOKEN}\nHA_WWW=${settings.HA_WWW}`);
    return 0;
  } catch (error) {
    console.error(`Fake Home Assistant could not start: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}
