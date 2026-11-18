import { describe, it, expect } from "vitest";
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";

describe.skipIf(process.env.HERO_BROWSER_TEST !== "1")("Homepage hero presentation", () => {
  it("centers the desktop title and keeps the flag readable across screen sizes and motion preferences", async () => {
    const browser = await chromium.launch({
      executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", route => {
      const path = new URL(route.request().url()).pathname;
      const json = path === "/api/cards" ? { cards: [], total: 0 }
        : path.includes("settings") ? {} : [];
      return route.fulfill({ status: 200, json });
    });
    try {
      await fs.mkdir("generated-artifacts/hero", { recursive: true });
      await page.goto(`https://${process.env.REPLIT_DEV_DOMAIN}`);
      const hero = page.getByTestId("section-hero");
      const heading = hero.getByRole("heading", { level: 1 });
      await heading.waitFor();
      await expect.poll(() => heading.evaluate(el => getComputedStyle(el).opacity)).toBe("1");
      expect((await heading.innerText()).replace(/\s+/g, " ").trim()).toBe("Riftbound & Pokémon TCG Kartları Türkiye'de");
      const box = await heading.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(1100);
      expect(Math.abs(box!.x + box!.width / 2 - 720)).toBeLessThan(5);
      expect(await heading.evaluate(el => getComputedStyle(el).textAlign)).toBe("center");
      const turkey = heading.locator("span").filter({ hasText: /^Türkiye'de$/ });
      const normal = await turkey.evaluate(el => {
        const css = getComputedStyle(el);
        return { image: css.backgroundImage, clip: css.backgroundClip, animation: css.animationName };
      });
      expect(normal.image).toContain("data:image/svg+xml");
      expect(decodeURIComponent(normal.image)).toContain("#e30a17");
      expect(normal.clip).toBe("text");
      expect(normal.animation).not.toBe("none");
      expect(await turkey.evaluate(el => new Promise<boolean>(resolve => {
        const image = new Image();
        image.onload = () => resolve(image.naturalWidth > 0);
        image.onerror = () => resolve(false);
        image.src = getComputedStyle(el).backgroundImage.slice(5, -2);
      }))).toBe(true);
      const orange = await heading.locator("span").filter({ hasText: /^Riftbound$/ }).evaluate(el => getComputedStyle(el).color);
      expect(orange).not.toBe("rgb(255, 255, 255)");
      await page.screenshot({ path: "generated-artifacts/hero/desktop.jpg" });
      for (const width of [1024, 390, 360]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const bounds = await heading.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      }
      await page.screenshot({ path: "generated-artifacts/hero/mobile.jpg" });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect.poll(() => turkey.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
      expect(await turkey.evaluate(el => getComputedStyle(el).backgroundImage)).toBe(normal.image);
      expect(await hero.getByTestId("btn-hero-magaza").locator("..").getAttribute("href")).toBe("/kartlar");
      await hero.getByTestId("btn-hero-magaza").click();
      await page.waitForURL("**/kartlar");
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  }, 60_000);
});
