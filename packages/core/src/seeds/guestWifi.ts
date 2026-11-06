import { useState } from "react";
import type { GuestWifiEntity } from "../entities/guestWifi/types";
import { QR_LONG, QR_MAPLE, QR_PASSWORD } from "../demo/qr";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const stamp = "11:54";

export interface GuestWifiSeed {
  entity: GuestWifiEntity;
}

const maple = { name: "Guest Wi-Fi", area: "Hall", access: "code", network: "Maple Guests", qr: QR_MAPLE, lastUpdated: "11:52" } as const;

export const GUEST_WIFI_SEEDS = {
  /** A fresh single-use code, good for a day once someone joins with it: the integration's default. */
  ready: {
    entity: { ...maple, entityId: "sensor.maple_voucher", state: "ready", code: "98668-49366", allowed: 1, used: 0, lastsMinutes: 1440, created: "Mon 18:02" },
  },
  /** A code for several guests, two of whom have joined: 18 hours of it are left. */
  shared: {
    entity: { ...maple, entityId: "sensor.cottage_voucher", name: "Cottage Wi-Fi", area: "Cottage", network: "Cottage Guests", state: "ready", code: "40512-77031", allowed: 5, used: 2, lastsMinutes: 1440, leftMinutes: 1092, created: "09:40" },
  },
  /** Any number of uses for a week: a party, a rental. */
  unlimited: {
    entity: { ...maple, entityId: "sensor.studio_voucher", name: "Studio Wi-Fi", area: "Studio", network: "Studio Guests", state: "ready", code: "11873-20954", allowed: "unlimited", used: 0, lastsMinutes: 10080, created: "3 Oct" },
  },
  /** Every code has been used: none to give until a new one is made. */
  none: {
    entity: { ...maple, entityId: "sensor.annex_voucher", name: "Annex Wi-Fi", area: "Annex", network: "Annex Guests", state: "none", lastUpdated: undefined },
  },
  /** A Wi-Fi password in an `input_text`, with a QR code that joins with it, and a script that changes it. */
  password: {
    entity: { entityId: "input_text.guest_wifi_password", name: "Guest Wi-Fi", area: "Hall", access: "password", state: "ready", network: "Maple Guests 5G", code: "ripe-Mango-sunset-42", qr: QR_PASSWORD },
  },
  unavailable: {
    entity: { entityId: "sensor.garage_voucher", name: "Guest Wi-Fi", area: "Garage", access: "code", state: "unavailable", lastSeen: "08:20" },
  },
  /**
   * Worst case: a name, a network and an area long enough to truncate at every width, uses and a length at their
   * limits, and a longer network's denser QR code (break-ui skill).
   */
  long: {
    entity: {
      entityId: "sensor.hendersons_okonkwo_voucher",
      access: "code",
      name: "Guest Wi-Fi for the cottage, the boathouse and the studio",
      area: "Boathouse and the long garden down to the lake",
      network: "The Hendersons-Okonkwo guest network 5G",
      qr: QR_LONG,
      state: "ready",
      code: "12345-67890",
      allowed: 9999,
      used: 9998,
      lastsMinutes: 525_600,
      leftMinutes: 524_159,
      created: "14 Feb",
      lastUpdated: "Fri 18:30",
    },
  },
  /** A code Home Assistant gives without its network or its QR code (the image switched off): the code alone. */
  bare: {
    entity: { entityId: "sensor.office_voucher", name: "Guest Wi-Fi", access: "code", state: "ready", code: "55021-90318", lastUpdated: "11:50" },
  },
  /** Worst case: a WPA passphrase at its longest, 63 characters, with no network name or QR code beside it. */
  passphrase: {
    entity: { entityId: "input_text.studio_wifi_passphrase", name: "Studio Wi-Fi", area: "Studio", access: "password", state: "ready", code: "Correct-Horse-Battery-Staple-and-a-very-long-tail-of-words-2026" },
  },
} satisfies Record<string, GuestWifiSeed>;

export type GuestWifiSeedName = keyof typeof GUEST_WIFI_SEEDS;

/** Worst-case data: the card's Worst case story and Orb → Foundations → Worst case both draw these. */
export const GUEST_WIFI_WORST_CASE: GuestWifiSeed[] = [GUEST_WIFI_SEEDS.long, GUEST_WIFI_SEEDS.bare, GUEST_WIFI_SEEDS.passphrase];

/** A new ten-digit code, in the integration's two groups of five. */
const nextCode = (code?: string) => {
  const digits = (code ?? "00000-00000").replace(/\D/g, "").padEnd(10, "0");
  const next = String((Number(digits) * 7 + 13_579) % 9_000_000_000 + 1_000_000_000);
  return `${next.slice(0, 5)}-${next.slice(5)}`;
};

const WORDS = ["ripe", "Mango", "sunset", "Cedar", "quiet", "Harbor", "amber", "Willow"];
/** A new password from the last: three words and a number, like the demo's. */
const nextPassword = (password?: string) => {
  const n = (password ?? "").length;
  return `${WORDS[n % 8]}-${WORDS[(n + 3) % 8]}-${WORDS[(n + 5) % 8]}-${10 + (n * 7) % 90}`;
};

/** A seed that answers like its host: a new code or password takes a moment, and a refresh only says when it fetched. */
export function useDemoGuestWifi(seed: GuestWifiSeed) {
  const [entity, setEntity] = useState<GuestWifiEntity>(seed.entity);
  const later = (change: (e: GuestWifiEntity) => GuestWifiEntity) => new Promise<void>((resolve) => setTimeout(() => {
    setEntity((e) => (e.state === "unavailable" ? e : change(e)));
    resolve();
  }, 700));
  const reachable = entity.state !== "unavailable";
  return {
    entity,
    onRefresh: reachable ? () => later((e) => ({ ...e, lastUpdated: stamp })) : undefined,
    onNewCode: reachable
      ? () => later((e) => (e.access === "password"
        ? { ...e, state: "ready", code: nextPassword(e.code), qr: undefined }
        : { ...e, state: "ready", code: nextCode(e.code), allowed: 1, used: 0, lastsMinutes: 1440, leftMinutes: undefined, created: stamp, lastUpdated: stamp }))
      : undefined,
  };
}
