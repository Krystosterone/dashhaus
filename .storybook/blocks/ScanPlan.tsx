import type { CSSProperties } from "react";

/*
 * The plan of the scan-task comparison (issues #186 and #188), shared by Orb's and Field's Foundations → Scan task so
 * both skins draw the same pages and the facilitator's order is computed from the pages it names, never copied.
 *
 * Every page is one house: the living room, then the problem's room, then the dining room and the driveway, which carry
 * the advisory states a "yes" on is a false alarm (a smoke detector's low battery, the garage door left open). The
 * problem's room holds the same lamp each time (a warm 80 % ceiling light, the card the urgency factor damps) right
 * beside the urgent card, above it or below it, so the problem is always the same distance from the lamp and, for each
 * direction, the same depth in the page. What changes is which card it is and which room it is in, so no participant
 * finds the same problem twice: each device has six of its own, and page 7 is the catch page, nothing urgent at all.
 *
 * Orb's conditions are the urgency factor (×1, ×0.5, ×0.25) without and with the urgency strip; Field draws each page
 * once. A story is named by codes alone (Phone 3C), so its name never gives the answer or the condition away.
 */

export type ScanDevice = "phone" | "wall";
export type ScanProblem = "leak" | "jammed" | "vacuum" | "sockOff";

/** One study page: the room the problem is in, the urgent card there and its name, and where the lamp is. */
export interface ScanPage {
  room: string;
  problem: ScanProblem;
  name: string;
  lamp: "above" | "below";
}

/** Pages 1 to 6 of each device; each problem a different card or room from every other, on either device. */
export const SCAN_PAGES: Record<ScanDevice, readonly ScanPage[]> = {
  phone: [
    { room: "Kitchen", problem: "leak", name: "Under the sink", lamp: "above" },
    { room: "Garage", problem: "jammed", name: "Garage side door", lamp: "below" },
    { room: "Bedroom", problem: "vacuum", name: "Bedroom vacuum", lamp: "above" },
    { room: "Nursery", problem: "sockOff", name: "Nova", lamp: "below" },
    { room: "Hall", problem: "jammed", name: "Front door", lamp: "above" },
    { room: "Bathroom", problem: "leak", name: "Under the basin", lamp: "below" },
  ],
  wall: [
    { room: "Laundry", problem: "leak", name: "Washing machine", lamp: "below" },
    { room: "Mudroom", problem: "jammed", name: "Back door", lamp: "above" },
    { room: "Office", problem: "vacuum", name: "Office vacuum", lamp: "below" },
    { room: "Kids' room", problem: "sockOff", name: "Ben", lamp: "above" },
    { room: "Garden", problem: "jammed", name: "Side gate", lamp: "below" },
    { room: "Basement", problem: "leak", name: "Water heater", lamp: "above" },
  ],
};

/** Page 7: the lamp above a door that is open (a state, not a warning) in the den, and only the advisories elsewhere. */
export const SCAN_CATCH = { page: 7, room: "Den" } as const;

/** Orb's six conditions, by code. */
export const SCAN_CONDITIONS = [
  { code: "A", underAlert: 1, strip: false },
  { code: "B", underAlert: 0.5, strip: false },
  { code: "C", underAlert: 0.25, strip: false },
  { code: "D", underAlert: 1, strip: true },
  { code: "E", underAlert: 0.5, strip: true },
  { code: "F", underAlert: 0.25, strip: true },
] as const;
export type ScanCondition = (typeof SCAN_CONDITIONS)[number]["code"];

/** The first row of a Williams design for six: each condition follows each other once across six rows. */
const WILLIAMS = [0, 1, 5, 2, 4, 3];

/** One trial: a page, and on Orb its condition; the catch page has none, as nothing on it is urgent. */
export interface ScanTrial { page: number; condition?: ScanCondition }

/**
 * What participant `n` (from 1) is shown on a device, in order. Conditions run down a Williams square, the wall's
 * three rows on from the phone's, so a participant's two devices differ. The pages go 1 to 6 for participants 1 to 6
 * and 6 to 1 for 7 to 12, so across six participants each page meets each condition once, and across twelve it sits
 * early once and late once. The catch page moves one place on per participant: participants 1 to 7 each meet it in
 * a different position. Field takes the same pages in the same order, with no condition.
 */
export function scanOrder(n: number, device: ScanDevice, skin: "orb" | "field" = "orb"): ScanTrial[] {
  const row = (n - 1 + (device === "wall" ? 3 : 0)) % 6;
  const reversed = Math.floor((n - 1) / 6) % 2 === 1;
  const trials: ScanTrial[] = WILLIAMS.map((first, position) => ({
    page: reversed ? 6 - position : position + 1,
    ...(skin === "orb" ? { condition: SCAN_CONDITIONS[(first + row) % 6].code } : {}),
  }));
  trials.splice((n - 1) % 7, 0, { page: SCAN_CATCH.page });
  return trials;
}

/** A story's name: its device and codes, nothing more. */
export const scanStoryName = (device: ScanDevice, page: number, condition?: ScanCondition) =>
  `${device === "phone" ? "Phone" : "Wall panel"} ${page}${condition ?? ""}`;

const PARTICIPANTS = 12;

const sheet: CSSProperties = { padding: 24, maxWidth: 1100, font: "14px/1.45 system-ui, sans-serif", color: "#1a1a1a", background: "#fff" };
const table: CSSProperties = { borderCollapse: "collapse", margin: "8px 0 24px" };
const cell: CSSProperties = { border: "1px solid #b8b8b8", padding: "4px 10px", textAlign: "left", whiteSpace: "nowrap" };

const LEVEL: Record<ScanProblem, string> = { leak: "a leak", jammed: "a jammed lock", vacuum: "a vacuum stopped with an error", sockOff: "a sock that slipped off" };

/**
 * The facilitator's sheet: what each page holds (the answer, so never shown to a participant), Orb's conditions, and
 * each participant's order on each device. Open a trial's story by its code, its canvas full screen.
 */
export function ScanOrder({ skin }: { skin: "orb" | "field" }) {
  const devices: ScanDevice[] = ["phone", "wall"];
  return (
    <article style={sheet}>
      <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Scan task: the facilitator's order</h1>
      <p>
        Ask each participant "Is anything at home that needs you?" on every page, in the order below: time to the urgent card, and note a
        miss and a "yes" on the catch page (a false alarm on the advisories). Open each page by its code, its canvas full screen, so neither
        its name nor its condition shows. Odd participants start on the phone, even ones on the wall panel.
        {skin === "field"
          ? " Field's pages are Orb's, drawn once each, so run Field in a separate session from Orb, and alternate which skin a participant meets first."
          : " Field → Foundations → Scan task has the same pages; run it in a separate session, alternating which skin comes first."}
      </p>
      {skin === "orb" && (
        <>
          <h2 style={{ fontSize: 17, margin: "16px 0 4px" }}>Conditions</h2>
          <table style={table}>
            <thead><tr><th style={cell}>Code</th><th style={cell}>Urgency factor</th><th style={cell}>Urgency strip</th></tr></thead>
            <tbody>
              {SCAN_CONDITIONS.map((c) => (
                <tr key={c.code}><td style={cell}>{c.code}</td><td style={cell}>×{c.underAlert}</td><td style={cell}>{c.strip ? "Shown" : "None"}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {devices.map((device) => (
        <section key={device}>
          <h2 style={{ fontSize: 17, margin: "16px 0 4px" }}>{device === "phone" ? "Phone, 390 × 844" : "Wall panel, 1280 × 800"}</h2>
          <table style={table}>
            <caption style={{ textAlign: "left", padding: "4px 0" }}>The pages, and where each one's problem is</caption>
            <thead><tr><th style={cell}>Page</th><th style={cell}>Room</th><th style={cell}>Urgent card</th><th style={cell}>The lamp</th></tr></thead>
            <tbody>
              {SCAN_PAGES[device].map((p, i) => (
                <tr key={i}><td style={cell}>{i + 1}</td><td style={cell}>{p.room}</td><td style={cell}>{p.name}, {LEVEL[p.problem]}</td><td style={cell}>{p.lamp} it</td></tr>
              ))}
              <tr><td style={cell}>{SCAN_CATCH.page}</td><td style={cell}>{SCAN_CATCH.room}</td><td style={cell}>None: the catch page</td><td style={cell}>above an open door</td></tr>
            </tbody>
          </table>
          <table style={table}>
            <caption style={{ textAlign: "left", padding: "4px 0" }}>Each participant's order</caption>
            <thead>
              <tr><th style={cell}>Participant</th>{Array.from({ length: 7 }, (_, i) => <th key={i} style={cell}>{i + 1}</th>)}</tr>
            </thead>
            <tbody>
              {Array.from({ length: PARTICIPANTS }, (_, i) => (
                <tr key={i}>
                  <th scope="row" style={cell}>{i + 1}</th>
                  {scanOrder(i + 1, device, skin).map((t, j) => <td key={j} style={cell}>{scanStoryName(device, t.page, t.condition)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p>
        Six participants complete the square{skin === "orb" ? ": each page under each condition once" : ""}; twelve run it twice, the pages
        reversed. With eight, the last two rows are incomplete, so their results are read with that imbalance.
      </p>
    </article>
  );
}
