import tokens from "../styles/tokens.css?inline";
import shared from "../shared/ui.css?inline";
import light from "../cards/light/MySkinLightCard.css?inline";
import sensor from "../cards/sensor/MySkinSensorCard.css?inline";
import cover from "../cards/cover/MySkinCoverCard.css?inline";
import { defineMySkinCard } from "./card";

/**
 * The Lovelace bundle's entry. Every stylesheet is imported `?inline`, so the built file is one ES module carrying
 * its own CSS; `custom:dashhaus-my-skin` is registered for Home Assistant's card picker.
 */
defineMySkinCard([tokens, shared, light, sensor, cover].join("\n"));
console.info("Dashhaus My Skin loaded");
