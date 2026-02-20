/**
 * XueTong UI Enhancements
 * Mobile App Style Interactions & Animations
 */

// ========================================
// Page Transition Effects
// ========================================
const PageTransitions = {
  fadeIn: (element) => {
    element.classList.remove('hidden');
    element.classList.add('animate-fade-in');
    setTimeout(() => {
      element.classList.remove('animate-fade-in');
    }, 300);
  },

  slideUp: (element) => {
    element.classList.remove('hidden');
    element.classList.add('animate-slide-up');
    setTimeout(() => {
      element.classList.remove('animate-slide-up');
    }, 400);
  },

  slideDown: (element) => {
    element.classList.remove('hidden');
    element.classList.add('animate-slide-down');
    setTimeout(() => {
      element.classList.remove('animate-slide-down');
    }, 300);
  }
};

// ========================================
// Enhanced Tab Switching with Animation
// ========================================
const originalShowTab = typeof showTab !== 'undefined' ? showTab : null;

function showTabWithAnimation(tabName) {
  // Get all tabs
  const tabs = ['learn', 'flashcards', 'practice', 'ai-tutor', 'progress', 'searchResults'];
  
  // Hide all tabs with fade out
  tabs.forEach(tab => {
    const tabElement = document.getElementById(tab === 'ai-tutor' ? 'aiTab' : 
                                              tab === 'searchResults' ? 'searchResultsTab' : 
                                              tab + 'Tab');
    if (tabElement && !tabElement.classList.contains('hidden')) {
      tabElement.style.opacity = '0';
      tabElement.style.transform = 'translateY(10px)';
      setTimeout(() => {
        tabElement.classList.add('hidden');
        tabElement.style.opacity = '';
        tabElement.style.transform = '';
      }, 150);
    }
  });

  // Update navigation
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeNav = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1).replace('-tutor', ''));
  if (activeNav) activeNav.classList.add('active');

  // Show selected tab with animation
  setTimeout(() => {
    const targetTab = document.getElementById(tabName === 'ai-tutor' ? 'aiTab' : 
                                             tabName === 'searchResults' ? 'searchResultsTab' : 
                                             tabName + 'Tab');
    if (targetTab) {
      targetTab.classList.remove('hidden');
      targetTab.style.opacity = '0';
      targetTab.style.transform = 'translateY(20px)';
      
      requestAnimationFrame(() => {
        targetTab.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        targetTab.style.opacity = '1';
        targetTab.style.transform = 'translateY(0)';
      });
    }
  }, 200);
}

// ========================================
// Ripple Effect for Buttons
// ========================================
function createRipple(event) {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  const rect = button.getBoundingClientRect();
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple-effect');

  const ripple = button.querySelector('.ripple-effect');
  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);

  setTimeout(() => {
    circle.remove();
  }, 600);
}

// Add ripple to all buttons (except navigation and action buttons)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-primary:not(#viewAllBtn):not(#nextCharBtn):not(#nextFlashcardBtn):not(#listenBtn), .btn-secondary:not(#prevCharBtn):not(#prevFlashcardBtn):not(#quizSettingsBtn):not([onclick*='openShareModal']), .btn-mode').forEach(button => {
    button.addEventListener('click', createRipple);
  });
});

// ========================================
// Haptic Feedback (Vibration API)
// ========================================
const HapticFeedback = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  }
};

// ========================================
// Loading Skeleton Generator
// ========================================
function createSkeleton(type = 'card') {
  const skeletons = {
    card: `
      <div class="p-4 rounded-xl bg-white dark:bg-gray-800/50 space-y-3">
        <div class="skeleton h-4 w-3/4"></div>
        <div class="skeleton h-4 w-1/2"></div>
        <div class="skeleton h-20 w-full"></div>
      </div>
    `,
    list: `
      <div class="flex items-center gap-3 p-3">
        <div class="skeleton w-12 h-12 rounded-xl"></div>
        <div class="flex-1 space-y-2">
          <div class="skeleton h-4 w-3/4"></div>
          <div class="skeleton h-3 w-1/2"></div>
        </div>
      </div>
    `,
    text: `
      <div class="space-y-2">
        <div class="skeleton h-4 w-full"></div>
        <div class="skeleton h-4 w-5/6"></div>
        <div class="skeleton h-4 w-4/6"></div>
      </div>
    `,
    flashcard: `
      <div class="h-80 md:h-96 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
        <div class="skeleton w-32 h-32 rounded-2xl"></div>
      </div>
    `
  };

  return skeletons[type] || skeletons.card;
}

// ========================================
// Smooth Scroll
// ========================================
function smoothScrollTo(element, offset = 0) {
  const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
}

// ========================================
// Pull to Refresh (Mobile)
// ========================================
let touchStart = 0;
let touchEnd = 0;
let isPulling = false;

document.addEventListener('touchstart', (e) => {
  touchStart = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (window.scrollY === 0) {
    touchEnd = e.touches[0].clientY;
    const pullDistance = touchEnd - touchStart;
    
    if (pullDistance > 0 && pullDistance < 150) {
      isPulling = true;
      document.body.style.transform = `translateY(${pullDistance * 0.3}px)`;
    }
  }
}, { passive: true });

document.addEventListener('touchend', () => {
  if (isPulling) {
    document.body.style.transform = '';
    document.body.style.transition = 'transform 0.3s ease-out';
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);
    isPulling = false;
  }
  touchStart = 0;
  touchEnd = 0;
}, { passive: true });

// ========================================
// Intersection Observer for Animations
// ========================================
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const animationObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-slide-up');
      animationObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe elements with data-animate attribute
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-animate]').forEach(el => {
    animationObserver.observe(el);
  });
});

// ========================================
// Toast Notifications
// ========================================
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
      this.container.style.paddingTop = 'env(safe-area-inset-top)';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    const colors = {
      success: 'from-green-500 to-emerald-600',
      error: 'from-red-500 to-rose-600',
      warning: 'from-yellow-500 to-orange-500',
      info: 'from-blue-500 to-purple-600'
    };

    toast.className = `
      px-4 py-3 rounded-xl text-white font-medium text-sm
      bg-gradient-to-r ${colors[type]}
      shadow-lg animate-slide-down
      flex items-center gap-2
      max-w-xs
    `;
    toast.innerHTML = message;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, duration);

    HapticFeedback.light();
  },

  success(message) { this.show(message, 'success'); },
  error(message) { this.show(message, 'error'); },
  warning(message) { this.show(message, 'warning'); },
  info(message) { this.show(message, 'info'); }
};

// ========================================
// Confetti Effect for Achievements
// ========================================
function createConfetti() {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
  const confettiCount = 50;

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      width: ${Math.random() * 10 + 5}px;
      height: ${Math.random() * 10 + 5}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}vw;
      top: -20px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      pointer-events: none;
      z-index: 9999;
      animation: confetti-fall ${Math.random() * 2 + 2}s linear forwards;
    `;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 4000);
  }

  // Add confetti animation if not exists
  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confetti-fall {
        to {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// ========================================
// Enhanced Search with Debounce
// ========================================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========================================
// Number Counter Animation
// ========================================
function animateNumber(element, target, duration = 1000) {
  const start = parseInt(element.textContent) || 0;
  const increment = (target - start) / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current);
    }
  }, 16);
}

// ========================================
// Card Flip Sound Effect
// ========================================
function playSound(type) {
  const sounds = {
    flip: null, // Add audio file URL
    correct: null,
    incorrect: null,
    success: null
  };

  if (sounds[type]) {
    const audio = new Audio(sounds[type]);
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Ignore autoplay restrictions
  }
}

// ========================================
// Initialize UI Enhancements
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  // Add smooth transitions to all interactive elements
  document.querySelectorAll('button:not(#quizSettingsBtn):not([onclick*="openShareModal"]), a, input, select').forEach(el => {
    el.classList.add('transition-smooth');
  });

  // Initialize tooltips
  document.querySelectorAll('[data-tooltip]').forEach(el => {
    el.classList.add('tooltip');
    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip-text';
    tooltip.textContent = el.dataset.tooltip;
    el.appendChild(tooltip);
  });

  // Add loading states to buttons
  document.querySelectorAll('[data-loading]').forEach(btn => {
    btn.addEventListener('click', function() {
      if (this.disabled) return;
      this.disabled = true;
      this.dataset.originalText = this.innerHTML;
      this.innerHTML = '<span class="animate-pulse">Loading...</span>';
      
      setTimeout(() => {
        this.disabled = false;
        this.innerHTML = this.dataset.originalText;
      }, 2000);
    });
  });

  console.log('🎨 XueTong UI Enhancements loaded');
});

// ========================================
// Export for global use
// ========================================
window.XueTongUI = {
  Toast,
  HapticFeedback,
  PageTransitions,
  createConfetti,
  animateNumber,
  createSkeleton,
  smoothScrollTo,
  debounce
};
