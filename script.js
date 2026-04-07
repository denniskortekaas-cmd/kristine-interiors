/* ============================================================
   Kristine Lepesko — Interior Design
   script.js
   ============================================================ */

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  // 1. NAVBAR SCROLL EFFECT
  // ──────────────────────────────────────────────
  const navbar = document.getElementById('navbar');

  function onScroll() {
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load


  // ──────────────────────────────────────────────
  // 2. HAMBURGER MENU
  // ──────────────────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');

  hamburger.addEventListener('click', function () {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Close menu when a nav link is clicked
  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', false);
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', function (e) {
    if (!navbar.contains(e.target)) {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', false);
    }
  });


  // ──────────────────────────────────────────────
  // 3. SMOOTH SCROLL
  // ──────────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const navHeight = navbar.offsetHeight;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight;

      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  });


  // ──────────────────────────────────────────────
  // 4. SCROLL REVEAL (fade-in on enter viewport)
  // ──────────────────────────────────────────────
  const fadeEls = document.querySelectorAll('.fade-in');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    fadeEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Fallback: just show everything
    fadeEls.forEach(function (el) {
      el.classList.add('visible');
    });
  }


  // ──────────────────────────────────────────────
  // 5. ACTIVE NAV LINK (highlight on scroll)
  // ──────────────────────────────────────────────
  const sections   = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-link');

  if ('IntersectionObserver' in window && navAnchors.length) {
    const activeObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navAnchors.forEach(function (a) {
              a.classList.toggle('active', a.getAttribute('href') === '#' + id);
            });
          }
        });
      },
      { threshold: 0.35 }
    );

    sections.forEach(function (section) {
      activeObserver.observe(section);
    });
  }


  // ──────────────────────────────────────────────
  // 6. LEAD FORM HANDLING
  // ──────────────────────────────────────────────
  const form       = document.getElementById('lead-form');
  const submitBtn  = document.getElementById('submit-btn');
  const btnText    = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  const successMsg = document.getElementById('form-success');

  function showError(input, message) {
    clearError(input);
    input.classList.add('error');
    const err = document.createElement('span');
    err.className = 'field-error';
    err.textContent = message;
    input.parentNode.appendChild(err);
  }

  function clearError(input) {
    input.classList.remove('error');
    const existing = input.parentNode.querySelector('.field-error');
    if (existing) existing.remove();
  }

  function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const nameInput  = form.querySelector('#name');
    const emailInput = form.querySelector('#email');
    let valid = true;

    clearError(nameInput);
    clearError(emailInput);

    if (!nameInput.value.trim()) {
      showError(nameInput, 'Please enter your name.');
      valid = false;
    }

    if (!emailInput.value.trim()) {
      showError(emailInput, 'Please enter your email address.');
      valid = false;
    } else if (!isValidEmail(emailInput.value.trim())) {
      showError(emailInput, 'Please enter a valid email address.');
      valid = false;
    }

    if (!valid) return;

    // Loading state
    submitBtn.disabled = true;
    btnText.hidden     = true;
    btnLoading.hidden  = false;

    // Simulate async submission (replace with real fetch() call later)
    setTimeout(function () {
      form.hidden        = true;
      successMsg.hidden  = false;
    }, 1500);
  });

  // Clear error on input
  form.querySelectorAll('input, textarea').forEach(function (el) {
    el.addEventListener('input', function () {
      clearError(el);
    });
  });


  // ──────────────────────────────────────────────
  // 7. WHATSAPP BUTTON — show after scrolling past hero
  // ──────────────────────────────────────────────
  const whatsappBtn  = document.getElementById('whatsapp-btn');
  const mobileBar   = document.getElementById('mobile-book-bar');
  const heroSection = document.getElementById('hero');

  if (heroSection) {
    const heroThreshold = heroSection.offsetTop + heroSection.offsetHeight;
    function updateFloatingVisibility() {
      const pastHero = window.scrollY >= heroThreshold;
      if (whatsappBtn) whatsappBtn.classList.toggle('visible', pastHero);
      if (mobileBar)   mobileBar.classList.toggle('visible', pastHero);
    }
    window.addEventListener('scroll', updateFloatingVisibility, { passive: true });
    updateFloatingVisibility();
  }


  // ──────────────────────────────────────────────
  // 8. PORTFOLIO LIGHTBOX
  // ──────────────────────────────────────────────
  const lightbox     = document.getElementById('lightbox');
  const lightboxImg  = document.getElementById('lightbox-img');
  const lightboxCap  = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');

  document.querySelectorAll('.portfolio-item').forEach(function (item) {
    item.addEventListener('click', function () {
      const img     = item.querySelector('img');
      const caption = item.getAttribute('data-title') || '';

      lightboxImg.src     = img.src.replace(/w=\d+/, 'w=1400');
      lightboxImg.alt     = img.alt;
      lightboxCap.textContent = caption;

      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      lightbox.focus();
    });
  });

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    lightboxImg.src = '';
  }

  lightboxClose.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });

})();
