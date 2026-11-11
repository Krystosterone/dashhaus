---
type: fix
---
dashhaus-deploy stops with “Home Assistant closed the connection.” when Home Assistant restarts mid-deploy, instead of exiting without a word; if that leaves a dashboard without its layout, the message names it to delete.
