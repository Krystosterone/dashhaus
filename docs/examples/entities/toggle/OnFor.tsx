import { useEffect, useState } from "react";
import { useHaToggle } from "@dashhaus/core";

/**
 * "On for an hour". Home Assistant has no timed-on service for an input_boolean or a switch, so the timer is yours:
 * this one turns the mode off again from the page, and only while the page stays open.
 */
export function OnForAnHour({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaToggle(entityId, { loadHistory: false });
  const [until, setUntil] = useState<number>();
  const on = entity.state === "on";

  useEffect(() => {
    if (until == null || !on) return;
    const timer = setTimeout(() => {
      actions.onToggle();
      setUntil(undefined);
    }, until - Date.now());
    return () => clearTimeout(timer);
  }, [until, on, actions]);

  return (
    <button
      type="button"
      disabled={on || entity.state === "unavailable"}
      onClick={() => {
        actions.onToggle();
        setUntil(Date.now() + 60 * 60 * 1000);
      }}
    >
      {entity.name} for an hour
    </button>
  );
}
