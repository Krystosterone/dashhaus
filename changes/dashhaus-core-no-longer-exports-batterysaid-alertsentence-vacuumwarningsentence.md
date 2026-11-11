---
type: breaking
---
`@dashhaus/core/entities` and its words subpaths (`battery`, `binarySensor/words`, `cover/words`, `vacuum/words`) no longer export `batterySaid`, `alertSentence`, `vacuumWarningSentence` or `leftOpenSentence`: say a warning with `batteryAdvice`, `alertSaid`, `vacuumWarningSaid` and `leftOpenText` and put the card's name before it.
