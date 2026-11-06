/**
 * @file
 * Scroll-driven parallax offset for Section background layers.
 *
 * Each layer moves at its data-parallax-speed: 0 stands still while the page
 * scrolls, 1 scrolls with the page. A "cover" layer fills its section: it is
 * made just tall enough that, at its speed, it covers the visible part of the
 * section at every scroll position. Only sections on screen are updated, once
 * a frame, and nothing moves when the visitor prefers reduced motion.
 */
(function (Drupal, once) {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  let frame = 0;

  const speedOf = (layer) => {
    const speed = parseFloat(layer.dataset.parallaxSpeed);
    return Number.isFinite(speed) ? Math.min(1, Math.max(0, speed)) : 0.3;
  };

  const update = (container) => {
    const layers = container.querySelectorAll(':scope > .parallax-layer');
    const still = reducedMotion.matches;
    const rect = container.getBoundingClientRect();
    const viewport = window.innerHeight;
    const travel = rect.height + viewport;

    layers.forEach((layer) => {
      const speed = speedOf(layer);

      if (layer.classList.contains('parallax-layer--cover')) {
        // Measured from the viewport's center, so a section in the middle of
        // the screen shows its layer centered. The height is the smaller of
        // what covers the whole viewport and what covers the whole section.
        const fromCenter = rect.top + rect.height / 2 - viewport / 2;
        const height = still
          ? rect.height
          : Math.min(viewport + travel * speed, rect.height + travel * (1 - speed));
        layer.style.setProperty('--parallax-height', `${Math.ceil(height)}px`);
        layer.style.setProperty('--parallax-offset', still ? '0px' : `${-fromCenter * (1 - speed)}px`);
      }
      else {
        // Counters the section's own scroll movement by a (1 - speed)
        // fraction, measured from the section's top.
        layer.style.setProperty('--parallax-offset', still ? '0px' : `${-rect.top * (1 - speed)}px`);
      }
    });
  };

  const updateVisible = () => {
    frame = 0;
    visible.forEach(update);
  };

  const schedule = () => {
    if (!frame) {
      frame = window.requestAnimationFrame(updateVisible);
    }
  };

  const intersection = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        visible.add(entry.target);
        update(entry.target);
      }
      else {
        visible.delete(entry.target);
      }
    });
  }, { rootMargin: '25% 0px' });

  // A section changes height as its images and fonts load; the layers must
  // follow, or a gap opens at an edge.
  const resize = new ResizeObserver((entries) => {
    entries.forEach((entry) => update(entry.target));
  });

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  reducedMotion.addEventListener('change', () => {
    document.querySelectorAll('[data-parallax]').forEach(update);
  });

  Drupal.behaviors.wudoParallax = {
    attach(context) {
      once('wudo-parallax', '[data-parallax]', context).forEach((container) => {
        if (!container.querySelector(':scope > .parallax-layer')) {
          return;
        }
        intersection.observe(container);
        resize.observe(container);
        update(container);
      });
    },
    detach(context, settings, trigger) {
      if (trigger !== 'unload') {
        return;
      }
      once.remove('wudo-parallax', '[data-parallax]', context).forEach((container) => {
        intersection.unobserve(container);
        resize.unobserve(container);
        visible.delete(container);
      });
    }
  };

})(Drupal, once);
