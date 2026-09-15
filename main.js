async function loadComponents() {
    const components = [
        { id: 'topbar-component', url: 'layout/topbar.html' },
        { id: 'header-component', url: 'layout/header.html' },
        { id: 'footer-component', url: 'layout/footer.html' }
    ];

    for (let comp of components) {
        const el = document.getElementById(comp.id);
        if (el) {
            try {
                const cacheBuster = '?v=' + new Date().getTime();
                const response = await fetch(comp.url + cacheBuster);
                if (response.ok) {
                    el.innerHTML = await response.text();
                }
            } catch (e) {
                console.error('Error loading component:', comp.url, e);
            }
        }
    }

    // Set active link based on current page
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Dispatch event to initialize scripts
    document.dispatchEvent(new Event('ComponentsLoaded'));
}

loadComponents();

document.addEventListener('ComponentsLoaded', () => {
  // Cinematic Preloader Logic
  const preloader = document.getElementById('preloader');
  
  let currentLoaderInterval = null;
  let currentLoaderTimeout = null;

  function playPreloader(onComplete) {
    if (!preloader) return;
    
    if (currentLoaderInterval) clearInterval(currentLoaderInterval);
    if (currentLoaderTimeout) clearTimeout(currentLoaderTimeout);

    // Reset state
    preloader.classList.remove('fade-out');
    document.body.style.overflow = 'hidden';
    
    // Clone and replace the content to 100% reliably restart CSS animations
    const oldContent = preloader.querySelector('.preloader-content');
    oldContent.classList.remove('animate');
    const newContent = oldContent.cloneNode(true);
    oldContent.parentNode.replaceChild(newContent, oldContent);
    newContent.classList.add('animate');
    
    const percentEl = document.getElementById('preloaderPercent');
    const glowEl = document.getElementById('progressGlow');
    const sparksContainer = document.getElementById('preloaderSparks');
    
    let progress = 0;
    const duration = 250; 
    
    // Enable hardware-accelerated CSS transition for the progress bar
    glowEl.style.transition = `width ${duration}ms linear`;
    percentEl.textContent = '0%';
    glowEl.style.width = '0%';
    if (sparksContainer) sparksContainer.innerHTML = '';

    currentLoaderTimeout = setTimeout(() => {
      let startTime = null;
      
      // Trigger the CSS transition
      glowEl.style.width = '100%';

      function animateProgress(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        let progress = Math.min((elapsed / duration) * 100, 100);
        
        percentEl.textContent = Math.floor(progress) + '%';

        if (progress < 100) {
          currentLoaderInterval = requestAnimationFrame(animateProgress);
        } else {
          setTimeout(() => {
            if (onComplete) {
              onComplete();
            } else {
              preloader.classList.add('fade-out');
              document.body.style.overflow = 'auto';
            }
          }, 100);
        }
      }
      
      currentLoaderInterval = requestAnimationFrame(animateProgress);
    }, 150);
  }

  // Play immediately on load
  playPreloader();

  // Fix browser Back button (bfcache) freezing the loader
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      preloader.classList.add('fade-out');
      document.body.style.overflow = 'auto';
    }
  });

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


  // Premium Sticky Header
  const premiumHeader = document.getElementById('premiumHeader');
  if (premiumHeader) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        premiumHeader.classList.add('scrolled');
      } else {
        premiumHeader.classList.remove('scrolled');
      }
    });
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

  // Initialize AOS
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      once: true,
      offset: 100,
    });
  }

  // Update Footer Year dynamically
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

  // Premium Background Parallax & Firefly Particles for Why Choose Us
  const whyUsSection = document.getElementById('why-us');
  if (whyUsSection) {
    // 1. Grid Parallax
    whyUsSection.addEventListener('mousemove', (e) => {
      if (window.innerWidth > 992) {
        const x = (e.clientX / window.innerWidth - 0.5) * 15; // rotateY
        const y = (e.clientY / window.innerHeight - 0.5) * 15; // rotateX offset
        
        whyUsSection.style.setProperty('--grid-rotate-y', `${x}deg`);
        whyUsSection.style.setProperty('--grid-rotate-x', `${70 - y}deg`);
      }
    });

    // 2. Firefly Embers
    const particleCount = 40;
    const emberContainer = document.createElement('div');
    emberContainer.style.position = 'absolute';
    emberContainer.style.top = '0';
    emberContainer.style.left = '0';
    emberContainer.style.width = '100%';
    emberContainer.style.height = '100%';
    emberContainer.style.pointerEvents = 'none';
    emberContainer.style.zIndex = '2'; // Above grid, behind cards
    emberContainer.style.overflow = 'hidden';
    whyUsSection.appendChild(emberContainer);

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.classList.add('firefly-particle');
      particle.style.left = Math.random() * 100 + '%';
      
      // Randomize animation timing
      particle.style.animationDelay = (Math.random() * 15) + 's';
      particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
      
      // Randomize sway
      const sway = (Math.random() - 0.5) * 200;
      particle.style.setProperty('--sway-x', `${sway}px`);
      
      // Randomize colors (Fire palette)
      const colors = ['rgba(255, 59, 59, 0.8)', 'rgba(255, 170, 0, 0.8)', 'rgba(255, 200, 100, 0.6)'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      particle.style.backgroundColor = color;
      particle.style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}`;
      
      // Randomize size
      const size = Math.random() * 4 + 2;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      emberContainer.appendChild(particle);
    }
  }

  // 3. Floating Burning Matchsticks
  const whyUsForMatches = document.getElementById('why-us');
  if (whyUsForMatches) {
      const matchContainer = document.createElement('div');
      matchContainer.style.position = 'absolute';
      matchContainer.style.top = '0';
      matchContainer.style.left = '0';
      matchContainer.style.width = '100%';
      matchContainer.style.height = '100%';
      matchContainer.style.pointerEvents = 'none';
      matchContainer.style.zIndex = '3';
      matchContainer.style.overflow = 'hidden';
      whyUsForMatches.appendChild(matchContainer);

      const matchCount = 8;
      for (let i = 0; i < matchCount; i++) {
        const match = document.createElement('div');
        match.classList.add('floating-burning-match');
        match.style.left = Math.random() * 100 + '%';
        
        const delay = -(Math.random() * 30); // Negative delay spawns them instantly on screen
        const duration = Math.random() * 15 + 15;
        
        match.style.setProperty('--match-delay', `${delay}s`);
        match.style.setProperty('--match-duration', `${duration}s`);
        
        const sway = (Math.random() - 0.5) * 400;
        match.style.setProperty('--sway-x', `${sway}px`);
        
        // Full 360+ Tumbling logic
        const startRot = Math.random() * 360; 
        const rotations = Math.floor(Math.random() * 3) + 1; // 1 to 3 full rotations
        const endRot = startRot + (Math.random() > 0.5 ? 360 * rotations : -360 * rotations); 
        match.style.setProperty('--start-rot', `${startRot}deg`);
        match.style.setProperty('--end-rot', `${endRot}deg`);
        
        const scale = Math.random() * 0.4 + 0.5; // Scale down for depth
        match.style.setProperty('--match-scale', `${scale}`);

        // The Stick Wrapper (handles the tumbling)
        const stickWrapper = document.createElement('div');
        stickWrapper.classList.add('fbm-stick-wrapper');

        // The Stick itself (Pure CSS realistic wood)
        const stick = document.createElement('div');
        stick.classList.add('fbm-stick');
        
        // The Ash/Burnt trail
        const burntTrail = document.createElement('div');
        burntTrail.classList.add('fbm-burnt-trail');
        
        // The glowing ember at the burn line
        const ember = document.createElement('div');
        ember.classList.add('fbm-ember-glow');
        
        // The Head
        const head = document.createElement('div');
        head.classList.add('fbm-head');
        
        // The Flame Container (travels along stick, counter-tumbles to stay upright)
        const flameContainer = document.createElement('div');
        flameContainer.classList.add('fbm-flame-container');
        
        const flameMain = document.createElement('div');
        flameMain.classList.add('fbm-flame-main');
        
        const flameLickLeft = document.createElement('div');
        flameLickLeft.classList.add('fbm-flame-lick', 'left');
        
        const flameLickRight = document.createElement('div');
        flameLickRight.classList.add('fbm-flame-lick', 'right');
        
        const flameBase = document.createElement('div');
        flameBase.classList.add('fbm-flame-base');
        
        flameContainer.appendChild(flameMain);
        flameContainer.appendChild(flameLickLeft);
        flameContainer.appendChild(flameLickRight);
        flameContainer.appendChild(flameBase);
        
        stickWrapper.appendChild(stick);
        stickWrapper.appendChild(head);
        stickWrapper.appendChild(burntTrail);
        stickWrapper.appendChild(ember);
        stickWrapper.appendChild(flameContainer);
        
        match.appendChild(stickWrapper);
        matchContainer.appendChild(match);
      }
  }

