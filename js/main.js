// main.js - Ortak JavaScript fonksiyonları

document.addEventListener('DOMContentLoaded', function() {
    // Mobil menü toggle
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', function() {
            const expanded = this.getAttribute('aria-expanded') === 'true' ? false : true;
            this.setAttribute('aria-expanded', expanded);
            mobileMenu.classList.toggle('hidden');
            
            // İkon değiştir (fa-bars / fa-times)
            const icon = this.querySelector('i');
            if (icon) {
                if (expanded) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
        
        // Dışarı tıklandığında menüyü kapat
        document.addEventListener('click', function(event) {
            if (!menuBtn.contains(event.target) && !mobileMenu.contains(event.target) && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
                menuBtn.setAttribute('aria-expanded', 'false');
                const icon = menuBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }

    // IBAN kopyalama (bagis.html)
    window.copyIBAN = function() {
        const ibanElement = document.getElementById('iban-text');
        if (!ibanElement) return;
        
        const iban = ibanElement.innerText.replace(/\s/g, '');
        navigator.clipboard.writeText(iban).then(() => {
            const btn = document.querySelector('button[onclick="copyIBAN()"]');
            if (!btn) return;
            
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check mr-1"></i> Kopyalandı';
            btn.classList.add('bg-green-100', 'text-green-700');
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('bg-green-100', 'text-green-700');
            }, 2000);
        }).catch(err => {
            alert("IBAN: " + iban);
        });
    };
});