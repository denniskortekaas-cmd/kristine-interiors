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
    // hero-cream: the floor plan opening is light, so the logo and the menu
    // need their dark state even before the usual 80px of scrolling. They do
    // not need the solid bar behind them though: a cream strip over cream
    // paper still reads as a band, so on-light keeps the bar see-through.
    var onCream = document.body.classList.contains('hero-cream');
    var pastTop = window.scrollY > 80;
    navbar.classList.toggle('scrolled', pastTop || onCream);
    navbar.classList.toggle('on-light', onCream && !pastTop);
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

    var data = {
      name:           form.querySelector('#name').value.trim(),
      email:          form.querySelector('#email').value.trim(),
      phone:          form.querySelector('#phone').value.trim(),
      'project-type': form.querySelector('#project-type').value,
      budget:         form.querySelector('#budget').value,
      message:        form.querySelector('#message').value.trim(),
    };

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);

    fetch('/submit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
      signal:  controller.signal,
    })
    .then(function (r) { clearTimeout(timeout); return r.json(); })
    .then(function (res) {
      if (res.ok) {
        form.style.display = 'none';
        successMsg.hidden  = false;
        if (typeof fbq === 'function') fbq('track', 'Lead');
      } else {
        btnText.hidden     = false;
        btnLoading.hidden  = true;
        submitBtn.disabled = false;
        alert('Something went wrong. Please try again or email us directly.');
      }
    })
    .catch(function () {
      clearTimeout(timeout);
      btnText.hidden     = false;
      btnLoading.hidden  = true;
      submitBtn.disabled = false;
      alert('Something went wrong. Please try again or email us directly.');
    });
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



  // ──────────────────────────────────────────────
  // VIDEO HERO
  // The floor plan rises, the camera dives into the apartment and lands in
  // the living room. It plays once by itself and stops on the last frame,
  // which is the room the hero photo always showed. If anything here does
  // not hold up we never switch it on and the photo hero stays.
  // ──────────────────────────────────────────────
  (function () {
    var video = document.getElementById('hero-video');
    if (!video) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // A landscape clip on an upright screen is cropped so hard that the floor
    // plan stops reading as a plan, so an upright screen gets its own cut.
    var upright = window.innerHeight > window.innerWidth * 1.15;
    var source = video.getAttribute(upright ? 'data-tall' : 'data-wide');
    var poster = video.getAttribute(upright ? 'data-tall-poster' : 'data-wide-poster');
    if (!source) return;

    var LIGHT_UNTIL = 0.24;  // the picture is cream paper: the nav needs its solid state
    var TEXT_FROM   = 0.45;  // the camera is on its way in: the words arrive
    var cream = null;
    var quiet = null;

    function phase() {
      var d = video.duration || 0;
      var at = d ? video.currentTime / d : 0;

      var isQuiet = at < TEXT_FROM;
      if (isQuiet !== quiet) {
        quiet = isQuiet;
        document.body.classList.toggle('hero-quiet', isQuiet);
      }

      var isCream = d ? at < LIGHT_UNTIL : true;
      if (isCream !== cream) {
        cream = isCream;
        document.body.classList.toggle('hero-cream', isCream);
        onScroll(); // the navbar follows the same switch
      }
    }

    function settle() {
      document.body.classList.remove('hero-cream', 'hero-quiet');
      cream = false;
      quiet = false;
      onScroll();
    }

    // If the video has not arrived within a few seconds it is not worth
    // swapping the hero out any more, so we leave the photo alone.
    var givenUp = false;
    var deadline = setTimeout(function () {
      if (video.readyState >= 2) return;   // al bruikbaar, laat maar lopen
      givenUp = true;
      release();                            // foto terug, woorden terug
    }, 4000);

    video.addEventListener('timeupdate', phase);

    video.addEventListener('loadeddata', function () {
      if (!video.duration || givenUp) return;
      clearTimeout(deadline);
      clearTimeout(window.__heroRelease);   // the inline safety catch can stand down
      phase();

      var playing = video.play();
      if (playing && typeof playing.catch === 'function') {
        playing.catch(function () {
          // Autoplay refused: hold the last frame, which is her living room,
          // rather than leaving a flat drawing and no words on screen.
          video.currentTime = Math.max(0, video.duration - 0.05);
          settle();
        });
      }
    });

    video.addEventListener('ended', settle);

    // The film is a one-off on arrival. A phone pauses it the moment you leave
    // the tab, so coming back would otherwise drop you on a frozen frame with
    // no words on it. Whenever that happens we jump straight to the end: the
    // room, with the headline over it, which is where the film was heading.
    function finish() {
      if (!video.duration || video.ended) return;
      try {
        video.pause();
        video.currentTime = Math.max(0, video.duration - 0.05);
      } catch (e) {}
      settle();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') finish();
    });

    // Coming back through the back button restores the page as it was parked
    window.addEventListener('pageshow', function (e) { if (e.persisted) finish(); });

    // And if playback stops on its own, without any event to tell us
    var watchdog = setInterval(function () {
      if (!document.body.classList.contains('hero-video-on')) { clearInterval(watchdog); return; }
      if (video.ended || !video.duration) { clearInterval(watchdog); return; }
      if (video.paused && video.currentTime > 0) { clearInterval(watchdog); finish(); }
    }, 1200);

    // Hand the hero back to the photo, whatever went wrong. The photo is always
    // there underneath, so this only has to put the words and the overlay back.
    function release() {
      clearTimeout(window.__heroRelease);
      document.body.classList.remove('hero-video-on', 'hero-waiting', 'hero-cream', 'hero-quiet');
      video.classList.remove('ready');
      cream = null;
      quiet = null;
      onScroll();
    }

    ['error', 'abort'].forEach(function (name) {
      video.addEventListener(name, release);
    });

    // Claim the hero before anything is downloaded. Without this the photo
    // underneath is on screen for a moment, so you would see the room the film
    // ends on before the film has begun. The poster is the film's own first
    // frame, so the first thing painted is already the drawing.
    // The inline script at the top of the page already put these on, so that
    // the photo never flashes. This keeps them on for the browsers that
    // skipped it, and matches the bookkeeping either way.
    document.body.classList.add('hero-video-on', 'hero-waiting', 'hero-cream', 'hero-quiet');
    cream = true;
    quiet = true;
    onScroll();

    if (poster) video.poster = poster;
    video.classList.add('ready');
    video.src = source;
    video.preload = 'auto';
    video.load();
  })();

})();
