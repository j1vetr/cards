import { describe, it, expect } from "vitest";
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";

describe.skipIf(process.env.HERO_BROWSER_TEST !== "1")("Reference homepage hero", () => {
  it("uses separate artwork with real interactive cards and responsive navigation", async () => {
    const browser = await chromium.launch({
      executablePath: execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true });
    const errors: string[] = [];
    const cardRequests: URL[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/cards") cardRequests.push(url);
      const json = url.pathname === "/api/auth/me" ? null
        : url.pathname === "/api/cards" ? {
          cards: url.searchParams.get("limit") === "30" ? [{
            id: "hero-fixture", slug: "riftbound-hero-fixture", name: "Hero Test", image_url: "/logo-riftbound.png",
          }] : [], total: 1,
        } : url.pathname.includes("settings") ? {} : [];
      return route.fulfill({ status: 200, json });
    });
    const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    try {
      await fs.mkdir("generated-artifacts/hero", { recursive: true });
      await page.goto(origin);
      const hero = page.getByTestId("section-hero");
      const heading = page.getByTestId("hero-heading");
      const fan = page.getByTestId("hero-card-fan");
      await fan.locator("img").first().waitFor();
      await expect.poll(() => heading.evaluate(el => getComputedStyle(el).opacity)).toBe("1");
      expect(await hero.getByRole("heading", { level: 1 }).count()).toBe(1);
      expect((await heading.innerText()).replace(/\s+/g, " ")).toMatch(/Riftbound.*Pokémon TCG.*Kartları.*Türkiye[’']de/);
      const video = page.getByTestId("hero-background-video");
      await video.waitFor({ state: "attached" });
      const videoUrl = new URL((await video.getAttribute("src"))!);
      expect(videoUrl.pathname).toBe("/embed/zF5Ddo9JdpY");
      for (const [key, value] of Object.entries({ autoplay: "1", mute: "1", start: "15", loop: "1", playlist: "zF5Ddo9JdpY", playsinline: "1" })) {
        expect(videoUrl.searchParams.get(key)).toBe(value);
      }
      // Simulate player events without depending on YouTube's network/bot checks.
      await video.evaluate(el => {
        window.dispatchEvent(new MessageEvent('message', {
          origin: 'https://www.youtube-nocookie.com',
          source: (el as HTMLIFrameElement).contentWindow,
          data: JSON.stringify({ event: 'onStateChange', info: 1 }),
        }));
      });
      await expect.poll(() => hero.locator('.gocards-hero-video').evaluate(el => el.classList.contains('is-playing'))).toBe(true);
      await video.evaluate(el => {
        window.dispatchEvent(new MessageEvent('message', {
          origin: 'https://www.youtube-nocookie.com',
          source: (el as HTMLIFrameElement).contentWindow,
          data: JSON.stringify({ event: 'onError', info: 150 }),
        }));
      });
      await expect.poll(() => hero.locator('.gocards-hero-video').evaluate(el => el.classList.contains('is-playing'))).toBe(false);
      await page.getByTestId("button-hero-video").click();
      expect(await video.count()).toBe(0);
      await page.getByTestId("button-hero-video").click();
      await video.waitFor({ state: "attached" });
      expect(await page.getByTestId("bar-announcement").isVisible()).toBe(false);
      expect(cardRequests.some(url => url.searchParams.get("limit") === "30" && url.searchParams.get("game") === "riftbound")).toBe(true);
      const titleBox = await heading.boundingBox();
      const fanBox = await fan.boundingBox();
      expect(titleBox!.x).toBeLessThan(fanBox!.x);
      const rightmostCard = () => fan.locator("img").evaluateAll(imgs =>
        Math.max(...imgs.map(img => img.getBoundingClientRect().right)));
      await expect.poll(rightmostCard).toBeLessThan(1440);
      const turkey = page.getByTestId("hero-turkey");
      expect(await turkey.innerText()).toMatch(/Türkiye[’']de/);
      const ribbon = await turkey.evaluate(el => {
        const img = el.querySelector("img");
        return img ? (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0
          : getComputedStyle(el).backgroundImage !== "none";
      });
      expect(ribbon).toBe(true);
      await page.screenshot({ path: "generated-artifacts/hero/reference-desktop.jpg" });
      await page.getByTestId("button-search").click();
      await page.getByTestId("input-search").waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      await page.getByTestId("input-search").waitFor({ state: "hidden" });
      expect(await page.getByTestId("link-cart").getAttribute("href")).toBe("/sepet");

      for (const [width, height] of [[1920, 1080], [1440, 900], [1366, 768], [1024, 576], [768, 1024], [390, 844], [375, 667], [360, 640]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => scrollTo(0, 0));
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const title = await heading.boundingBox();
        expect(title!.x).toBeGreaterThanOrEqual(-1);
        expect(title!.x + title!.width).toBeLessThanOrEqual(width + 1);
        if (width >= 1024) {
          await expect.poll(() => hero.evaluate(el => Math.abs(el.getBoundingClientRect().bottom - innerHeight))).toBeLessThan(3);
          await expect.poll(rightmostCard).toBeLessThan(width);
          const logos = await page.getByTestId("hero-mobile-logos").boundingBox();
          expect(logos!.y + logos!.height).toBeLessThan(height);
          const login = page.getByTestId("link-giris-btn");
          expect(await login.getAttribute("href")).toBe("/giris");
          expect(await login.locator("svg").count()).toBe(1);
        }
        if (width < 640) {
          const logos = page.getByTestId("hero-mobile-logos");
          await expect.poll(async () => {
            const logoBox = await logos.boundingBox();
            const navBox = await page.getByTestId("nav-mobile-bottom").boundingBox();
            return !!logoBox && !!navBox && logoBox.y + logoBox.height <= navBox.y - 3;
          }).toBe(true);
          expect(await logos.locator("a").count()).toBe(2);
          expect(await logos.locator("img").evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
          await page.screenshot({ path: `generated-artifacts/hero/reference-mobile-${width}.jpg` });
        }
      }
      await page.getByTestId("button-mobile-menu").click();
      await page.getByTestId("drawer-mobile-menu").waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      await page.getByTestId("drawer-mobile-menu").waitFor({ state: "hidden" });
      await page.getByTestId("button-search-mobile").click();
      await page.getByTestId("input-search").waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect.poll(() => video.count()).toBe(0);
      expect(await page.getByTestId("hero-riftbound").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
      const card = fan.locator("img").first();
      await card.tap();
      await page.waitForURL("**/kart/riftbound-hero-fixture");
      await page.goto(origin);
      const cta = page.getByTestId("btn-hero-magaza");
      await cta.click();
      await page.waitForURL("**/kartlar");
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  }, 90_000);
});
