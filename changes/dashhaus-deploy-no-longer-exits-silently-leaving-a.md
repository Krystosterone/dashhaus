---
type: fix
---
dashhaus-deploy no longer exits silently, leaving a half-made dashboard, when Home Assistant restarts mid-deploy; it says the connection closed. It also signs in before copying any file, so a rejected HA_TOKEN no longer replaces the served file while its resource still names the old version.
