---
type: fix
---
Orb and Field cards say the same thing in the same words: every warning fits a 13-character row (an Owlet's alerts, "Stopped 11:49" once its readings stop, the weather's "Strong gusts", the alarm's "Entry delay · Front door"), the small print says when first and then what the device is, Field says "Last seen" while unavailable and a charging Owlet sock no longer warns of its battery. Orb's triggered alarm fills its slot with the shared alarm pill and Disarm, and its entry delay, a lock's battery and the weather's figures no longer repeat the warning in orange; `@dashhaus/core` adds each card's words and severity beside its model (`cover/words`, `alarm/words`, `lock/words`, `light/words`, `climate/words`, `cover/severity`, `sensor/severity`, `weather/severity` and more).
