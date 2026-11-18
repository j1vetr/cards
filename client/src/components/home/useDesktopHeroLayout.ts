import { useLayoutEffect, type RefObject } from 'react';

export function useDesktopHeroLayout(heroRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    let frame = 0;
    const measure = () => {
      if (!desktop.matches) {
        hero.style.removeProperty('--hero-desktop-top');
        hero.style.removeProperty('--hero-desktop-height');
        hero.style.removeProperty('--hero-desktop-fan-scale');
        hero.style.removeProperty('--hero-desktop-fan-offset');
        return;
      }
      // Includes every element above the hero, including the preview banner.
      // scrollY is essential when the header is sticky and this runs mid-scroll.
      const top = hero.getBoundingClientRect().top + window.scrollY;
      const available = Math.max(0, window.innerHeight - top);
      const scale = Math.min(window.innerWidth * .52 / 898, window.innerHeight * .52 / 493);
      hero.style.setProperty('--hero-desktop-top', `${top}px`);
      hero.style.setProperty('--hero-desktop-height', `${available}px`);
      hero.style.setProperty('--hero-desktop-fan-scale', `${scale}`);
      hero.style.setProperty('--hero-desktop-fan-offset', `${12.5 * scale}px`);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    desktop.addEventListener('change', schedule);
    const observer = new ResizeObserver(schedule);
    // Observe ancestors as well as header so a late-loading preview bar and
    // other upstream layout shifts are measured without a scroll listener.
    let ancestor: HTMLElement | null = hero.parentElement;
    while (ancestor) {
      observer.observe(ancestor);
      ancestor = ancestor.parentElement;
    }
    const header = document.querySelector<HTMLElement>('[data-testid="header"]');
    if (header) observer.observe(header);
    document.fonts.ready.then(schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      desktop.removeEventListener('change', schedule);
      hero.style.removeProperty('--hero-desktop-top');
      hero.style.removeProperty('--hero-desktop-height');
      hero.style.removeProperty('--hero-desktop-fan-scale');
      hero.style.removeProperty('--hero-desktop-fan-offset');
    };
  }, [heroRef]);
}
