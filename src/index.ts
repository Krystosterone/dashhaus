import "./styles/tokens.css";

// Shared
export { Orb, CardTitle, CircleButton, SheetClose, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, Sheet, fmtDuration, fmt1, paint, COLORS } from "./shared/ui";
export { useCard, detailsSheet, detailsTile, normalizeReadings } from "./shared/ui";
export type { HourSample, ChoiceOption, SlotColor, ColorName, ColorProp, Role, WidgetFootprint, CardProps, SheetProps, TileProps, Reading } from "./shared/ui";
export { useLongPress } from "./shared/useLongPress";
export { useTrack, trackPos } from "./shared/useTrack";
export { useNow } from "./shared/useNow";

// Home Assistant integration: what a host needs to connect tiles. Mappers, handler factories and
// history parsers for custom containers live in ./ha.
export { HaActionError } from "./ha";
export { createHaStore, connectHomeAssistant, createHomeAssistantTransport } from "./ha";
export { HaProvider, useHaStore, useHaSnapshot, useHaSelector, useHaEntity, useHaStatus, useHaGeneration } from "./ha";
export { HaLightTile, HaClimateTile, HaSensorTile, HaWeatherTile, HaCoverTile, HaToggleTile, HaAlarmTile } from "./ha";
export type {
  HassEntity,
  HassEntities,
  HaTransport,
  HaStore,
  HaSnapshot,
  HaConnectionStatus,
  HaActionErrorCode,
  HaServiceCallOptions,
  HomeAssistantTransport,
  HaProviderProps,
  HaLightTileProps,
  HaClimateTileProps,
  HaSensorTileProps,
  HaWeatherTileProps,
  HaCoverTileProps,
  HaToggleTileProps,
  HaAlarmTileProps,
} from "./ha";

// Header
export { HeaderWidget } from "./widgets/header/HeaderWidget";
export type { HeaderWidgetProps } from "./widgets/header/HeaderWidget";

// Light
export { LightWidget, LightSheet } from "./widgets/light/LightWidget";
export type { LightWidgetProps, LightSheetProps } from "./widgets/light/LightWidget";
export { LightTile } from "./widgets/light/LightTile";
export type { LightTileProps } from "./widgets/light/LightTile";
export type { LightEntity, LightHistory, LightState } from "./widgets/light/types";
export { kelvinToLch, kelvinName, lampColor } from "./widgets/light/kelvin";

// Climate
export { ClimateWidget, ClimateSheet } from "./widgets/climate/ClimateWidget";
export type { ClimateWidgetProps, ClimateSheetProps } from "./widgets/climate/ClimateWidget";
export { ClimateTile } from "./widgets/climate/ClimateTile";
export type { ClimateTileProps } from "./widgets/climate/ClimateTile";
export type { ClimateEntity, ClimateHistory, HvacMode, HvacAction } from "./widgets/climate/types";

// Sensor
export { SensorWidget, SensorSheet } from "./widgets/sensor/SensorWidget";
export type { SensorWidgetProps, SensorSheetProps } from "./widgets/sensor/SensorWidget";
export { SensorTile } from "./widgets/sensor/SensorTile";
export type { SensorTileProps } from "./widgets/sensor/SensorTile";
export type { SensorEntity, SensorHistory } from "./widgets/sensor/types";

// Weather (outdoor conditions)
export { WeatherWidget, WeatherSheet } from "./widgets/weather/WeatherWidget";
export type { WeatherWidgetProps, WeatherSheetProps } from "./widgets/weather/WeatherWidget";
export { WeatherTile } from "./widgets/weather/WeatherTile";
export type { WeatherTileProps } from "./widgets/weather/WeatherTile";
export type { WeatherEntity, WeatherHistory, HourlyForecast, DailyForecast, Condition } from "./widgets/weather/types";

// Toggle (modes)
export { ToggleWidget, ToggleSheet, DEFAULT_DURATIONS } from "./widgets/toggle/ToggleWidget";
export type { ToggleWidgetProps, ToggleSheetProps } from "./widgets/toggle/ToggleWidget";
export { ToggleTile } from "./widgets/toggle/ToggleTile";
export type { ToggleTileProps } from "./widgets/toggle/ToggleTile";
export type { ToggleEntity, ToggleHistory, ToggleIcon, DurationOption } from "./widgets/toggle/types";

// Cover (curtains, blinds, shades, garage doors)
export { CoverWidget, CoverSheet } from "./widgets/cover/CoverWidget";
export type { CoverWidgetProps, CoverSheetProps } from "./widgets/cover/CoverWidget";
export { CoverTile } from "./widgets/cover/CoverTile";
export type { CoverTileProps } from "./widgets/cover/CoverTile";
export type { CoverEntity, CoverHistory, CoverClass } from "./widgets/cover/types";

// Alarm (security panel)
export { AlarmWidget, AlarmSheet } from "./widgets/alarm/AlarmWidget";
export type { AlarmWidgetProps, AlarmSheetProps } from "./widgets/alarm/AlarmWidget";
export { AlarmTile } from "./widgets/alarm/AlarmTile";
export type { AlarmTileProps } from "./widgets/alarm/AlarmTile";
export type { AlarmEntity, AlarmHistory, AlarmMode, AlarmState, AlarmAction } from "./widgets/alarm/types";
export type { AlarmResult } from "./widgets/alarm/AlarmWidget";
// Owlet
export { OwletWidget, OwletSheet } from "./widgets/owlet/OwletWidget";
export type { OwletWidgetProps, OwletSheetProps } from "./widgets/owlet/OwletWidget";
export { OwletTile } from "./widgets/owlet/OwletTile";
export type { OwletTileProps } from "./widgets/owlet/OwletTile";
export type { OwletEntity, OwletHistory, SleepState } from "./widgets/owlet/types";
export { HaOwletTile } from "./ha";
export type { HaOwletTileProps } from "./ha";

export { JoinedBundle, LeadBundle } from "./bundles/Bundle";
export { SheetExtra } from "./shared/ui";

// Dashboard layout
export { DashboardPage, Section, Columns, WidgetGrid, Cell } from "./dashboards/layout";
export type { DashboardPageProps } from "./dashboards/layout";
