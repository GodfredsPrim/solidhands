// Navbar Scroll Effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Reveal Animations on Scroll
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15
});

revealElements.forEach(el => {
    revealObserver.observe(el);
});

// Smooth Scroll for Internal Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

/**
 * Background Slideshow Manager
 * Handles cycling between videos and images provided in the public/videos folder.
 */
class BackgroundManager {
    constructor() {
        this.assets = [
            { type: 'video', src: 'videos/0_Dump_Truck_Mining_3840x2160.mp4' },
            { type: 'image', src: 'videos/Incredible 8-Second Construction Hyper-Lapse.jpg' },
            { type: 'video', src: 'videos/7021961_Technology_Construction_3840x2160.mp4' },
            { type: 'image', src: 'videos/Miners at Kagem Emerald Mine.jpg' },
            { type: 'image', src: 'videos/Most-liked video _ 2_4M views · 50K reactions _ Found a pile of gold in the ground, worth millions #golddiscovery #findinggold #goldland _ Wit Discovery _ Facebook.jpg' }
        ];
        
        this.currentIndex = 0;
        this.layers = [
            document.getElementById('layer1'),
            document.getElementById('layer2')
        ];
        this.activeLayerIndex = 0;
        
        this.init();
    }

    init() {
        if (this.layers[0] && this.layers[1]) {
            this.showSlide(this.layers[this.activeLayerIndex], this.assets[this.currentIndex]);
            this.layers[this.activeLayerIndex].classList.add('active');
            
            setInterval(() => this.nextSlide(), 10000); // 10 seconds interval
        }
    }

    showSlide(layer, asset) {
        layer.innerHTML = ''; // Clear previous content
        
        if (asset.type === 'video') {
            const video = document.createElement('video');
            video.src = asset.src;
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            layer.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = asset.src;
            layer.appendChild(img);
        }
    }

    nextSlide() {
        const nextIndex = (this.currentIndex + 1) % this.assets.length;
        const nextLayerIndex = (this.activeLayerIndex + 1) % 2;
        
        const currentLayer = this.layers[this.activeLayerIndex];
        const nextLayer = this.layers[nextLayerIndex];
        const nextAsset = this.assets[nextIndex];

        // Prepare next layer
        this.showSlide(nextLayer, nextAsset);
        
        // Switch layers
        nextLayer.classList.add('active');
        currentLayer.classList.remove('active');
        
        // Update state
        this.currentIndex = nextIndex;
        this.activeLayerIndex = nextLayerIndex;
    }
}

// Initialize Sidebar/Slideshow when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BackgroundManager();

    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    const mobileNav = document.getElementById('mobileNav');

    if (menuToggle && mobileNav) {
        menuToggle.addEventListener('click', () => {
            mobileNav.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scroll
        });
    }

    if (menuClose && mobileNav) {
        menuClose.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            document.body.style.overflow = ''; // Restore scroll
        });
    }

    // Close menu on link click
    const mobileLinks = document.querySelectorAll('.mobile-links a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
});
