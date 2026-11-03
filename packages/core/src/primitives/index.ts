/** Headless interaction primitives: behaviour and semantics, no markup or styles. */
export { useKeypad } from "./keypad";
export type { KeypadOptions } from "./keypad";
export { usePress } from "./press";
export type { PressOptions } from "./press";
export { useSheet } from "./sheet";
export type { SheetOptions } from "./sheet";
export { rangeKeyValue, trackPos, useRangeSlider, useSlider } from "./slider";
export type { RangeSliderOptions, SliderOptions } from "./slider";
export { actionKey, guardedOutcome, useGuardedAction } from "./guarded";
export type { GuardedActionOptions, GuardedOutcome, GuardedResult } from "./guarded";
