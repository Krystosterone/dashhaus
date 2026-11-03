import { useState } from "react";
import { useHaLock } from "@dashhaus/core";

/**
 * Lock on one press; unlock only after asking, with the code when the lock wants one. The handlers never reject: they
 * answer "done", "wrong_code" or "failed", so each outcome gets its own words.
 */
export function FrontDoor({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaLock(entityId);
  const [asking, setAsking] = useState(false);
  const [code, setCode] = useState("");
  const [answer, setAnswer] = useState("");

  async function unlock() {
    const outcome = await actions.onUnlock(entity.codeFormat ? code : undefined);
    setAnswer(outcome === "wrong_code" ? "Wrong code." : outcome === "failed" ? "Home Assistant didn't take it. Try again." : "");
    if (outcome === "done") setAsking(false);
    setCode("");
  }

  if (entity.state === "unavailable") return <p>{entity.name} is unavailable</p>;
  if (entity.state !== "locked") return <button type="button" onClick={() => void actions.onLock()}>Lock {entity.name}</button>;
  if (!asking) return <button type="button" onClick={() => setAsking(true)}>Unlock {entity.name}…</button>;
  return (
    <form onSubmit={(event) => { event.preventDefault(); void unlock(); }}>
      <p>Unlock {entity.name}? Anyone at the door can open it.</p>
      {entity.codeFormat && (
        <label>
          Code
          <input type="password" inputMode={entity.codeFormat === "number" ? "numeric" : "text"} autoComplete="off" value={code} onChange={(event) => setCode(event.currentTarget.value)} />
        </label>
      )}
      <button type="button" onClick={() => setAsking(false)}>Cancel</button>
      <button type="submit">Unlock</button>
      <p role="status">{answer}</p>
    </form>
  );
}
