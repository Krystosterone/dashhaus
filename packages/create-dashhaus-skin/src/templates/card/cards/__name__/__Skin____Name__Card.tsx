import type { ReactNode } from "react";
import type { __Name__Entity, __Name__History } from "@dashhaus/core/entities/__name__/types";
import { __actionImport____Skin__CardFrame } from "../../shared/ui";
import type { __Skin__Footprint } from "../../shared/ui";
import { Icon__Name__ } from "./icons";
import "./__Skin____Name__Card.css";

export interface __Skin____Name__CardProps {
  entity: __Name__Entity;
  history?: __Name__History;
  footprint?: __Skin__Footprint;
  defaultOpen?: boolean;
__actionProps__
}

const stateWords = (state: string) => state.replace(/[_-]+/g, " ");

/** Neutral __Section__ baseline for one __label__ entity. Replace its visual language without changing its domain contract. */
export function __Skin____Name__Card({ entity: e, history, footprint = "standard", defaultOpen = false__actionArgs__ }: __Skin____Name__CardProps) {
__unavailableConst__
  const summary: ReactNode = __summary__;
  const area = "area" in e && typeof e.area === "string" ? e.area : undefined;
  const lastSeen = "lastSeen" in e && typeof e.lastSeen === "string" ? e.lastSeen : undefined;
__actionsBlock__
  return (
    <__Skin__CardFrame name={e.name} area={area} state={e.state} summary={summary} icon={<Icon__Name__ />} footprint={footprint}__actionsProp__ defaultOpen={defaultOpen}>
      <dl className="__skin__-__name__-facts">
        <div><dt>State</dt><dd>{stateWords(e.state)}</dd></div>
        <div><dt>Entity</dt><dd>{e.entityId}</dd></div>
        {lastSeen && <div><dt>Last seen</dt><dd>{lastSeen}</dd></div>}
      </dl>
      {history && <p className="__skin__-__name__-history">Today’s history is connected and ready for a domain-specific drawing.</p>}
    </__Skin__CardFrame>
  );
}
