/**
 * A guest Wi-Fi network and what a guest types to use it, one of two kinds (`access`):
 *
 * - `code`: an open network whose captive portal asks for a code once you have joined, such as UniFi Hotspot Manager's
 *   vouchers (`sensor.*_voucher`, with the network's join QR code `image.*_qr_code` and the buttons that fetch the codes
 *   again and make a new one, `button.*_update` and `button.*_create`, found beside it). The QR code joins the network;
 *   the code is what its page asks for.
 * - `password`: a network with a Wi-Fi password, kept in any entity whose state is the password (an `input_text`, a
 *   `text`, a template sensor), with whatever QR code image and actions the host names.
 */
export interface GuestWifiEntity {
  /** The entity that holds the code or password: a `sensor.*`, `input_text.*` or `text.*`. */
  entityId: string;
  /** Its name: the `name` option, else "Guest Wi-Fi" (the integration's own names describe it, not the network). */
  name: string;
  /** Where it is: "Hall". */
  area?: string;
  /**
   * `ready`: a code or password to give. `none`: there is none (a voucher's uses are spent), and a new one can be made.
   * `unavailable`: neither it nor a way to make one can be reached.
   */
  state: "ready" | "none" | "unavailable";
  /** `code`: an open network whose page asks for a code. `password`: the network's Wi-Fi password. */
  access: "code" | "password";
  /** The network to join: "Maple Guests". Absent where Home Assistant names none, and while unavailable. */
  network?: string;
  /** What a guest types, as Home Assistant gives it: the code ("98668-49366") or the password. Only while `ready`. */
  code?: string;
  /**
   * The network's join QR code, a URL this page can load: the hook adds it from the QR code image's `entity_picture`
   * (`useHaPicture`), resolved against Home Assistant, and leaves it out while the image or the code is unavailable.
   */
  qr?: string;
  /** How many times the code can be used, or `unlimited`. Only while `ready`. */
  allowed?: number | "unlimited";
  /** How many times it has been used. Only while `ready`. */
  used?: number;
  /** How long it lasts once first used, in minutes. Only while `ready`. */
  lastsMinutes?: number;
  /** Once used, the minutes it has left. */
  leftMinutes?: number;
  /** When the code was made, formatted against the card's clock. */
  created?: string;
  /** When Home Assistant last fetched the codes, formatted. */
  lastUpdated?: string;
  /** While it is unavailable, when it was last reachable: the `lastSeen` option. */
  lastSeen?: string;
}
