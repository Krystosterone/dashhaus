/**
 * A lock's code, from Home Assistant's `code_format`: a regular expression the code must match (`^\d{4,6}$`), not
 * the alarm's "number" or "text". Pure: every skin's keypad and the actions read it the same way.
 */

/** The pattern, compiled; nothing when there is none or it isn't a pattern this runtime can compile. */
export function codeRegExp(pattern: string | undefined): RegExp | undefined {
  if (!pattern) return undefined;
  try {
    return new RegExp(pattern);
  } catch {
    return undefined;
  }
}

/**
 * The keypad a pattern asks for: "number" when it can only ever match digits (`^\d{4}$`, `^[0-9]+$`), "text" for
 * anything else, so a pattern that allows letters gets a keyboard. Nothing when there is no code.
 */
export function codeKind(pattern: string | undefined): "number" | "text" | undefined {
  if (!pattern) return undefined;
  // Strip the anchors and quantifiers; what remains must be digit classes only.
  const body = pattern.replace(/^\^/, "").replace(/\$$/, "").replace(/\{\d+(,\d*)?\}|[+*?]/g, "");
  return /^(?:\\d|\[0-9\])+$/.test(body) ? "number" : "text";
}

/** Whether a code can be what the lock asks for. No pattern, or one this runtime can't compile, lets Home Assistant judge. */
export function codeFits(pattern: string | undefined, code: string): boolean {
  const re = codeRegExp(pattern);
  return re == null || re.test(code);
}
