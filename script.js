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
  const whatsappBtn        = document.getElementById('whatsapp-btn');
  const mobileBar          = document.getElementById('mobile-book-bar');
  const heroSection        = document.getElementById('hero');
  const testimonialSection = document.getElementById('testimonial');

  if (heroSection) {
    const heroThreshold = heroSection.offsetTop + heroSection.offsetHeight;
    function updateFloatingVisibility() {
      const pastHero       = window.scrollY >= heroThreshold;
      const atHalfTestimonial = testimonialSection &&
        testimonialSection.getBoundingClientRect().top <= -(testimonialSection.offsetHeight * 0.5);
      if (whatsappBtn) whatsappBtn.classList.toggle('visible', pastHero);
      if (mobileBar)   mobileBar.classList.toggle('visible', pastHero && !atHalfTestimonial);
    }
    window.addEventListener('scroll', updateFloatingVisibility, { passive: true });
    updateFloatingVisibility();
  }


  // ──────────────────────────────────────────────
  // 8. PORTFOLIO LIGHTBOX
  // ──────────────────────────────────────────────
  var projects = [
    {
      name: 'Park Horizon · 3 Bedroom, Dubai Hills Estate',
      images: [
        'images/park-horizon-cover.JPG',
        'images/park-horizon-2.JPG',
        'images/park-horizon-3.JPG',
        'images/park-horizon-4.JPG',
        'images/park-horizon-5.jpeg',
        'images/park-horizon-6.jpeg',
        'images/park-horizon-7.JPG'
      ]
    },
    {
      name: 'Sobha Hartland, Crest A · 1 Bedroom',
      images: [
        'images/sobha-hartland-cover.jpeg',
        'images/sobha-hartland-2.jpeg',
        'images/sobha-hartland-3.jpeg',
        'images/sobha-hartland-4.jpeg',
        'images/sobha-hartland-5.jpeg',
        'images/sobha-hartland-6.jpeg'
      ]
    },
    {
      name: 'Park Horizon · 2 Bedroom, Dubai Hills Estate',
      images: [
        'images/park-horizon-2bed-cover.jpeg',
        'images/park-horizon-2bed-2.jpeg',
        'images/park-horizon-2bed-3.jpeg',
        'images/park-horizon-2bed-4.jpeg',
        'images/park-horizon-2bed-5.jpeg',
        'images/park-horizon-2bed-6.jpeg'
      ]
    },
    {
      name: 'Residence 29, District One · 1 Bedroom',
      images: [
        'images/district-one-cover.jpeg',
        'images/district-one-2.jpeg',
        'images/district-one-3.jpeg',
        'images/district-one-4.jpeg',
        'images/district-one-5.jpeg',
        'images/district-one-6.jpeg'
      ]
    }
  ];

  var lightbox      = document.getElementById('lightbox');
  var lightboxImg   = document.getElementById('lightbox-img');
  var lightboxCap   = document.getElementById('lightbox-caption');
  var lightboxCount = document.getElementById('lightbox-counter');
  var lightboxClose = document.getElementById('lightbox-close');
  var lightboxPrev  = document.getElementById('lightbox-prev');
  var lightboxNext  = document.getElementById('lightbox-next');

  var currentProject = 0;
  var currentIndex   = 0;

  function showImage(projectIdx, imgIdx) {
    var project = projects[projectIdx];
    imgIdx = (imgIdx + project.images.length) % project.images.length;
    currentProject = projectIdx;
    currentIndex   = imgIdx;
    lightboxImg.src = project.images[imgIdx];
    lightboxImg.alt = project.name;
    lightboxCap.textContent = project.name;
    lightboxCount.textContent = (imgIdx + 1) + ' / ' + project.images.length;
  }

  function openLightbox(projectIdx) {
    showImage(projectIdx, 0);
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    // Preload all images for this project
    projects[projectIdx].images.forEach(function (src) {
      var img = new Image();
      img.src = src;
    });
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    lightboxImg.src = '';
  }

  document.querySelectorAll('.project-card').forEach(function (card) {
    card.addEventListener('click', function () {
      openLightbox(parseInt(card.getAttribute('data-project'), 10));
    });
  });

  lightboxPrev.addEventListener('click', function (e) {
    e.stopPropagation();
    showImage(currentProject, currentIndex - 1);
  });

  lightboxNext.addEventListener('click', function (e) {
    e.stopPropagation();
    showImage(currentProject, currentIndex + 1);
  });

  lightboxClose.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (lightbox.hidden) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   showImage(currentProject, currentIndex - 1);
    if (e.key === 'ArrowRight')  showImage(currentProject, currentIndex + 1);
  });

  // Touch swipe support
  var touchStartX = 0;
  lightbox.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  lightbox.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) showImage(currentProject, currentIndex + 1);
    else         showImage(currentProject, currentIndex - 1);
  }, { passive: true });

  // ──────────────────────────────────────────────
  // 9. FOOTER COLLAPSIBLE SECTIONS (mobile)
  // ──────────────────────────────────────────────
  document.querySelectorAll('.footer-toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var col = toggle.closest('.footer-collapsible');
      col.classList.toggle('open');
    });
  });

})();
