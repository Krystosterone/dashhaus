---
type: breaking
---
In `@dashhaus/core/lovelace/schema`, the read card type `CardShape` is now `ReadCard`, a `CardKindSpec`'s `options` reader is now `readOptions`, and a `LayoutSchema`'s `item` reader is now `readItem`. Rename them in your skin's Lovelace config; `SkinStrategy`'s `options` and a `RowEntry`'s `item` keep their names.
