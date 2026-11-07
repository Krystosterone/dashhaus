/**
 * Demo pictures every skin's camera and media stories share, and the demo transports serve for an entity's
 * `entity_picture`: local, inline SVG, so a story or a demo never fetches the network. Drawn here as a camera or a
 * record sleeve would show them (a camera's stamp burnt into its still); pictures, not colours a skin draws, so a
 * skin's colour rules don't apply to them. Add a picture a card needs here, never in a card folder.
 */
const uri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
const svg = (w: number, h: number, body: string) => uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`);
/** A camera's stamp, burnt into the still's corner as cameras do. */
const stamp = (w: number, text: string, ink = "#fff") =>
  `<text x="${w - 14}" y="24" text-anchor="end" font-family="monospace" font-size="15" fill="${ink}" fill-opacity="0.85">${text}</text>`;

/** A doorbell's still by day, 16:9: the step, the door, a parcel on the mat. */
export const PICTURE_DOORSTEP = svg(640, 360, [
  `<rect width="640" height="360" fill="#b9b2a6"/>`,
  `<rect y="250" width="640" height="110" fill="#8d877d"/>`,
  `<rect x="0" y="0" width="150" height="250" fill="#a39c90"/>`,
  `<rect x="236" y="40" width="168" height="214" fill="#3f4a52"/>`,
  `<rect x="250" y="56" width="140" height="80" fill="#4d5961"/>`,
  `<rect x="250" y="150" width="140" height="90" fill="#4d5961"/>`,
  `<circle cx="380" cy="160" r="6" fill="#c9b37a"/>`,
  `<rect x="214" y="254" width="212" height="22" fill="#6f695f"/>`,
  `<rect x="250" y="268" width="140" height="28" rx="3" fill="#5b5248"/>`,
  `<rect x="420" y="214" width="78" height="56" fill="#b48a5a"/>`,
  `<rect x="420" y="214" width="78" height="10" fill="#9c764b"/>`,
  `<rect x="452" y="214" width="12" height="56" fill="#d8c7a6"/>`,
  `<path d="M520 120c18-30 46-30 64 0v130h-64z" fill="#6b7a5a"/>`,
  `<rect x="540" y="250" width="24" height="10" fill="#5a4a3a"/>`,
  stamp(640, "2026-11-07 14:32:05  FRONT DOOR"),
].join(""));

/** A nursery camera's still at night, 16:9, in infrared greys: the cot, its bars, a sleeping lump, the mobile. */
export const PICTURE_NURSERY = svg(640, 360, [
  `<defs><radialGradient id="v" cx="0.5" cy="0.55" r="0.75"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.65"/></radialGradient></defs>`,
  `<rect width="640" height="360" fill="#3b3d3c"/>`,
  `<rect y="270" width="640" height="90" fill="#2c2e2d"/>`,
  `<rect x="150" y="140" width="340" height="150" fill="#565957"/>`,
  `<path d="M150 140h340M150 290h340" stroke="#8a8d8b" stroke-width="8"/>`,
  ...Array.from({ length: 12 }, (_, i) => `<rect x="${166 + i * 27}" y="140" width="6" height="150" fill="#7b7e7c"/>`),
  `<ellipse cx="320" cy="250" rx="96" ry="26" fill="#9a9d9b"/>`,
  `<circle cx="252" cy="240" r="20" fill="#b3b6b4"/>`,
  `<path d="M320 30v40M270 70h100" stroke="#6d706e" stroke-width="3"/>`,
  `<circle cx="270" cy="86" r="10" fill="#7f8280"/><circle cx="320" cy="92" r="10" fill="#7f8280"/><circle cx="370" cy="86" r="10" fill="#7f8280"/>`,
  `<rect width="640" height="360" fill="url(#v)"/>`,
  stamp(640, "2026-11-07 22:14:51  NURSERY  IR"),
].join(""));

/** A driveway camera's still, 21:9: the worst case for a 16:9 box, which crops its ends. */
export const PICTURE_WIDE = svg(840, 360, [
  `<rect width="840" height="360" fill="#9fb0bd"/>`,
  `<rect y="200" width="840" height="160" fill="#7b7f7a"/>`,
  `<path d="M300 360L390 200h60l90 160z" fill="#5f625e"/>`,
  `<rect x="40" y="120" width="180" height="80" fill="#c7c0b2"/><rect x="40" y="100" width="180" height="20" fill="#8a5a46"/>`,
  `<rect x="600" y="230" width="150" height="60" rx="14" fill="#2f4d6b"/><circle cx="630" cy="292" r="16" fill="#1d1f22"/><circle cx="720" cy="292" r="16" fill="#1d1f22"/>`,
  `<circle cx="12" cy="300" r="8" fill="#e0b84a"/><circle cx="828" cy="300" r="8" fill="#e0b84a"/>`,
  stamp(840, "2026-11-07 07:58:12  DRIVEWAY"),
].join(""));

/** A record sleeve, square: a low sun over three bands of field. */
export const ARTWORK_SUNDAY = svg(600, 600, [
  `<rect width="600" height="600" fill="#e9d9b8"/>`,
  `<circle cx="300" cy="300" r="150" fill="#d9643a"/>`,
  `<rect y="330" width="600" height="270" fill="#e9d9b8"/>`,
  `<rect y="360" width="600" height="60" fill="#c99a52"/>`,
  `<rect y="440" width="600" height="60" fill="#8a6a3a"/>`,
  `<rect y="520" width="600" height="80" fill="#4d3d26"/>`,
].join(""));

/** A record sleeve, square: tides in four blues. */
export const ARTWORK_TIDES = svg(600, 600, [
  `<rect width="600" height="600" fill="#123049"/>`,
  ...["#1d4f73", "#2f6f96", "#5a98b8", "#a9d0de"].map((fill, i) =>
    `<path d="M0 ${200 + i * 90}c75-40 150-40 225 0s150 40 225 0 150-40 150-40v${400 - i * 90}H0z" fill="${fill}"/>`),
].join(""));

/** A sleeve that isn't square, 3:4 (a podcast's portrait art): the worst case for a square box, which crops it. */
export const ARTWORK_TALL = svg(450, 600, [
  `<rect width="450" height="600" fill="#2b2a33"/>`,
  `<rect x="45" y="45" width="360" height="360" fill="#e4572e"/>`,
  `<rect x="45" y="440" width="360" height="26" fill="#f3efe6"/>`,
  `<rect x="45" y="486" width="220" height="18" fill="#a29f97"/>`,
].join(""));
