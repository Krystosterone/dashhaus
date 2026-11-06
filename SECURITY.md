# Security policy

Dashhaus runs inside your Home Assistant, and `@dashhaus/deploy` holds an administrator token while it deploys. A flaw
in either can reach your home, so please report one privately.

## Reporting a vulnerability

Use GitHub's private reporting: **[Report a vulnerability](https://github.com/Krystosterone/dashhaus/security/advisories/new)**.
Don't open a public issue or pull request for it.

Say what is affected (a package and its version, the bundle, its dashboard strategy), how to reproduce it, and what an
attacker gains. You'll get an answer within a week; a fix ships as a patch release of every affected package, with an
advisory that credits you unless you'd rather it didn't.

## Supported versions

Only the latest released `0.x` line gets security fixes. Before 1.0, a fix may need a minor version.

## What is in scope

- The published packages: `@dashhaus/core`, `@dashhaus/dashboard`, `@dashhaus/deploy`, `@dashhaus/orb`,
  `@dashhaus/field`, `@dashhaus/bundle` and `create-dashhaus-skin`.
- The `dashhaus.js` bundle attached to each GitHub release, which the Home Assistant Marketplace and HACS install,
  and its `custom:dashhaus` dashboard strategy.

A token leaked through your own `.env` or `dashboard.config.mjs`, or a flaw in Home Assistant itself, is out of scope;
report the latter to [Home Assistant](https://www.home-assistant.io/security/).
