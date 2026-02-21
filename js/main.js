// Mobile Menu Toggle
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('mobile-menu-btn');
    
    if (!menu) {
        console.error('Mobile menu element not found');
        return;
    }
    
    const isHidden = menu.classList.contains('hidden');
    
    if (isHidden) {
        menu.classList.remove('hidden');
        menu.classList.add('block');
        if (btn) btn.setAttribute('aria-expanded', 'true');
    } else {
        menu.classList.add('hidden');
        menu.classList.remove('block');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }
}

// Close mobile menu on outside click
document.addEventListener('click', (e) => {
    const mobileMenu = document.getElementById('mobile-menu');
    const menuBtn = document.getElementById('mobile-menu-btn');
    
    if (mobileMenu && !mobileMenu.contains(e.target) && menuBtn && !menuBtn.contains(e.target)) {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('block');
        menuBtn.setAttribute('aria-expanded', 'false');
    }
});

// Close mobile menu on window resize (desktop view)
window.addEventListener('resize', () => {
    const mobileMenu = document.getElementById('mobile-menu');
    const menuBtn = document.getElementById('mobile-menu-btn');
    
    if (window.innerWidth >= 768 && mobileMenu) {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('block');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Close mobile menu after clicking
                const mobileMenu = document.getElementById('mobile-menu');
                const menuBtn = document.getElementById('mobile-menu-btn');
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                    mobileMenu.classList.remove('block');
                    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
                }
            }
        }
    });
});

// Debug: Check if script loaded
console.log('Main.js loaded successfully');

