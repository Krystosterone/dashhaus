import { useState } from "react";
import { useHaAlarm } from "@dashhaus/core";

/**
 * Arm away, with the code when the panel asks for one. The handler answers false for a wrong code and rejects when
 * the call didn't go through, so each outcome gets its own words.
 */
export function ArmAway({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaAlarm(entityId, { loadHistory: false });
  const [code, setCode] = useState("");
  const [answer, setAnswer] = useState("");
  const needsCode = entity.codeFormat != null && entity.codeArmRequired !== false;

  async function arm() {
    try {
      const accepted = await actions.onArm("away", needsCode ? code : undefined);
      setAnswer(accepted ? "Arming…" : "Wrong code.");
    } catch {
      setAnswer("Home Assistant didn't take it. Try again.");
    }
    setCode("");
  }

  if (!entity.modes.includes("away")) return null;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void arm();
      }}
    >
      {needsCode && (
        <label>
          Code
          <input
            type="password"
            inputMode={entity.codeFormat === "number" ? "numeric" : "text"}
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.currentTarget.value)}
          />
        </label>
      )}
      <button type="submit" disabled={entity.state !== "disarmed"}>
        Arm away
      </button>
      <p role="status">{answer}</p>
    </form>
  );
}
