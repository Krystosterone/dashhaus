import { useState } from "react";
import { useHaGuestWifi } from "@dashhaus/core";

/** Make a new code: the handler answers once Home Assistant has, by when the new code is in. */
export function NewCode({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaGuestWifi(entityId);
  const [waiting, setWaiting] = useState(false);
  if (!actions.onNewCode) return null;
  const make = () => {
    setWaiting(true);
    void actions.onNewCode!().finally(() => setWaiting(false));
  };
  return (
    <button type="button" disabled={waiting} onClick={make}>
      {waiting ? "Making a code…" : entity.code ? `New code (now ${entity.code})` : "Make a code"}
    </button>
  );
}
