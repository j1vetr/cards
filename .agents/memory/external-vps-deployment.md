---
name: External VPS deployment
description: The user deploys downloaded project code outside Replit, requiring portable dependency locks.
---

The user deploys this project to their own external VPS, not Replit Publishing.

**Why:** They confirmed that production npm installation happens on their external server. Replit-private dependency download addresses previously made those installations fail even when the VPS npm registry was correctly configured.

**How to apply:** Keep lockfile download addresses portable when dependencies change. Check resolved package URLs before blaming the VPS registry configuration. Do not bypass Replit security blocks to test installs. For delivery, explain that the user needs to transfer changes, rebuild and restart their external service rather than implying a workspace restart updates production.
