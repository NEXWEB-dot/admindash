/* ---------------------------------------------------------------------------
 * Section entry animation — the public site's signature motion, 700ms on the
 * one shared easing curve.
 *
 * Applied to sections only. Deliberately not to table rows or live figures: a
 * number that fades in every time a filter changes reads as slow, not premium.
 * ------------------------------------------------------------------------- */

export function initReveal(root = document) {
  const targets = root.querySelectorAll('.reveal');
  if (!targets.length) return;

  /* Respect the OS setting before doing any work — no observer, no transition,
   * content visible immediately. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
  );

  targets.forEach((el) => io.observe(el));
}
