---
name: Replit npm lockfile breaks external server installs
description: package-lock.json committed from inside Replit has resolved URLs pointing at Replit's internal package firewall, which fails on non-Replit hosts.
---

Any `npm install`/`npm uninstall` run inside the Replit workspace writes `resolved` fields in `package-lock.json` pointing at `package-firewall.replit.local` (Replit's internal npm registry proxy, from `npm config get registry`). This is normal Replit behavior, not something a specific command caused.

**Why:** If the user deploys by `git pull` onto their own external server (e.g. a VPS, self-managed `/var/www/...`), `npm install` there tries to resolve those internal hostnames and fails with `EAI_AGAIN` (DNS lookup failure), because that hostname only exists inside Replit's network.

**How to apply:** When a user reports `npm install` hanging or failing with `getaddrinfo EAI_AGAIN package-firewall.replit.local` on an external/self-hosted server, the fix is on that external server, not in the Replit workspace:
```
rm -f package-lock.json
npm install --registry=https://registry.npmjs.org/
```
This regenerates the lockfile with public registry URLs. It will need to be redone (or the regenerated lockfile committed back) any time a future `npm install` inside Replit rewrites `package-lock.json` again with internal URLs.
