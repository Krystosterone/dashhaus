import "./styles/tokens.css";

// Shared
export { Orb, CircleButton, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, Sheet, fmtDuration, fmt1 } from "./shared/ui";
export type { HourSample, ChoiceOption } from "./shared/ui";
export { useLongPress } from "./shared/useLongPress";
export { useTrack, trackPos } from "./shared/useTrack";
export { useNow } from "./shared/useNow";

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

// Home (outdoor conditions)
export { HomeWidget, HomeSheet } from "./widgets/home/HomeWidget";
export type { HomeWidgetProps, HomeSheetProps } from "./widgets/home/HomeWidget";
export { HomeTile } from "./widgets/home/HomeTile";
export type { HomeTileProps } from "./widgets/home/HomeTile";
export type { WeatherEntity, WeatherHistory, HourlyForecast, DailyForecast, Condition } from "./widgets/home/types";

// Toggle (modes)
export { ToggleWidget, ToggleSheet, DEFAULT_DURATIONS } from "./widgets/toggle/ToggleWidget";
export type { ToggleWidgetProps, ToggleSheetProps } from "./widgets/toggle/ToggleWidget";
export { ToggleTile } from "./widgets/toggle/ToggleTile";
export type { ToggleTileProps } from "./widgets/toggle/ToggleTile";
export type { ToggleEntity, ToggleHistory, ToggleIcon, ToggleTone, DurationOption } from "./widgets/toggle/types";

// Dashboard layout
export { DashboardPage, Section, Columns, Cell } from "./dashboards/layout";
