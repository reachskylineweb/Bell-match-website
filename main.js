async function loadComponents() {
    const components = [
        { id: 'topbar-component', url: 'layout/topbar.html' },
        { id: 'header-component', url: 'layout/header.html' },
        { id: 'footer-component', url: 'layout/footer.html' }
    ];

    await Promise.all(components.map(async comp => {
        const el = document.getElementById(comp.id);
        if (el) {
            try {
                const response = await fetch(comp.url);
                if (response.ok) {
                    el.innerHTML = await response.text();
                }
            } catch (e) {
                console.error('Error loading component:', comp.url, e);
            }
        }
    }));

    // Set active link based on current page
    function syncActiveNavLinks() {
        let rawPath = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';
        rawPath = rawPath.split('?')[0].split('#')[0];
        const cleanPath = rawPath.replace(/\.html$/, '').toLowerCase();
        const isHome = cleanPath === '' || cleanPath === 'index';

        // Update main links (desktop & mobile)
        document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
            link.classList.remove('active');
            const href = (link.getAttribute('href') || '').split('?')[0].split('#')[0];
            const cleanHref = href.replace(/\.html$/, '').replace(/^\//, '').toLowerCase();

            if (isHome && (cleanHref === '' || cleanHref === 'index')) {
                link.classList.add('active');
            } else if (!isHome && cleanHref && cleanHref === cleanPath) {
                link.classList.add('active');
            }
        });

        // Dropdown toggle handling: if on About Us or Certifications, highlight dropdown toggle
        const isAboutSection = cleanPath === 'about' || cleanPath === 'certifications';
        if (isAboutSection) {
            document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
                toggle.classList.add('active');
            });
        }

        // Dropdown sub-items handling
        document.querySelectorAll('.dropdown-item, .mobile-dropdown-item').forEach(item => {
            item.classList.remove('active');
            const href = (item.getAttribute('href') || '').split('?')[0].split('#')[0];
            const cleanHref = href.replace(/\.html$/, '').replace(/^\//, '').toLowerCase();
            if (cleanHref && cleanHref === cleanPath) {
                item.classList.add('active');
            }
        });
    }

    syncActiveNavLinks();

    // Dispatch event to initialize scripts
    document.dispatchEvent(new Event('ComponentsLoaded'));
}

loadComponents();

// Cinematic Preloader Logic - starts immediately so it never freezes at 0%
(function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const content = preloader.querySelector('.preloader-content');
  if (content && !content.classList.contains('animate')) {
    content.classList.add('animate');
  }

  const percentEl = document.getElementById('preloaderPercent');
  const glowEl = document.getElementById('progressGlow');

  let startTime = null;
  const duration = 400; // Smooth 400ms progress

  function animateProgress(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min((elapsed / duration) * 100, 100);

    if (percentEl) percentEl.textContent = Math.floor(progress) + '%';
    if (glowEl) glowEl.style.width = progress + '%';

    if (progress < 100) {
      requestAnimationFrame(animateProgress);
    } else {
      setTimeout(() => {
        preloader.classList.add('fade-out');
        document.body.style.overflow = '';
      }, 40);
    }
  }

  requestAnimationFrame(animateProgress);

  // Fix browser Back button (bfcache) freezing the loader
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      preloader.classList.add('fade-out');
      document.body.style.overflow = '';
    }
  });
})();

document.addEventListener('ComponentsLoaded', () => {
  initContactModal();

  // Premium Mobile Menu Toggle
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileNav = document.getElementById('mobileNav');
  
  if (mobileMenuToggle && mobileNav) {
    mobileMenuToggle.addEventListener('click', () => {
      mobileMenuToggle.classList.toggle('active');
      mobileNav.classList.toggle('active');
    });
  }

  const mobileMenuClose = document.getElementById('mobileMenuClose');
  if (mobileMenuClose && mobileNav) {
    mobileMenuClose.addEventListener('click', () => {
      mobileMenuToggle.classList.remove('active');
      mobileNav.classList.remove('active');
    });
  }

  // Dropdown Logic
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = toggle.parentElement;
      parent.classList.toggle('active');
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown') && !e.target.closest('.mobile-dropdown')) {
      document.querySelectorAll('.nav-dropdown.active, .mobile-dropdown.active').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });


  // Premium Smart Header - Hide on Scroll Down, Reveal on Scroll Up (All Displays)
  const headerComponent = document.getElementById('header-component');
  const premiumHeader = document.getElementById('premiumHeader');
  
  if (headerComponent || premiumHeader) {
    let lastScrollY = window.scrollY;
    
    function updateHeaderHeightVar() {
      const h = headerComponent ? headerComponent.offsetHeight : (premiumHeader ? premiumHeader.offsetHeight : 70);
      if (h > 0) {
        document.documentElement.style.setProperty('--header-height', h + 'px');
      }
    }
    updateHeaderHeightVar();
    window.addEventListener('resize', updateHeaderHeightVar, { passive: true });
    
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      
      // Scrolled state styling (blur / border)
      if (premiumHeader) {
        if (currentScrollY > 50) {
          premiumHeader.classList.add('scrolled');
        } else {
          premiumHeader.classList.remove('scrolled');
        }
      }
      
      // Near top of page, keep header visible
      if (currentScrollY <= 60) {
        document.body.classList.remove('header-is-hidden');
        if (headerComponent) headerComponent.classList.remove('header-hidden');
        if (premiumHeader) premiumHeader.classList.remove('header-hidden');
        lastScrollY = currentScrollY;
        return;
      }
      
      // Do not hide while mobile menu is open
      if (typeof mobileNav !== 'undefined' && mobileNav && mobileNav.classList.contains('active')) {
        lastScrollY = currentScrollY;
        return;
      }
      
      const delta = currentScrollY - lastScrollY;
      
      if (delta > 6) {
        // Scrolling DOWN -> Hide header, sticky sections slide up to 0px
        document.body.classList.add('header-is-hidden');
        if (headerComponent) headerComponent.classList.add('header-hidden');
        if (premiumHeader) premiumHeader.classList.add('header-hidden');
      } else if (delta < -6) {
        // Scrolling UP -> Reveal header immediately, sticky sections sit below header
        document.body.classList.remove('header-is-hidden');
        if (headerComponent) headerComponent.classList.remove('header-hidden');
        if (premiumHeader) premiumHeader.classList.remove('header-hidden');
      }
      
      lastScrollY = currentScrollY;
    }, { passive: true });
  }

  // Back to Top Button
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    });
    
    backToTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // Minimal Particle Effect
  const particlesContainer = document.getElementById('particles');
  if (particlesContainer) {
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.style.position = 'absolute';
      particle.style.width = Math.random() * 4 + 2 + 'px';
      particle.style.height = particle.style.width;
      particle.style.background = 'rgba(255, 255, 255, 0.4)';
      particle.style.borderRadius = '50%';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animation = `float ${Math.random() * 3 + 2}s infinite ease-in-out`;
      particle.style.animationDelay = `${Math.random() * 2}s`;
      particlesContainer.appendChild(particle);
    }
  }

  // Initialize AOS (Disabled for instant frame-0 rendering and zero layout shift)
  if (typeof AOS !== 'undefined') {
    AOS.init({
      disable: true
    });
  }

  // Update Footer Year dynamically
  
  // Why Choose Us: Continuous Unbroken Traveling Line on Scroll
  const whyUsRail = document.querySelector('.why-us-scroll-rail');
  if (whyUsRail) {
    const stations = whyUsRail.querySelectorAll('.why-us-station');

    function updateWhyUsRail() {
      const railRect = whyUsRail.getBoundingClientRect();
      const viewportH = window.innerHeight;
      
      // Starts traveling when rail top reaches 65% of viewport and finishes when bottom reaches 35%
      const startTrigger = viewportH * 0.65;
      const endTrigger = viewportH * 0.35;
      const distanceScrolled = startTrigger - railRect.top;
      const totalTravelDistance = railRect.height - (endTrigger - startTrigger);
      
      let progress = distanceScrolled / totalTravelDistance;
      progress = Math.max(0, Math.min(1, progress));
      
      whyUsRail.style.setProperty('--why-us-scroll-progress', (progress * 100).toFixed(2) + '%');

      // Light up each station continuously as the unbroken line travels past it
      stations.forEach(station => {
        const sRect = station.getBoundingClientRect();
        if (sRect.top <= startTrigger + 20) {
          station.classList.add('is-active');
        } else {
          station.classList.remove('is-active');
        }
      });
    }

    window.addEventListener('scroll', updateWhyUsRail, { passive: true });
    window.addEventListener('resize', updateWhyUsRail, { passive: true });
    updateWhyUsRail();
  }

  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

});

  // Premium 3D Tilt Effect for Bento Cards
  const bentoCards = document.querySelectorAll('.bento-card');
  bentoCards.forEach(card => {
    // Only apply on desktop to avoid weird mobile touch behaviors
    if (window.innerWidth > 992) {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Max tilt of 8 degrees for a premium, subtle feel
        const rotateX = ((y - centerY) / centerY) * -8; 
        const rotateY = ((x - centerX) / centerX) * 8;
        
        card.style.transition = 'transform 0.1s ease-out';
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        
        // Enhance the existing spotlight effect by making it follow the mouse exactly
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s ease-out';
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });
      
      card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform 0.1s ease-out';
      });
    }
  });

  // Why Choose Us background animations completely removed per user instruction

/* ============================================================
   HERO PURE CODE ANIMATION: PHOTOREALISTIC CANVAS FLAME & SPARKS ENGINE
   Matching Image 2 (Soft Rounded Organic Matchstick Flame)
   Strike Path: Starts at black honeycomb structure and strikes along 70% of strip
   Page Load: Auto-strikes & lights into flame; subsequent taps toggle on/off
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const scene = document.getElementById('codeMatchScene');
  const actor = document.getElementById('codeMatchstickActor');
  const head = document.getElementById('splintHead');
  const canvas = document.getElementById('matchFlameCanvas');
  const firelight = document.getElementById('sceneFirelight');
  const charGlow = document.getElementById('splintCharGlow');
  const strikerGlow = document.getElementById('strikerFrictionGlow');

  if (!scene || !actor || !head || !canvas) return;

  const ctx = canvas.getContext('2d');
  let dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    const rect = scene.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
  resizeCanvas();
  window.addEventListener('resize', () => {
    dpr = window.devicePixelRatio || 1;
    resizeCanvas();
  });

  // Particle systems
  const sparks = [];
  const smokeParticles = [];

  class SparkParticle {
    constructor(x, y, isBurst = false, dirX = 0, dirY = 0) {
      this.x = x;
      this.y = y;
      this.prevX = x;
      this.prevY = y;
      if (isBurst) {
        const baseAngle = (dirX !== 0 || dirY !== 0)
          ? Math.atan2(dirY, dirX)
          : -Math.PI * 0.5;
        const angle = baseAngle + (Math.random() - 0.5) * 0.9;
        const speed = 4 + Math.random() * 8.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.gravity = 0.22;
        this.life = 1.0;
        this.decay = 0.035 + Math.random() * 0.03;
      } else {
        this.vx = (Math.random() - 0.5) * 1.4;
        this.vy = -(1.8 + Math.random() * 2.8);
        this.gravity = -0.02;
        this.life = 1.0;
        this.decay = 0.022 + Math.random() * 0.025;
      }
    }
    update() {
      this.prevX = this.x;
      this.prevY = this.y;
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.vx *= 0.97;
      this.life -= this.decay;
    }
    draw(ctx) {
      if (this.life <= 0) return;
      const alpha = Math.max(0, Math.min(1, this.life));
      ctx.strokeStyle = `rgba(255, 235, 160, ${alpha})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(this.prevX, this.prevY);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 140, 0, ${0.45 * alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  class SmokeParticle {
    constructor(x, y) {
      this.x = x + (Math.random() - 0.5) * 6;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = -(1.6 + Math.random() * 1.8);
      this.radius = 3 + Math.random() * 4;
      this.life = 1.0;
      this.decay = 0.018 + Math.random() * 0.014;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.radius += 0.35;
      this.life -= this.decay;
    }
    draw(ctx) {
      if (this.life <= 0) return;
      ctx.fillStyle = `rgba(200, 200, 210, ${this.life * 0.28})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // State
  let isLit = false;
  let isStriking = false;
  let currentIntensity = 0;
  let targetIntensity = 0;
  let strikeStartTime = 0;

  // Strike along honeycomb:
  // Starts at honeycomb start (0%) -> strikes across 85% of strip at smooth deliberate speed -> ignites into flame
  function doStrike() {
    if (isStriking) return;
    isStriking = true;
    currentIntensity = 0;
    targetIntensity = 0;

    // Step 1: Position at start of honeycomb strip (0%, exact vertical center)
    actor.style.transition = 'transform 0.3s ease-out';
    actor.style.transform = 'translate(-28px, 55px) rotate(20deg)';

    // Step 2: Strike swipe across 85% of the honeycomb strip at smooth, realistic deliberate speed
    setTimeout(() => {
      strikeStartTime = performance.now();
      actor.style.transition = 'transform 0.85s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      actor.style.transform = 'translate(170px, 7px) rotate(15deg)';
    }, 300);

    // Step 3: Ignition Burst right at the 85% mark!
    setTimeout(() => {
      isLit = true;
      targetIntensity = 1.05;
      if (charGlow) charGlow.style.opacity = '1';

      const sceneRect = scene.getBoundingClientRect();
      const headRect = head.getBoundingClientRect();
      const hX = headRect.left - sceneRect.left + headRect.width / 2;
      const hY = headRect.top - sceneRect.top + headRect.height / 2;
      for (let i = 0; i < 22; i++) {
        sparks.push(new SparkParticle(hX, hY, true));
      }
    }, 1150);

    // Complete strike
    setTimeout(() => {
      isStriking = false;
    }, 1350);
  }

  function doStop() {
    if (isStriking) return;
    isLit = false;
    targetIntensity = 0;
    if (charGlow) charGlow.style.opacity = '0';

    const sceneRect = scene.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    const hX = headRect.left - sceneRect.left + headRect.width / 2;
    const hY = headRect.top - sceneRect.top + headRect.height / 2;
    for (let i = 0; i < 8; i++) {
      smokeParticles.push(new SmokeParticle(hX, hY));
    }
  }

  // User Interaction: Tap toggles strike/ignite and stop
  scene.addEventListener('click', () => {
    if (isStriking) return;
    if (isLit) {
      doStop();
    } else {
      doStrike();
    }
  });

  // Page start: Auto-strike and ignite into flame
  setTimeout(() => {
    doStrike();
  }, 450);

  // Authentic Soft-Rounded Matchstick Flame (Matching Image 2 - NOT sharp/needle)
  function drawRealisticMatchFlame(ctx, x, y, intensity) {
    if (intensity <= 0.01) return;
    const now = performance.now();
    const t = now * 0.0065;
    const sway = Math.sin(t * 2.6) * 1.5;
    const flickerH = Math.sin(t * 3.8) * 1.8;
    const h = 86 * intensity;
    const w = 32 * intensity;

    ctx.save();
    ctx.translate(x, y);

    // 1. Ambient Firelight Glow (Illuminates on desktop only; disabled on mobile to eliminate side glow)
    if (window.innerWidth > 991) {
      ctx.globalCompositeOperation = 'screen';
      const bloom = ctx.createRadialGradient(0, -h * 0.45, 0, 0, -h * 0.45, h * 1.5);
      bloom.addColorStop(0, 'rgba(255, 140, 20, 0.42)');
      bloom.addColorStop(0.35, 'rgba(255, 60, 0, 0.16)');
      bloom.addColorStop(0.7, 'rgba(255, 30, 0, 0.04)');
      bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(0, -h * 0.45, h * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Outer Fiery Combustion Mantel with Soft Rounded Dome Apex
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.moveTo(-w * 0.42, 2);
    // Left curve rising up
    ctx.bezierCurveTo(-w * 0.76, -h * 0.32, -w * 0.45 + sway, -h * 0.75, -w * 0.16 + sway, -h * 0.94 - flickerH);
    // Smooth rounded dome tip (Soft & organic, eliminating sharp needle point)
    ctx.bezierCurveTo(-w * 0.08 + sway, -h - flickerH, w * 0.08 + sway, -h - flickerH, w * 0.16 + sway, -h * 0.94 - flickerH);
    // Right curve descending down
    ctx.bezierCurveTo(w * 0.45 + sway, -h * 0.75, w * 0.76, -h * 0.32, w * 0.42, 2);
    // Base wrapping around match head
    ctx.bezierCurveTo(w * 0.2, 5, -w * 0.2, 5, -w * 0.42, 2);
    ctx.closePath();

    const outerGrad = ctx.createLinearGradient(0, 5, 0, -h);
    outerGrad.addColorStop(0, '#e62400');
    outerGrad.addColorStop(0.2, '#ff4500');
    outerGrad.addColorStop(0.55, '#ff7700');
    outerGrad.addColorStop(0.85, '#ff9900');
    outerGrad.addColorStop(1, '#ffb300');
    ctx.fillStyle = outerGrad;
    ctx.fill();

    // 3. Middle Incandescent Golden Flame (Smooth blended glow)
    ctx.globalCompositeOperation = 'screen';
    ctx.beginPath();
    const mW = w * 0.7;
    const mH = h * 0.8;
    ctx.moveTo(-mW * 0.38, 1);
    ctx.bezierCurveTo(-mW * 0.68, -mH * 0.32, -mW * 0.4 + sway * 0.7, -mH * 0.75, -mW * 0.14 + sway * 0.7, -mH * 0.94);
    ctx.bezierCurveTo(-mW * 0.06 + sway * 0.7, -mH, mW * 0.06 + sway * 0.7, -mH, mW * 0.14 + sway * 0.7, -mH * 0.94);
    ctx.bezierCurveTo(mW * 0.4 + sway * 0.7, -mH * 0.75, mW * 0.68, -mH * 0.32, mW * 0.38, 1);
    ctx.closePath();

    const midGrad = ctx.createLinearGradient(0, 2, 0, -mH);
    midGrad.addColorStop(0, '#ff5500');
    midGrad.addColorStop(0.25, '#ff9900');
    midGrad.addColorStop(0.65, '#ffcc00');
    midGrad.addColorStop(0.9, '#ffea55');
    midGrad.addColorStop(1, '#fff5b0');
    ctx.fillStyle = midGrad;
    ctx.fill();

    // 4. Inner White-Hot Luminous Core (Soft rounded tip)
    ctx.beginPath();
    const cW = w * 0.4;
    const cH = h * 0.56;
    ctx.moveTo(-cW * 0.32, 0);
    ctx.bezierCurveTo(-cW * 0.58, -cH * 0.3, -cW * 0.3 + sway * 0.4, -cH * 0.78, -cW * 0.1 + sway * 0.4, -cH * 0.95);
    ctx.bezierCurveTo(-cW * 0.04 + sway * 0.4, -cH, cW * 0.04 + sway * 0.4, -cH, cW * 0.1 + sway * 0.4, -cH * 0.95);
    ctx.bezierCurveTo(cW * 0.3 + sway * 0.4, -cH * 0.78, cW * 0.58, -cH * 0.3, cW * 0.32, 0);
    ctx.closePath();

    const coreGrad = ctx.createLinearGradient(0, 1, 0, -cH);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.6, '#ffffff');
    coreGrad.addColorStop(0.9, '#fffbd6');
    coreGrad.addColorStop(1, '#ffe885');
    ctx.fillStyle = coreGrad;
    ctx.fill();

    ctx.restore();
  }

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const sceneRect = scene.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    const headX = headRect.left - sceneRect.left + headRect.width / 2;
    const headY = headRect.top - sceneRect.top + headRect.height / 2;

    ctx.clearRect(0, 0, sceneRect.width, sceneRect.height);

    // Smooth intensity interpolation for gentle on/off transitions
    currentIntensity += (targetIntensity - currentIntensity) * 0.12;

    // Handle friction sparks while scraping across the honeycomb strip
    if (isStriking) {
      const elapsed = now - strikeStartTime;
      if (elapsed >= 60 && elapsed <= 820) {
        // Friction scrape phase: spray sparks backwards along strip
        for (let i = 0; i < 2; i++) {
          sparks.push(new SparkParticle(headX, headY, true, -0.7, -0.4));
        }
      }
    }

    // Update Charred Wood Glow & Scene Firelight
    if (currentIntensity > 0.05) {
      if (firelight) firelight.style.opacity = (currentIntensity * 0.85).toFixed(2);

      // Occasional gentle buoyant spark
      if (Math.random() < 0.14 * currentIntensity) {
        sparks.push(new SparkParticle(headX, headY - 25, false));
      }

      // Render the Photorealistic Matchstick Flame (Matching Image 2)
      drawRealisticMatchFlame(ctx, headX, headY, currentIntensity);
    } else {
      if (firelight) firelight.style.opacity = '0';
    }

    // Render Smoke Particles (e.g. When extinguished)
    ctx.globalCompositeOperation = 'source-over';
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
      const p = smokeParticles[i];
      p.update();
      p.draw(ctx);
      if (p.life <= 0) smokeParticles.splice(i, 1);
    }

    // Render Sparks
    ctx.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.update();
      s.draw(ctx);
      if (s.life <= 0) sparks.splice(i, 1);
    }
  }

  requestAnimationFrame(animate);
});

// Quick Contact Modal Controller
function initContactModal() {
  const overlay = document.getElementById('contactModalOverlay');
  const closeBtn = document.getElementById('contactModalClose');
  const form = document.getElementById('contactModalForm');
  const statusMsg = document.getElementById('cmStatusMsg');
  const submitBtn = document.getElementById('cmSubmitBtn');

  function openModal() {
    if (!overlay) return;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Intercept any click on Contact Us floating buttons or quote pills
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.quote-pill, [data-open-contact-modal]');
    if (trigger) {
      e.preventDefault();
      openModal();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
      closeModal();
    }
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!submitBtn || !statusMsg) return;
      
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Sending...</span> <i class="fas fa-spinner fa-spin"></i>';
      statusMsg.className = 'cm-status-msg';
      statusMsg.style.display = 'none';

      try {
        const formData = new FormData(form);
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();

        if (data.success) {
          statusMsg.className = 'cm-status-msg success';
          statusMsg.textContent = 'Thank you! Your message has been sent successfully.';
          statusMsg.style.display = 'block';
          form.reset();
          setTimeout(() => {
            closeModal();
            statusMsg.style.display = 'none';
          }, 3000);
        } else {
          statusMsg.className = 'cm-status-msg error';
          statusMsg.textContent = data.message || 'Something went wrong. Please try again.';
          statusMsg.style.display = 'block';
        }
      } catch (err) {
        statusMsg.className = 'cm-status-msg error';
        statusMsg.textContent = 'Connection error. Please try again or WhatsApp us.';
        statusMsg.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
}
