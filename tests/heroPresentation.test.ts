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
      const isHero = new URL(route.request().url()).searchParams.get("limit") === "30";
      const json = path === "/api/cards" ? { cards: isHero ? [
        { id: "hero-fixture", slug: "riftbound-hero-fixture", name: "Hero Test", image_url: "/logo-riftbound.png" },
      ] : [], total: isHero ? 1 : 0 }
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
      expect(decodeURIComponent(normal.image)).toContain("<animate");
      const riftbound = page.getByTestId("hero-riftbound");
      expect(await riftbound.evaluate(el => getComputedStyle(el).animationName)).toBe("gocards-riftbound-shimmer");
      expect(await page.getByTestId("bar-announcement").isVisible()).toBe(true);
      expect(await turkey.evaluate(el => new Promise<boolean>(resolve => {
        const image = new Image();
        image.onload = () => resolve(image.naturalWidth > 0);
        image.onerror = () => resolve(false);
        image.src = getComputedStyle(el).backgroundImage.slice(5, -2);
      }))).toBe(true);
      const orange = await heading.locator("span").filter({ hasText: /^Riftbound$/ }).evaluate(el => getComputedStyle(el).color);
      expect(orange).not.toBe("rgb(255, 255, 255)");
      const fan = page.getByTestId("hero-card-fan");
      await fan.locator("img").first().waitFor();
      await expect.poll(async () => {
        const headingBox = await heading.boundingBox();
        const imageTops = await fan.locator("img").evaluateAll(imgs => imgs.map(img => img.getBoundingClientRect().top));
        return Math.min(...imageTops) - headingBox!.y - headingBox!.height;
      }).toBeGreaterThan(20);
      expect(await turkey.evaluate(el => getComputedStyle(el).backgroundRepeat)).toBe("no-repeat");
      expect(await turkey.evaluate(el => getComputedStyle(el).backgroundPosition)).toBe("50% 50%");
      await page.screenshot({ path: "generated-artifacts/hero/desktop.jpg" });
      for (const [width, height] of [[1024, 900], [390, 844], [360, 740], [375, 667], [360, 640]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => scrollTo(0, 0));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const bounds = await heading.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        if (width < 768) {
          expect(await page.getByTestId("bar-announcement").isVisible()).toBe(false);
          const logos = page.getByTestId("hero-mobile-logos");
          await expect.poll(async () => {
            const logoBox = await logos.boundingBox();
            const navBox = await page.getByTestId("nav-mobile-bottom").boundingBox();
            return logoBox!.y + logoBox!.height <= navBox!.y - 4;
          }).toBe(true);
          expect(await logos.locator("a").count()).toBe(2);
          expect(await logos.locator("img").evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
          const button = await hero.getByTestId("btn-hero-magaza").boundingBox();
          expect(button!.y).toBeGreaterThan(bounds!.y + bounds!.height);
          await expect.poll(async () => {
            const titleBox = await heading.boundingBox();
            const logoBox = await logos.boundingBox();
            const heroBox = await hero.boundingBox();
            const contentCenter = (titleBox!.y + logoBox!.y + logoBox!.height) / 2;
            return Math.abs(contentCenter - (heroBox!.y + heroBox!.height / 2));
          }).toBeLessThan(18);
          const imageTops = await fan.locator("img").evaluateAll(imgs => imgs.map(img => img.getBoundingClientRect().top));
          expect(Math.min(...imageTops) - bounds!.y - bounds!.height).toBeGreaterThan(7);
        }
      }
      await page.screenshot({ path: "generated-artifacts/hero/mobile.jpg" });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect.poll(() => turkey.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
      expect(await riftbound.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
      const staticFlag = await turkey.evaluate(el => getComputedStyle(el).backgroundImage);
      expect(staticFlag).not.toBe(normal.image);
      expect(decodeURIComponent(staticFlag)).not.toContain("<animate");
      expect(await hero.getByTestId("btn-hero-magaza").locator("..").getAttribute("href")).toBe("/kartlar");
      await hero.getByTestId("btn-hero-magaza").click();
      await page.waitForURL("**/kartlar");
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  }, 60_000);
});
