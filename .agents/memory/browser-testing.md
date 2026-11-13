---
name: NixOS browser tests
description: Browser execution constraints when checking the authenticated admin interface safely.
---

Use the Nix-installed system Chromium for Playwright in this workspace instead of relying on Playwright's downloaded headless shell.

**Why:** The downloaded browser could not launch here, while the system Chromium installed through Replit's package tooling launched successfully.

**How to apply:** Resolve the system executable dynamically rather than hardcoding a Nix store path. Keep browser packages development-only and all lockfile download URLs public for the external VPS. Run destructive admin scenarios against an isolated test database, never live inventory.
