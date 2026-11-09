---
type: feature
---
A card whose action asks first now says so in its details while no question stands, in both skins: Orb's lock sheet says "Unlocking asks first." (its Open door button now reads "Open door…"), Field's lock panel says it for the door too, both skins' guest Wi-Fi details say "Changing the password asks first.", and Orb's weather sheet gives feels-like in whole degrees, as its card and Field do. `@dashhaus/core` adds `@dashhaus/core/entities/guard` (`waitingFor`, `ACTION_FAILED`, `WRONG_CODE`, `CHECKING_CODE`, `asksFirst`), the lock's guard words (`lockQuestion`, `lockAskDetail`, `lockAskAction`, `lockAsksHint`) and the guest Wi-Fi password's (`newPasswordQuestion`, `NEW_PASSWORD_HINT`), and a skin from `create-dashhaus-skin` says the same words and hint.
