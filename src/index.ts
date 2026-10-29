// The public barrel exports both skins, so load both scoped token sets.
import "./skins/orb/styles/tokens.css";
import "./skins/field/styles/tokens.css";

// Shared
export { Orb, CardTitle, CircleButton, SheetClose, TogglePill, UnavailableSlot, Readout, TodayStrip, ChoiceChips, Sheet, fmtDuration, fmt1, paint, COLORS } from "./skins/orb/shared/ui";
export { useCard, detailsSheet, detailsTile, normalizeReadings } from "./skins/orb/shared/ui";
export type { HourSample, ChoiceOption, SlotColor, ColorName, ColorProp, Role, CardFootprint, CardProps, SheetProps, TileProps, Reading } from "./skins/orb/shared/ui";
export { useNow } from "./hooks/useNow";

// Headless interaction primitives every skin draws its controls on.
export { usePress } from "./primitives/press";
export { useSlider, useRangeSlider } from "./primitives/slider";
export { useSheet } from "./primitives/sheet";
export type { PressOptions } from "./primitives/press";
export type { SliderOptions, RangeSliderOptions } from "./primitives/slider";
export type { SheetOptions } from "./primitives/sheet";

// Home Assistant integration, for any skin: the store, the provider, one live entity per hook or headless
// component. Mappers, handler factories and history parsers for custom containers live in ./ha.
export { HaActionError } from "./ha";
export { createHaStore, connectHomeAssistant, createHomeAssistantTransport } from "./ha";
export { HaProvider, useHaStore, useHaSnapshot, useHaSelector, useHaEntity, useHaEntities, useHaStatus, useHaGeneration } from "./ha";
export { useHaLight, useHaClimate, useHaWeather, useHaSensor, useHaCover, useHaToggle, useHaAlarm, useHaOwlet, useHaHumidifier, useHaSound } from "./ha";
export type { HaLightOptions, HaLightResult, HaClimateOptions, HaClimateResult, HaWeatherOptions, HaWeatherResult, HaSensorOptions, HaSensorResult, HaCoverOptions, HaCoverResult, HaToggleOptions, HaToggleResult, HaAlarmOptions, HaAlarmResult, HaOwletOptions, HaOwletResult, HaHumidifierOptions, HaHumidifierResult, HaSoundOptions, HaSoundResult } from "./ha";
export { headless, HaLight, HaClimate, HaWeather, HaSensor, HaCover, HaToggle, HaAlarm, HaOwlet, HaHumidifier, HaSound } from "./ha";
export type { HeadlessProps } from "./ha";
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
} from "./ha";

// The orb skin's connected tiles: each useHa<Kind> hook above its tile.
export { HaLightTile } from "./skins/orb/ha/HaLightTile";
export type { HaLightTileProps } from "./skins/orb/ha/HaLightTile";
export { HaClimateTile } from "./skins/orb/ha/HaClimateTile";
export type { HaClimateTileProps } from "./skins/orb/ha/HaClimateTile";
export { HaSensorTile } from "./skins/orb/ha/HaSensorTile";
export type { HaSensorTileProps } from "./skins/orb/ha/HaSensorTile";
export { HaWeatherTile } from "./skins/orb/ha/HaWeatherTile";
export type { HaWeatherTileProps } from "./skins/orb/ha/HaWeatherTile";
export { HaCoverTile } from "./skins/orb/ha/HaCoverTile";
export type { HaCoverTileProps } from "./skins/orb/ha/HaCoverTile";
export { HaToggleTile } from "./skins/orb/ha/HaToggleTile";
export type { HaToggleTileProps } from "./skins/orb/ha/HaToggleTile";
export { HaAlarmTile } from "./skins/orb/ha/HaAlarmTile";
export type { HaAlarmTileProps } from "./skins/orb/ha/HaAlarmTile";

// Field skin: presentational modules and their connected Home Assistant containers.
export { LightModule } from "./skins/field/cards/light/LightModule";
export type { LightModuleProps } from "./skins/field/cards/light/LightModule";
export { HaLightModule } from "./skins/field/ha/HaLightModule";
export type { HaLightModuleProps } from "./skins/field/ha/HaLightModule";
export { ClimateModule } from "./skins/field/cards/climate/ClimateModule";
export type { ClimateModuleProps } from "./skins/field/cards/climate/ClimateModule";
export { HaClimateModule } from "./skins/field/ha/HaClimateModule";
export type { HaClimateModuleProps } from "./skins/field/ha/HaClimateModule";
export { SensorModule } from "./skins/field/cards/sensor/SensorModule";
export type { SensorModuleProps } from "./skins/field/cards/sensor/SensorModule";
export { HaSensorModule } from "./skins/field/ha/HaSensorModule";
export type { HaSensorModuleProps } from "./skins/field/ha/HaSensorModule";
export { WeatherModule } from "./skins/field/cards/weather/WeatherModule";
export type { WeatherModuleProps } from "./skins/field/cards/weather/WeatherModule";
export { HaWeatherModule } from "./skins/field/ha/HaWeatherModule";
export type { HaWeatherModuleProps } from "./skins/field/ha/HaWeatherModule";
export { ToggleModule } from "./skins/field/cards/toggle/ToggleModule";
export type { ToggleModuleProps } from "./skins/field/cards/toggle/ToggleModule";
export { HaToggleModule } from "./skins/field/ha/HaToggleModule";
export type { HaToggleModuleProps } from "./skins/field/ha/HaToggleModule";
export { HumidifierModule } from "./skins/field/cards/humidifier/HumidifierModule";
export type { HumidifierModuleProps } from "./skins/field/cards/humidifier/HumidifierModule";
export { HaHumidifierModule } from "./skins/field/ha/HaHumidifierModule";
export type { HaHumidifierModuleProps } from "./skins/field/ha/HaHumidifierModule";
export type { FieldFootprint } from "./skins/field/shared/ui";

// Header
export { Header } from "./skins/orb/dashboards/Header";
export type { HeaderProps } from "./skins/orb/dashboards/Header";

// Light
export { LightCard, LightSheet } from "./skins/orb/cards/light/LightCard";
export type { LightCardProps, LightSheetProps } from "./skins/orb/cards/light/LightCard";
export { LightTile } from "./skins/orb/cards/light/LightTile";
export type { LightTileProps } from "./skins/orb/cards/light/LightTile";
export type { LightEntity, LightHistory, LightState } from "./domains/light/types";
export { kelvinToLch, kelvinName } from "./domains/light/kelvin";
export { lampColor } from "./skins/orb/cards/light/kelvin";

// Climate
export { ClimateCard, ClimateSheet } from "./skins/orb/cards/climate/ClimateCard";
export type { ClimateCardProps, ClimateSheetProps } from "./skins/orb/cards/climate/ClimateCard";
export { ClimateTile } from "./skins/orb/cards/climate/ClimateTile";
export type { ClimateTileProps } from "./skins/orb/cards/climate/ClimateTile";
export type { ClimateEntity, ClimateHistory, HvacMode, HvacAction } from "./domains/climate/types";

// Sensor
export { SensorCard, SensorSheet } from "./skins/orb/cards/sensor/SensorCard";
export type { SensorCardProps, SensorSheetProps } from "./skins/orb/cards/sensor/SensorCard";
export { SensorTile } from "./skins/orb/cards/sensor/SensorTile";
export type { SensorTileProps } from "./skins/orb/cards/sensor/SensorTile";
export type { SensorEntity, SensorHistory } from "./domains/sensor/types";

// Weather (outdoor conditions)
export { WeatherCard, WeatherSheet } from "./skins/orb/cards/weather/WeatherCard";
export type { WeatherCardProps, WeatherSheetProps } from "./skins/orb/cards/weather/WeatherCard";
export { WeatherTile } from "./skins/orb/cards/weather/WeatherTile";
export type { WeatherTileProps } from "./skins/orb/cards/weather/WeatherTile";
export type { WeatherEntity, WeatherHistory, HourlyForecast, DailyForecast, Condition } from "./domains/weather/types";

// Toggle (modes)
export { ToggleCard, ToggleSheet } from "./skins/orb/cards/toggle/ToggleCard";
export { DEFAULT_DURATIONS } from "./domains/toggle/durations";
export type { ToggleCardProps, ToggleSheetProps } from "./skins/orb/cards/toggle/ToggleCard";
export { ToggleTile } from "./skins/orb/cards/toggle/ToggleTile";
export type { ToggleTileProps } from "./skins/orb/cards/toggle/ToggleTile";
export type { ToggleEntity, ToggleHistory, ToggleIcon, DurationOption } from "./domains/toggle/types";

// Cover (curtains, blinds, shades, garage doors)
export { CoverCard, CoverSheet } from "./skins/orb/cards/cover/CoverCard";
export type { CoverCardProps, CoverSheetProps } from "./skins/orb/cards/cover/CoverCard";
export { CoverTile } from "./skins/orb/cards/cover/CoverTile";
export type { CoverTileProps } from "./skins/orb/cards/cover/CoverTile";
export type { CoverEntity, CoverHistory, CoverClass } from "./domains/cover/types";

// Alarm (security panel)
export { AlarmCard, AlarmSheet } from "./skins/orb/cards/alarm/AlarmCard";
export type { AlarmCardProps, AlarmSheetProps } from "./skins/orb/cards/alarm/AlarmCard";
export { AlarmTile } from "./skins/orb/cards/alarm/AlarmTile";
export type { AlarmTileProps } from "./skins/orb/cards/alarm/AlarmTile";
export type { AlarmEntity, AlarmHistory, AlarmMode, AlarmState, AlarmAction } from "./domains/alarm/types";
export type { AlarmResult } from "./skins/orb/cards/alarm/AlarmCard";
// Owlet
export { OwletCard, OwletSheet } from "./skins/orb/cards/owlet/OwletCard";
export type { OwletCardProps, OwletSheetProps } from "./skins/orb/cards/owlet/OwletCard";
export { OwletTile } from "./skins/orb/cards/owlet/OwletTile";
export type { OwletTileProps } from "./skins/orb/cards/owlet/OwletTile";
export type { OwletEntity, OwletHistory, OwletAlert, SleepState } from "./domains/owlet/types";
export { HaOwletTile } from "./skins/orb/ha/HaOwletTile";
export type { HaOwletTileProps } from "./skins/orb/ha/HaOwletTile";

// Humidifier
export { HumidifierCard, HumidifierSheet } from "./skins/orb/cards/humidifier/HumidifierCard";
export type { HumidifierCardProps, HumidifierSheetProps } from "./skins/orb/cards/humidifier/HumidifierCard";
export { HumidifierTile } from "./skins/orb/cards/humidifier/HumidifierTile";
export type { HumidifierTileProps } from "./skins/orb/cards/humidifier/HumidifierTile";
export type { HumidifierEntity, HumidifierHistory } from "./domains/humidifier/types";
export { HaHumidifierTile } from "./skins/orb/ha/HaHumidifierTile";
export type { HaHumidifierTileProps } from "./skins/orb/ha/HaHumidifierTile";

// Sound
export { SoundCard, SoundSheet } from "./skins/orb/cards/sound/SoundCard";
export type { SoundCardProps, SoundSheetProps } from "./skins/orb/cards/sound/SoundCard";
export { SoundTile } from "./skins/orb/cards/sound/SoundTile";
export type { SoundTileProps } from "./skins/orb/cards/sound/SoundTile";
export type { SoundEntity, SoundHistory } from "./domains/sound/types";
export { HaSoundTile } from "./skins/orb/ha/HaSoundTile";
export type { HaSoundTileProps } from "./skins/orb/ha/HaSoundTile";

export { JoinedBundle, LeadBundle, TitledBundle } from "./skins/orb/bundles/Bundle";
export { SheetExtra } from "./skins/orb/shared/ui";

// Dashboard layout
export { DashboardPage, Section, Columns, CardGrid, Cell } from "./skins/orb/dashboards/layout";
export type { DashboardPageProps } from "./skins/orb/dashboards/layout";
