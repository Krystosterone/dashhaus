import tokens from "../styles/tokens.css?inline";
import shared from "../shared/ui.css?inline";
import light from "../cards/light/__Skin__LightCard.css?inline";
import sensor from "../cards/sensor/__Skin__SensorCard.css?inline";
import { define__Skin__Card } from "./card";

/**
 * The Lovelace bundle's entry. Every stylesheet is imported `?inline`, so the built file is one ES module carrying
 * its own CSS; `custom:__card_type__` is registered for Home Assistant's card picker.
 */
define__Skin__Card([tokens, shared, light, sensor].join("\n"));
console.info("Dashhaus __Section__ loaded");
