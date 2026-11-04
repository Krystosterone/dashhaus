import { useEffect, useRef, useState } from "react";

/** The longest code a keypad takes. */
const MAX = 12;

export interface KeypadOptions {
  /** Letters as well as digits (Home Assistant's `code_format: text`). */
  text?: boolean;
  /**
   * Try the code. May answer later (Home Assistant does): the keypad is busy until it does. True: accepted. False: a
   * wrong code, cleared for another try. A throw: it didn't go through, and the code stays, so Enter tries again.
   */
  onSubmit: (code: string) => boolean | Promise<boolean>;
}

/**
 * A code keypad's behaviour, for any skin to draw: the code typed so far, a digit key's press, delete, enter, and the
 * answer (busy, then a wrong code or a failed call). A physical keyboard types too: digits (and letters for a text
 * code), Backspace, and Enter, which submits unless it lands on a button outside the keypad with nothing typed.
 * Spread `rootProps` onto the keypad's root: it takes focus when it appears inside an open dialog, and a dialog
 * that is opening focuses it through `data-autofocus`.
 *
 * A text code can't be typed on the digit keys, and a touch screen has no physical keyboard, so a text keypad also
 * draws a real input: spread `inputProps` onto an `<input>`. It takes the focus in the root's place, so a phone or a
 * wall panel brings up its own keyboard, and Enter in it submits. The digit keys still type into the same code.
 */
export function useKeypad({ text, onSubmit }: KeypadOptions) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<"wrong" | "failed" | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const target = input.current ?? root.current;
    if (target?.closest("dialog")?.open) target.focus();
  }, []);

  const submit = async () => {
    if (!code || busy) return;
    setBusy(true);
    let result: "ok" | "wrong" | "failed";
    try { result = (await onSubmit(code)) ? "ok" : "wrong"; } catch { result = "failed"; }
    if (!alive.current) return;
    setBusy(false);
    if (result === "ok") return;
    setError(result);
    if (result === "wrong") setCode("");
  };
  const press = (k: string) => { if (busy) return; setError(null); setCode((c) => (c.length >= MAX ? c : c + k)); };
  const back = () => { if (busy) return; setError(null); setCode((c) => c.slice(0, -1)); };
  /** The whole code, as a text input has it after a keystroke or a paste. */
  const type = (value: string) => { if (busy) return; setError(null); setCode(value.slice(0, MAX)); };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      // Inside Home Assistant the keypad is in a shadow root, where `target` is its host at the document: the path says
      // which element the key really went to, or the input's Enter submits twice.
      const target = ev.composedPath()[0] ?? ev.target;
      if (target instanceof HTMLInputElement) return;
      const onButton = target instanceof HTMLButtonElement;
      if (/^[0-9]$/.test(ev.key) || (text && /^[a-z]$/i.test(ev.key))) { ev.preventDefault(); press(ev.key); }
      else if (ev.key === "Backspace") { ev.preventDefault(); back(); }
      else if (ev.key === "Enter" && !onButton) { ev.preventDefault(); void submit(); }
      else if (ev.key === "Enter" && onButton && !root.current?.contains(target as Node) && code) { ev.preventDefault(); void submit(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const inputProps = text ? {
    ref: input,
    type: "password",
    value: code,
    readOnly: busy,
    autoComplete: "off",
    autoCapitalize: "off",
    autoCorrect: "off",
    spellCheck: false,
    enterKeyHint: "go",
    maxLength: MAX,
    "data-autofocus": true,
    onChange: (ev: { currentTarget: HTMLInputElement }) => type(ev.currentTarget.value),
    onKeyDown: (ev: { key: string; preventDefault: () => void }) => { if (ev.key === "Enter") { ev.preventDefault(); void submit(); } },
  } as const : undefined;

  return {
    code, error, busy, press, back, type, submit, inputProps,
    rootProps: { ref: root, tabIndex: -1, "data-autofocus": text ? undefined : true } as const,
  };
}
