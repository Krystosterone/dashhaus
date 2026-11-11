---
type: fix
---
An energy or water meter's today rises from its reading at midnight rather than its last reading in the first hour, and counts a meter that resets as starting again from zero, as Home Assistant's energy dashboard does. A `NumericHistory` you pass in may carry that rise as the optional `rise`.
