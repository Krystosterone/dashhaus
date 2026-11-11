---
type: fix
---
Cards in both skins read a temperature unit however Home Assistant writes it: weather cards take "celsius" and "°c" instead of falling back to another unit, climate and sensor cards draw a reading in "℉" as °F instead of °C or the system's unit, and Dyson cards show °F, not a bare °, for a room temperature in "℉" or "fahrenheit".
