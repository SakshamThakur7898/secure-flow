// public/js/home.js
// Homepage-only decorative behavior. Deliberately does not touch
// anything login.js/api.js own -- this only adds hero-button
// convenience and a scroll-reveal effect, both keyed off real DOM/user
// events, never an arbitrary fixed delay (so Selenium's explicit waits
// keep working the same as before).
(function () {
  const heroLoginBtn = document.getElementById('hero-login-btn');
  const loginCard = document.getElementById('login-card');
  const identifier = document.getElementById('identifier');

  if (heroLoginBtn && loginCard) {
    heroLoginBtn.addEventListener('click', () => {
      loginCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Focus after the element is in view; focusing immediately is a
      // real DOM state change, not a timing hack.
      if (identifier) identifier.focus({ preventScroll: true });
    });
  }

  // Smooth scroll for the in-page nav links (Home/About/Security/Testing).
  document.querySelectorAll('.rh-nav-links a, .rh-nav-cta, .rh-brand').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    link.addEventListener('click', (e) => {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Lightweight "just appeared" pop animation once a card enters the
  // viewport. Purely decorative -- cards are already visible by default
  // (see home.css), so this never gates content on JS/observer timing.
  const cards = document.querySelectorAll('.rh-card');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('rh-just-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    cards.forEach((card) => observer.observe(card));
  }

  if (window.lucide) window.lucide.createIcons();
})();
