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
 */
export function useKeypad({ text, onSubmit }: KeypadOptions) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<"wrong" | "failed" | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (root.current?.closest("dialog")?.open) root.current.focus(); }, []);

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

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement) return;
      const onButton = ev.target instanceof HTMLButtonElement;
      if (/^[0-9]$/.test(ev.key) || (text && /^[a-z]$/i.test(ev.key))) { ev.preventDefault(); press(ev.key); }
      else if (ev.key === "Backspace") { ev.preventDefault(); back(); }
      else if (ev.key === "Enter" && !onButton) { ev.preventDefault(); void submit(); }
      else if (ev.key === "Enter" && onButton && !root.current?.contains(ev.target as Node) && code) { ev.preventDefault(); void submit(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return { code, error, busy, press, back, submit, rootProps: { ref: root, tabIndex: -1, "data-autofocus": true } as const };
}
