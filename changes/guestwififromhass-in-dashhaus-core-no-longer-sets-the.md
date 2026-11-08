---
type: breaking
---
guestWifiFromHass in @dashhaus/core no longer sets the QR code (qr): it is a picture, not part of the model. If you call the mapper yourself, add it with useHaPicture on the QR code's image, as useHaGuestWifi now does; useHaGuestWifi, HaGuestWifi and both skins' guest Wi-Fi cards need nothing.
