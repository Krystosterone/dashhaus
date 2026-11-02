/**
 * A small websocket client for the package's tests: no dependency, one unfragmented text message at a time, matching
 * what the server writes. It is test-only and is not shipped (the package's `files` allowlist covers `src/*.js` and
 * `src/*.d.ts`).
 */
import { createHash, randomBytes } from "node:crypto";
import { request as httpRequest } from "node:http";
import type { Duplex } from "node:stream";

/** One state in `subscribe_entities`' compressed shape. */
export interface FakeCompressedState {
  s: string;
  a: Record<string, unknown>;
  c: string;
  lc: number;
  lu: number;
}

/** A websocket message, as far as these tests read one. */
export interface FakeWebSocketMessage {
  id?: number;
  type?: string;
  success?: boolean;
  result?: unknown;
  error?: { code: string; message: string };
  event?: {
    a?: Record<string, FakeCompressedState>;
    c?: Record<string, Record<string, { "+": FakeCompressedState }>>;
  };
  ha_version?: string;
  message?: string;
}

export interface FakeWebSocketClient {
  /** The next message matching `predicate`, from the queue or a later frame. */
  next(predicate?: (message: FakeWebSocketMessage) => boolean, timeout?: number): Promise<FakeWebSocketMessage>;
  send(message: unknown): void;
  close(): Promise<void>;
}

type Waiter = {
  predicate: (message: FakeWebSocketMessage) => boolean;
  resolve: (message: FakeWebSocketMessage) => void;
  timer: NodeJS.Timeout;
};

const isMessage = (value: unknown): value is FakeWebSocketMessage => typeof value === "object" && value !== null && !Array.isArray(value);

/** Open a websocket with Home Assistant's handshake. */
export function openWebSocket(url: string): Promise<FakeWebSocketClient> {
  const target = new URL(url);
  if (target.protocol === "ws:") target.protocol = "http:";
  const key = randomBytes(16).toString("base64");
  const { promise, resolve, reject } = Promise.withResolvers<FakeWebSocketClient>();
  const request = httpRequest(target, {
    headers: {
      Connection: "Upgrade",
      Upgrade: "websocket",
      "Sec-WebSocket-Version": "13",
      "Sec-WebSocket-Key": key,
    },
  });
  request.on("upgrade", (response, socket, head) => {
    const expected = createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
    if (response.headers["sec-websocket-accept"] !== expected) {
      socket.destroy();
      reject(new Error("the server returned the wrong Sec-WebSocket-Accept"));
      return;
    }
    resolve(client(socket, head));
  });
  request.on("response", (response) => reject(new Error(`websocket upgrade refused with ${response.statusCode}`)));
  request.on("error", reject);
  request.end();
  return promise;
}

function client(socket: Duplex, head: Buffer): FakeWebSocketClient {
  const queue: FakeWebSocketMessage[] = [];
  const waiters: Waiter[] = [];
  let buffer = Buffer.from(head);

  const deliver = (message: FakeWebSocketMessage) => {
    const index = waiters.findIndex((waiter) => waiter.predicate(message));
    if (index === -1) {
      queue.push(message);
      return;
    }
    const [waiter] = waiters.splice(index, 1);
    if (waiter) {
      clearTimeout(waiter.timer);
      waiter.resolve(message);
    }
  };

  const parse = () => {
    for (;;) {
      if (buffer.length < 2) return;
      const fin = (buffer[0]! & 0x80) !== 0;
      const opcode = buffer[0]! & 0x0f;
      const masked = (buffer[1]! & 0x80) !== 0;
      let length = buffer[1]! & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (buffer.length < 4) return;
        length = buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (buffer.length < 10) return;
        length = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }
      const maskOffset = offset;
      if (masked) offset += 4;
      if (buffer.length < offset + length) return;
      const payload = Buffer.from(buffer.subarray(offset, offset + length));
      if (masked) for (let index = 0; index < payload.length; index++) payload[index]! ^= buffer[maskOffset + (index % 4)]!;
      buffer = buffer.subarray(offset + length);
      if (!fin) continue;
      if (opcode === 0x1) {
        const parsed: unknown = JSON.parse(payload.toString("utf8"));
        if (isMessage(parsed)) deliver(parsed);
      }
      if (opcode === 0x8) {
        socket.end();
        return;
      }
    }
  };

  socket.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    parse();
  });
  socket.on("error", () => undefined);
  parse();

  // A real socket: fake timers would stall the HTTP parser these messages come from, so the wait is bounded by the
  // platform clock and the test runner's own timeout still catches a server that never answers.
  const next = (predicate: (message: FakeWebSocketMessage) => boolean = () => true, timeout = 2000): Promise<FakeWebSocketMessage> => {
    const index = queue.findIndex(predicate);
    const queued = index === -1 ? undefined : queue.splice(index, 1)[0];
    if (queued) return Promise.resolve(queued);
    const { promise, resolve, reject } = Promise.withResolvers<FakeWebSocketMessage>();
    const timer = setTimeout(() => {
      const at = waiters.findIndex((candidate) => candidate.resolve === resolve);
      if (at !== -1) waiters.splice(at, 1);
      reject(new Error("timed out waiting for a websocket message"));
    }, timeout);
    waiters.push({ predicate, resolve, timer });
    return promise;
  };

  const close = () => {
    const { promise, resolve } = Promise.withResolvers<void>();
    if (socket.destroyed) {
      resolve();
      return promise;
    }
    const timer = setTimeout(() => {
      socket.destroy();
      resolve();
    }, 1000);
    socket.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.write(frame("", 0x8));
    socket.end();
    return promise;
  };

  return { next, send: (message) => socket.write(frame(JSON.stringify(message), 0x1)), close };
}

/** One masked client frame. */
function frame(text: string, opcode: number): Buffer {
  const payload = Buffer.from(text);
  const mask = randomBytes(4);
  let head: Buffer;
  if (payload.length < 126) {
    head = Buffer.from([0x80 | opcode, 0x80 | payload.length]);
  } else if (payload.length < 65536) {
    head = Buffer.from([0x80 | opcode, 0x80 | 126, payload.length >> 8, payload.length & 255]);
  } else {
    const length = Buffer.alloc(8);
    length.writeBigUInt64BE(BigInt(payload.length));
    head = Buffer.concat([Buffer.from([0x80 | opcode, 0x80 | 127]), length]);
  }
  const masked = Buffer.alloc(payload.length);
  for (let index = 0; index < payload.length; index++) masked[index] = payload[index]! ^ mask[index % 4]!;
  return Buffer.concat([head, mask, masked]);
}
