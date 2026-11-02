import { useState } from "react";
import { useHaLight } from "@dashhaus/core";
import type { HaActionError } from "@dashhaus/core";

/** Words for a refused or failed action, chosen by its code, never by its message. */
function explain(error: HaActionError): string {
  switch (error.code) {
    case "not_connected":
      return "Not connected to Home Assistant. Try again in a moment.";
    case "service_failed":
      return "Home Assistant refused that.";
    case "transport_unknown":
      return "The connection dropped mid-way, so it may or may not have happened.";
    case "unsupported":
      return "This light can't do that.";
    case "invalid_input":
      return "That value is out of range.";
  }
}

export function LampWithErrors({ entityId }: { entityId: string }) {
  const [problem, setProblem] = useState<string>();
  const { entity, actions } = useHaLight(entityId, { onActionError: (error) => setProblem(explain(error)) });
  return (
    <div>
      <button type="button" aria-pressed={entity.state === "on"} onClick={actions.onToggle}>
        {entity.name}
      </button>
      {problem && <p role="alert">{problem}</p>}
    </div>
  );
}
