import { describe, expect, it } from "vitest";
import { HA_ACTION_ERROR_META, HaActionError } from "./types";
import type { HaActionErrorCode } from "./types";

describe("HaActionError metadata", () => {
  it("gives every code one category and one retryability answer", () => {
    expect(HA_ACTION_ERROR_META).toEqual({
      not_connected: { category: "connection", retryable: true },
      service_failed: { category: "rejected", retryable: true },
      transport_unknown: { category: "connection", retryable: false },
      unsupported: { category: "unsupported", retryable: false },
      invalid_input: { category: "invalid_input", retryable: false },
    });
  });

  it.each(Object.keys(HA_ACTION_ERROR_META) as HaActionErrorCode[])("puts %s's metadata on the error", (code) => {
    const error = new HaActionError(code, "sanitized", { domain: "light", service: "toggle" });

    expect(error).toMatchObject({ code, ...HA_ACTION_ERROR_META[code] });
  });

  it("keeps the sanitized provider scalars and nothing else", () => {
    const error = new HaActionError("service_failed", "Home Assistant rejected light.toggle", {
      domain: "light",
      service: "toggle",
      entityId: "light.desk",
      translationKey: "invalid_code",
      providerCode: "400",
    });

    expect(error).toMatchObject({
      translationKey: "invalid_code",
      providerCode: "400",
      domain: "light",
      service: "toggle",
      entityId: "light.desk",
    });
    expect(error.message).toBe("Home Assistant rejected light.toggle");
  });
});
