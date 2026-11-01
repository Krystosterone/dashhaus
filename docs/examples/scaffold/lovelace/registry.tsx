import type { ReactNode } from "react";
import { HaMySkinLightCard } from "../ha/HaMySkinLightCard";
import { HaMySkinSensorCard } from "../ha/HaMySkinSensorCard";
import { HaMySkinCoverCard } from "../ha/HaMySkinCoverCard";
import type { CardConfig, CardKind } from "./config";

/** The one place an entity id becomes a connected card. Add a domain here and the automatic layout draws it. */
const CARDS: Record<CardKind, (card: CardConfig) => ReactNode> = {
  light: (card) => <HaMySkinLightCard entityId={card.entity} name={card.name} area={card.area} />,
  sensor: (card) => <HaMySkinSensorCard entityId={card.entity} name={card.name} area={card.area} />,
  cover: (card) => <HaMySkinCoverCard entityId={card.entity} name={card.name} area={card.area} />,
};

export function renderCard(card: CardConfig): ReactNode {
  return CARDS[card.card](card);
}
