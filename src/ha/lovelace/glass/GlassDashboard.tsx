import { useState } from "react";
import { useHaSelector, useHaStore } from "../../provider";
import { HaClimate, HaLight, HaToggle, HaWeather } from "../../headless";
import { GlassButton, GlassGrid, GlassHeader, GlassNotice, GlassPage, RoomBar } from "../../../glass/ui";
import type { Room } from "../../../glass/ui";
import { GlassClimateCard } from "../../../glass/ClimateCard";
import { GlassLightCard } from "../../../glass/LightCard";
import { GlassToggleCard } from "../../../glass/ToggleCard";
import { GlassWeatherCard } from "../../../glass/WeatherCard";
import { actionMessage } from "../actionMessage";
import type { GlassCardConfig } from "./config";

/** A configured card with its area resolved, from the YAML or Home Assistant's registries. */
export type GlassItem = GlassCardConfig;

const HOME: Room = { id: "home", name: "Home" };

/**
 * One card, live. Glass draws no Today history, so none is read; the weather still reads its forecasts.
 * The entity's area comes from the item, so the subtitle and the room bar agree.
 */
function LiveCard({ item }: { item: GlassItem }) {
  const live = { entityId: item.entity, name: item.name, area: item.area, loadHistory: false };
  switch (item.kind) {
    case "light":
      return <HaLight {...live}>{(l) => <GlassLightCard entity={l.entity} {...l.actions} size={item.size} />}</HaLight>;
    case "climate":
      return <HaClimate {...live}>{(c) => <GlassClimateCard entity={c.entity} {...c.actions} size={item.size} />}</HaClimate>;
    case "toggle":
      return (
        <HaToggle {...live} domain={item.entity.startsWith("switch.") ? "switch" : "input_boolean"} icon={item.icon}>
          {(t) => <GlassToggleCard entity={t.entity} {...t.actions} size={item.size} />}
        </HaToggle>
      );
    case "weather":
      return <HaWeather entityId={item.entity} name={item.name} loadHistory={false}>{(w) => <GlassWeatherCard entity={w.entity} daily={w.daily} size={item.size} />}</HaWeather>;
  }
}

/** The latest command Home Assistant rejected, with Retry when repeating it is safe, and Dismiss. */
function ActionNotice() {
  const store = useHaStore();
  const error = useHaSelector((snapshot) => snapshot.lastActionError);
  const entity = useHaSelector((snapshot) => (error?.entityId ? snapshot.entities[error.entityId] : undefined));
  const [retrying, setRetrying] = useState(false);
  const canRetry = store.canRetryLastAction?.() === true;
  const message = actionMessage(error, entity, canRetry);
  if (!message) return null;
  return (
    <GlassNotice label="Home Assistant action failed" title={message.title} detail={message.detail}>
      {canRetry && (
        <GlassButton disabled={retrying} onClick={() => {
          setRetrying(true);
          void store.retryLastAction?.().catch(() => undefined).finally(() => setRetrying(false));
        }}>{retrying ? "Retrying…" : "Retry"}</GlassButton>
      )}
      <GlassButton onClick={() => store.clearActionError?.()}>Dismiss</GlassButton>
    </GlassNotice>
  );
}

export interface GlassDashboardProps {
  title: string;
  /** The greeting's name. */
  name?: string;
  items: GlassItem[];
  /** Fixed clock for screenshots; live otherwise. */
  now?: Date;
}

/**
 * The glass page drawn from the card's config: the greeting and title, Home's cards, and a room bar of the
 * areas the cards are in, each narrowing the grid to its own. It needs an `HaProvider` above it.
 */
export function GlassDashboard({ title, name, items, now }: GlassDashboardProps) {
  // Home already shows every card, so an area that is also called Home gets no room of its own.
  const areas = [...new Set(items.flatMap((i) => (i.area && i.area.trim().toLowerCase() !== "home" ? [i.area] : [])))].sort((a, b) => a.localeCompare(b));
  const rooms: Room[] = [HOME, ...areas.map((a) => ({ id: `area:${a}`, name: a }))];
  const [picked, setRoom] = useState(HOME.id);
  // A room that left the config (or the registry) falls back to Home.
  const room = rooms.some((r) => r.id === picked) ? picked : HOME.id;
  const shown = room === HOME.id ? items : items.filter((i) => `area:${i.area}` === room);
  return (
    <GlassPage bar={<><ActionNotice />{rooms.length > 1 && <RoomBar rooms={rooms} current={room} onPick={setRoom} />}</>}>
      <GlassHeader title={title} name={name} now={now} />
      <GlassGrid label={rooms.find((r) => r.id === room)?.name ?? HOME.name}>
        {shown.map((item) => <LiveCard key={item.entity} item={item} />)}
      </GlassGrid>
    </GlassPage>
  );
}
