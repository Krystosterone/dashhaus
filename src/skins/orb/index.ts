// The orb skin's public entry: its card system, cards, connected tiles, bundles and dashboard furniture. Importing
// it loads orb's token CSS once; the shared Home Assistant hooks and headless components stay in packages/core/src/index.ts.
import "./styles/tokens.css";

// Shared card system
export { Orb, CardTitle, CircleButton, SheetClose, TogglePill, UnavailableSlot, Readout, TodayStrip, ChoiceChips, Sheet, fmtDuration, fmt1, paint } from "./shared/ui";
export { useCard, detailsSheet, detailsTile, normalizeReadings } from "./shared/ui";
export type { HourSample, ChoiceOption, Role, CardFootprint, CardProps, SheetProps, TileProps, Reading } from "./shared/ui";

// The orb skin's connected tiles: each useHa<Kind> hook above its tile.
export { HaLightTile } from "./ha/HaLightTile";
export type { HaLightTileProps } from "./ha/HaLightTile";
export { HaClimateTile } from "./ha/HaClimateTile";
export type { HaClimateTileProps } from "./ha/HaClimateTile";
export { HaSensorTile } from "./ha/HaSensorTile";
export type { HaSensorTileProps } from "./ha/HaSensorTile";
export { HaWeatherTile } from "./ha/HaWeatherTile";
export type { HaWeatherTileProps } from "./ha/HaWeatherTile";
export { HaCoverTile } from "./ha/HaCoverTile";
export type { HaCoverTileProps } from "./ha/HaCoverTile";
export { HaToggleTile } from "./ha/HaToggleTile";
export type { HaToggleTileProps } from "./ha/HaToggleTile";
export { HaAlarmTile } from "./ha/HaAlarmTile";
export type { HaAlarmTileProps } from "./ha/HaAlarmTile";

// Header
export { Header } from "./dashboards/Header";
export type { HeaderProps } from "./dashboards/Header";

// Light
export { LightCard, LightSheet } from "./cards/light/LightCard";
export type { LightCardProps, LightSheetProps } from "./cards/light/LightCard";
export { LightTile } from "./cards/light/LightTile";
export type { LightTileProps } from "./cards/light/LightTile";
export { lampColor } from "./cards/light/kelvin";

// Climate
export { ClimateCard, ClimateSheet } from "./cards/climate/ClimateCard";
export type { ClimateCardProps, ClimateSheetProps } from "./cards/climate/ClimateCard";
export { ClimateTile } from "./cards/climate/ClimateTile";
export type { ClimateTileProps } from "./cards/climate/ClimateTile";

// Sensor
export { SensorCard, SensorSheet } from "./cards/sensor/SensorCard";
export type { SensorCardProps, SensorSheetProps } from "./cards/sensor/SensorCard";
export { SensorTile } from "./cards/sensor/SensorTile";
export type { SensorTileProps } from "./cards/sensor/SensorTile";

// Weather (outdoor conditions)
export { WeatherCard, WeatherSheet } from "./cards/weather/WeatherCard";
export type { WeatherCardProps, WeatherSheetProps } from "./cards/weather/WeatherCard";
export { WeatherTile } from "./cards/weather/WeatherTile";
export type { WeatherTileProps } from "./cards/weather/WeatherTile";

// Toggle (modes)
export { ToggleCard, ToggleSheet } from "./cards/toggle/ToggleCard";
export type { ToggleCardProps, ToggleSheetProps } from "./cards/toggle/ToggleCard";
export { ToggleTile } from "./cards/toggle/ToggleTile";
export type { ToggleTileProps } from "./cards/toggle/ToggleTile";

// Cover (curtains, blinds, shades, garage doors)
export { CoverCard, CoverSheet } from "./cards/cover/CoverCard";
export type { CoverCardProps, CoverSheetProps } from "./cards/cover/CoverCard";
export { CoverTile } from "./cards/cover/CoverTile";
export type { CoverTileProps } from "./cards/cover/CoverTile";

// Alarm (security panel)
export { AlarmCard, AlarmSheet } from "./cards/alarm/AlarmCard";
export type { AlarmCardProps, AlarmSheetProps } from "./cards/alarm/AlarmCard";
export { AlarmTile } from "./cards/alarm/AlarmTile";
export type { AlarmTileProps } from "./cards/alarm/AlarmTile";
export type { AlarmResult } from "./cards/alarm/AlarmCard";

// Owlet
export { OwletCard, OwletSheet } from "./cards/owlet/OwletCard";
export type { OwletCardProps, OwletSheetProps } from "./cards/owlet/OwletCard";
export { OwletTile } from "./cards/owlet/OwletTile";
export type { OwletTileProps } from "./cards/owlet/OwletTile";
export { HaOwletTile } from "./ha/HaOwletTile";
export type { HaOwletTileProps } from "./ha/HaOwletTile";

// Humidifier
export { HumidifierCard, HumidifierSheet } from "./cards/humidifier/HumidifierCard";
export type { HumidifierCardProps, HumidifierSheetProps } from "./cards/humidifier/HumidifierCard";
export { HumidifierTile } from "./cards/humidifier/HumidifierTile";
export type { HumidifierTileProps } from "./cards/humidifier/HumidifierTile";
export { HaHumidifierTile } from "./ha/HaHumidifierTile";
export type { HaHumidifierTileProps } from "./ha/HaHumidifierTile";

// Sound
export { SoundCard, SoundSheet } from "./cards/sound/SoundCard";
export type { SoundCardProps, SoundSheetProps } from "./cards/sound/SoundCard";
export { SoundTile } from "./cards/sound/SoundTile";
export type { SoundTileProps } from "./cards/sound/SoundTile";
export { HaSoundTile } from "./ha/HaSoundTile";
export type { HaSoundTileProps } from "./ha/HaSoundTile";

// Lock
export { LockCard, LockSheet } from "./cards/lock/LockCard";
export type { LockCardProps, LockSheetProps } from "./cards/lock/LockCard";
export { LockTile } from "./cards/lock/LockTile";
export type { LockTileProps } from "./cards/lock/LockTile";
export { HaLockTile } from "./ha/HaLockTile";
export type { HaLockTileProps } from "./ha/HaLockTile";
// Fan
export { FanCard, FanSheet } from "./cards/fan/FanCard";
export type { FanCardProps, FanSheetProps } from "./cards/fan/FanCard";
export { FanTile } from "./cards/fan/FanTile";
export type { FanTileProps } from "./cards/fan/FanTile";
export { HaFanTile } from "./ha/HaFanTile";
export type { HaFanTileProps } from "./ha/HaFanTile";

// new-card: card exports
export { JoinedBundle, LeadBundle, TitledBundle } from "./bundles/Bundle";
export { SheetExtra } from "./shared/ui";

// Dashboard layout
export { DashboardPage, Section, Columns, CardGrid, Cell } from "./dashboards/layout";
export type { DashboardPageProps } from "./dashboards/layout";
