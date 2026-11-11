---
type: fix
---
dashhaus-deploy signs in to Home Assistant before copying any file, so a rejected HA_TOKEN leaves the served file matching its resource's version.
