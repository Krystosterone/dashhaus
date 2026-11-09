---
type: feature
---
A Dyson card in Orb and Field for a Dyson purifier fan from the hass-dyson or ha-dyson integration: its ten speeds or Auto, the air it measures in Dyson's own bands, its filters' life, where it points and how widely it sweeps (Still to 350°, aimed on a dial in Orb's details, or a Humidify+Cool's Breeze), its front or back airflow, night mode and a Hot+Cool's heat and target, each found beside its fan. It warns when the air is poor or a filter is worn. YAML picks it with `card: dyson` and takes `companions` for a renamed device; the automatic layouts find a Dyson themselves, `@dashhaus/core/lovelace/layout` adds `dysonFans` and `/schema` `readDysonOptions`. Its demo seeds are `@dashhaus/core/seeds/dyson`, with `useDemoDyson`.
