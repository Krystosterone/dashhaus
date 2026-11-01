import { useHaRequest } from "@dashhaus/core";

interface CoreConfig {
  location_name: string;
  version: string;
}

/**
 * Any other read: one websocket command, shared by every caller with the same key, run again on each reconnect
 * and never left over from an older connection. `cache` keeps the answer for the rest of the connection.
 */
export function AboutHome() {
  const { value, error } = useHaRequest(
    "core-config",
    (store) => store.callApi("get_config") as Promise<CoreConfig>,
    { cache: true },
  );
  if (error) return <p>Couldn't read Home Assistant's configuration.</p>;
  if (!value) return null;
  return (
    <p>
      {value.location_name}, Home Assistant {value.version}
    </p>
  );
}
