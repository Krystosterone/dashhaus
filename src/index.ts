// The public barrel exports both skins, so load both scoped token sets.
import "./skins/orb/styles/tokens.css";
import "./skins/field/styles/tokens.css";

// Shared
export { Orb, CardTitle, CircleButton, SheetClose, TogglePill, UnavailableSlot, Readout, TodayStrip, ChoiceChips, Sheet, fmtDuration, fmt1, paint, COLORS } from "./skins/orb/shared/ui";
export { useCard, detailsSheet, detailsTile, normalizeReadings } from "./skins/orb/shared/ui";
export type { HourSample, ChoiceOption, SlotColor, ColorName, ColorProp, Role, WidgetFootprint, CardProps, SheetProps, TileProps, Reading } from "./skins/orb/shared/ui";
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
export { LightModule } from "./skins/field/widgets/light/LightModule";
export type { LightModuleProps } from "./skins/field/widgets/light/LightModule";
export { HaLightModule } from "./skins/field/ha/HaLightModule";
export type { HaLightModuleProps } from "./skins/field/ha/HaLightModule";
export { ClimateModule } from "./skins/field/widgets/climate/ClimateModule";
export type { ClimateModuleProps } from "./skins/field/widgets/climate/ClimateModule";
export { HaClimateModule } from "./skins/field/ha/HaClimateModule";
export type { HaClimateModuleProps } from "./skins/field/ha/HaClimateModule";
export type { FieldFootprint } from "./skins/field/shared/ui";

// Header
export { HeaderWidget } from "./skins/orb/widgets/header/HeaderWidget";
export type { HeaderWidgetProps } from "./skins/orb/widgets/header/HeaderWidget";

// Light
export { LightWidget, LightSheet } from "./skins/orb/widgets/light/LightWidget";
export type { LightWidgetProps, LightSheetProps } from "./skins/orb/widgets/light/LightWidget";
export { LightTile } from "./skins/orb/widgets/light/LightTile";
export type { LightTileProps } from "./skins/orb/widgets/light/LightTile";
export type { LightEntity, LightHistory, LightState } from "./domains/light/types";
export { kelvinToLch, kelvinName } from "./domains/light/kelvin";
export { lampColor } from "./skins/orb/widgets/light/kelvin";

// Climate
export { ClimateWidget, ClimateSheet } from "./skins/orb/widgets/climate/ClimateWidget";
export type { ClimateWidgetProps, ClimateSheetProps } from "./skins/orb/widgets/climate/ClimateWidget";
export { ClimateTile } from "./skins/orb/widgets/climate/ClimateTile";
export type { ClimateTileProps } from "./skins/orb/widgets/climate/ClimateTile";
export type { ClimateEntity, ClimateHistory, HvacMode, HvacAction } from "./domains/climate/types";

// Sensor
export { SensorWidget, SensorSheet } from "./skins/orb/widgets/sensor/SensorWidget";
export type { SensorWidgetProps, SensorSheetProps } from "./skins/orb/widgets/sensor/SensorWidget";
export { SensorTile } from "./skins/orb/widgets/sensor/SensorTile";
export type { SensorTileProps } from "./skins/orb/widgets/sensor/SensorTile";
export type { SensorEntity, SensorHistory } from "./domains/sensor/types";

// Weather (outdoor conditions)
export { WeatherWidget, WeatherSheet } from "./skins/orb/widgets/weather/WeatherWidget";
export type { WeatherWidgetProps, WeatherSheetProps } from "./skins/orb/widgets/weather/WeatherWidget";
export { WeatherTile } from "./skins/orb/widgets/weather/WeatherTile";
export type { WeatherTileProps } from "./skins/orb/widgets/weather/WeatherTile";
export type { WeatherEntity, WeatherHistory, HourlyForecast, DailyForecast, Condition } from "./domains/weather/types";

// Toggle (modes)
export { ToggleWidget, ToggleSheet, DEFAULT_DURATIONS } from "./skins/orb/widgets/toggle/ToggleWidget";
export type { ToggleWidgetProps, ToggleSheetProps } from "./skins/orb/widgets/toggle/ToggleWidget";
export { ToggleTile } from "./skins/orb/widgets/toggle/ToggleTile";
export type { ToggleTileProps } from "./skins/orb/widgets/toggle/ToggleTile";
export type { ToggleEntity, ToggleHistory, ToggleIcon, DurationOption } from "./domains/toggle/types";

// Cover (curtains, blinds, shades, garage doors)
export { CoverWidget, CoverSheet } from "./skins/orb/widgets/cover/CoverWidget";
export type { CoverWidgetProps, CoverSheetProps } from "./skins/orb/widgets/cover/CoverWidget";
export { CoverTile } from "./skins/orb/widgets/cover/CoverTile";
export type { CoverTileProps } from "./skins/orb/widgets/cover/CoverTile";
export type { CoverEntity, CoverHistory, CoverClass } from "./domains/cover/types";

// Alarm (security panel)
export { AlarmWidget, AlarmSheet } from "./skins/orb/widgets/alarm/AlarmWidget";
export type { AlarmWidgetProps, AlarmSheetProps } from "./skins/orb/widgets/alarm/AlarmWidget";
export { AlarmTile } from "./skins/orb/widgets/alarm/AlarmTile";
export type { AlarmTileProps } from "./skins/orb/widgets/alarm/AlarmTile";
export type { AlarmEntity, AlarmHistory, AlarmMode, AlarmState, AlarmAction } from "./domains/alarm/types";
export type { AlarmResult } from "./skins/orb/widgets/alarm/AlarmWidget";
// Owlet
export { OwletWidget, OwletSheet } from "./skins/orb/widgets/owlet/OwletWidget";
export type { OwletWidgetProps, OwletSheetProps } from "./skins/orb/widgets/owlet/OwletWidget";
export { OwletTile } from "./skins/orb/widgets/owlet/OwletTile";
export type { OwletTileProps } from "./skins/orb/widgets/owlet/OwletTile";
export type { OwletEntity, OwletHistory, OwletAlert, SleepState } from "./domains/owlet/types";
export { HaOwletTile } from "./skins/orb/ha/HaOwletTile";
export type { HaOwletTileProps } from "./skins/orb/ha/HaOwletTile";

// Humidifier
export { HumidifierWidget, HumidifierSheet } from "./skins/orb/widgets/humidifier/HumidifierWidget";
export type { HumidifierWidgetProps, HumidifierSheetProps } from "./skins/orb/widgets/humidifier/HumidifierWidget";
export { HumidifierTile } from "./skins/orb/widgets/humidifier/HumidifierTile";
export type { HumidifierTileProps } from "./skins/orb/widgets/humidifier/HumidifierTile";
export type { HumidifierEntity, HumidifierHistory } from "./domains/humidifier/types";
export { HaHumidifierTile } from "./skins/orb/ha/HaHumidifierTile";
export type { HaHumidifierTileProps } from "./skins/orb/ha/HaHumidifierTile";

// Sound
export { SoundWidget, SoundSheet } from "./skins/orb/widgets/sound/SoundWidget";
export type { SoundWidgetProps, SoundSheetProps } from "./skins/orb/widgets/sound/SoundWidget";
export { SoundTile } from "./skins/orb/widgets/sound/SoundTile";
export type { SoundTileProps } from "./skins/orb/widgets/sound/SoundTile";
export type { SoundEntity, SoundHistory } from "./domains/sound/types";
export { HaSoundTile } from "./skins/orb/ha/HaSoundTile";
export type { HaSoundTileProps } from "./skins/orb/ha/HaSoundTile";

export { JoinedBundle, LeadBundle, TitledBundle } from "./skins/orb/bundles/Bundle";
export { SheetExtra } from "./skins/orb/shared/ui";

// Dashboard layout
export { DashboardPage, Section, Columns, WidgetGrid, Cell } from "./skins/orb/dashboards/layout";
export type { DashboardPageProps } from "./skins/orb/dashboards/layout";
