import type { ReactNode } from "react";
import { Ha__Skin__LightCard } from "../ha/Ha__Skin__LightCard";
import { Ha__Skin__SensorCard } from "../ha/Ha__Skin__SensorCard";
import type { CardConfig, CardKind } from "./config";

/** The one place an entity id becomes a connected card. Add a domain here and the automatic layout draws it. */
const CARDS: Record<CardKind, (card: CardConfig) => ReactNode> = {
  light: (card) => <Ha__Skin__LightCard entityId={card.entity} name={card.name} area={card.area} />,
  sensor: (card) => <Ha__Skin__SensorCard entityId={card.entity} name={card.name} area={card.area} />,
};

export function renderCard(card: CardConfig): ReactNode {
  return CARDS[card.card](card);
}
