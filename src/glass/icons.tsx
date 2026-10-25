/* Glass icons: 24-unit strokes in currentColor, decorative (the card's name carries the meaning). */
const P = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const IconPower = () => <svg {...P} strokeWidth={2}><path d="M12 3.5v8" /><path d="M7.1 6.6a7 7 0 1 0 9.8 0" /></svg>;
export const IconAirConditioner = () => <svg {...P}><rect x="3" y="5" width="18" height="8" rx="2" /><path d="M7 10h10" /><path d="M8 16.5c0 1.2-1 1.6-1 2.8M12 16.5c0 1.2-1 1.6-1 2.8M16 16.5c0 1.2-1 1.6-1 2.8" /></svg>;
export const IconTv = () => <svg {...P}><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M9 20.5h6" /></svg>;
export const IconSpeaker = () => <svg {...P}><path d="M6.5 9.5h-2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h2l4.5 4v-13Z" /><path d="M15 9a4 4 0 0 1 0 6M17.8 6.5a7.5 7.5 0 0 1 0 11" /></svg>;
export const IconRouter = () => <svg {...P}><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 13V5M17 13V5M12 13V8" /><path d="M7 16.5h.01M10.5 16.5h.01" /></svg>;
export const IconBulb = () => <svg {...P}><path d="M9 17.5h6M10 20.5h4" /><path d="M8.2 14.2A6 6 0 1 1 15.8 14.2c-.7.6-.8 1.3-.8 2.3H9c0-1-.1-1.7-.8-2.3Z" /></svg>;
export const IconWeather = () => <svg {...P}><path d="M12 3v1.5M5.6 5.6l1 1M3 12h1.5M17.4 6.6l1-1" /><path d="M8.5 11a3.5 3.5 0 0 1 6.8-1.2" /><path d="M8 20h9a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 8 20Z" /></svg>;
