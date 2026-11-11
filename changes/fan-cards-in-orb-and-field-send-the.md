---
type: fix
---
Fan cards in Orb and Field send the percentage Home Assistant itself uses for a speed (66 for speed 2 of 3, not 67), so a fan with 3, 6, 7, 8 or 9 speeds on ESPHome, ZHA or Tuya no longer runs one speed too fast.
