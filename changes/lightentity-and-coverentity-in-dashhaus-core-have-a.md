---
type: breaking
---
`LightEntity` and `CoverEntity` in `@dashhaus/core` have a new `unknown` state, for a light or cover that can be driven but hasn't said where it is, and their actions now run in it: handle `unknown` wherever your code switches on `state`.
