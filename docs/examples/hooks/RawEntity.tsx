import { useHaEntity } from "@dashhaus/core";

/** Any entity, raw: Home Assistant's state and attributes as they arrive, for a domain with no model yet. */
export function FirmwareNotice() {
  const update = useHaEntity("update.living_room_tv_firmware");
  if (!update || update.state !== "on") return null;
  const version = update.attributes.latest_version;
  return <p>New firmware: {typeof version === "string" ? version : "available"}</p>;
}
