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
        // Filenames with spaces/special chars are encoded in encodeSrc()
        this.assets = [
            { type: 'video', src: 'videos/0_Dump_Truck_Mining_3840x2160.mp4' },
            { type: 'image', src: 'images/Incredible 8-Second Construction Hyper-Lapse.jpg' },
            { type: 'video', src: 'videos/7021961_Technology_Construction_3840x2160.mp4' },
            { type: 'image', src: 'images/Miners at Kagem Emerald Mine.jpg' },
            { type: 'image', src: 'images/International Mining on X.jpg' },
            { type: 'image', src: 'images/Mina de oro a cielo abierto.jpg' },
            { type: 'image', src: 'images/Incredible 8-Second Construction Hyper-Lapse (1).jpg' },
            { type: 'image', src: 'images/Mining is still dangerous—but new tech in South Africa could keep workers safer.jpg' },
        ];

        this.currentIndex = 0;
        this.layers = [
            document.getElementById('layer1'),
            document.getElementById('layer2')
        ];
        this.activeLayerIndex = 0;

        this.init();
    }

    // Encode each path segment separately so spaces and special chars work
    encodeSrc(src) {
        return src.split('/').map((part, i) =>
            i === 0 ? part : encodeURIComponent(part)
        ).join('/');
    }

    init() {
        if (this.layers[0] && this.layers[1]) {
            this.showSlide(this.layers[this.activeLayerIndex], this.assets[this.currentIndex]);
            this.layers[this.activeLayerIndex].classList.add('active');
            setInterval(() => this.nextSlide(), 8000);
        }
    }

    showSlide(layer, asset) {
        layer.innerHTML = '';
        const src = this.encodeSrc(asset.src);

        if (asset.type === 'video') {
            const video = document.createElement('video');
            video.src = src;
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            layer.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = src;
            img.alt = '';
            // Skip broken images silently and jump to next
            img.onerror = () => this.nextSlide();
            layer.appendChild(img);
        }
    }

    nextSlide() {
        const nextIndex = (this.currentIndex + 1) % this.assets.length;
        const nextLayerIndex = (this.activeLayerIndex + 1) % 2;

        const currentLayer = this.layers[this.activeLayerIndex];
        const nextLayer = this.layers[nextLayerIndex];

        this.showSlide(nextLayer, this.assets[nextIndex]);

        nextLayer.classList.add('active');
        currentLayer.classList.remove('active');

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
