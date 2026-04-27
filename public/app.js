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

class BackgroundManager {
    constructor() {
        this.assets = [
            { type: 'image', src: 'images/Incredible 8-Second Construction Hyper-Lapse.jpg' },
            { type: 'video', src: 'videos/0_Dump_Truck_Mining_3840x2160.mp4' },
            { type: 'image', src: 'images/Miners at Kagem Emerald Mine.jpg' },
            { type: 'image', src: 'images/International Mining on X.jpg' },
            { type: 'video', src: 'videos/7021961_Technology_Construction_3840x2160.mp4' },
            { type: 'image', src: 'images/Mina de oro a cielo abierto.jpg' },
            { type: 'image', src: 'images/Incredible 8-Second Construction Hyper-Lapse (1).jpg' },
            { type: 'image', src: 'images/Mining is still dangerous—but new tech in South Africa could keep workers safer.jpg' },
        ];

        this.currentIndex     = 0;
        this.activeLayerIndex = 0;
        this.timer            = null;
        this.layers           = [
            document.getElementById('layer1'),
            document.getElementById('layer2'),
        ];

        // Preload all images upfront so their transitions are instant
        this.assets
            .filter(a => a.type === 'image')
            .forEach(a => { new Image().src = this.encodeSrc(a.src); });

        this.init();
    }

    encodeSrc(src) {
        return src.split('/').map((part, i) =>
            i === 0 ? part : encodeURIComponent(part)
        ).join('/');
    }

    schedule(ms) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.advance(this.currentIndex + 1), ms);
    }

    init() {
        if (!this.layers[0] || !this.layers[1]) return;
        // Mount and show the first image immediately
        this.mountImage(this.layers[0], this.assets[0]);
        this.layers[0].classList.add('active');
        this.schedule(6000);
    }

    // ── Move to the next asset (skipping failed ones without touching the screen) ──
    advance(index) {
        clearTimeout(this.timer);
        const idx        = ((index % this.assets.length) + this.assets.length) % this.assets.length;
        const asset      = this.assets[idx];
        const nextLIdx   = (this.activeLayerIndex + 1) % 2;
        const curLayer   = this.layers[this.activeLayerIndex];
        const nextLayer  = this.layers[nextLIdx];

        nextLayer.innerHTML = '';

        if (asset.type === 'image') {
            this.mountImage(nextLayer, asset);
            this.crossfade(curLayer, nextLayer, idx, nextLIdx);
            this.schedule(6000);

        } else {
            // Build the video but DON'T crossfade until it can actually play —
            // the current slide stays visible the whole time it's buffering.
            this.mountVideo(nextLayer, asset,
                // onReady: buffer is full enough — crossfade now, then play
                (video) => {
                    this.crossfade(curLayer, nextLayer, idx, nextLIdx);
                    video.play().catch(() => this.advance(idx + 1));
                    // Advance when the video finishes playing naturally
                    video.addEventListener('ended', () => this.advance(idx + 1), { once: true });
                    // Safety cap: move on after 60s even if ended never fires
                    this.timer = setTimeout(() => this.advance(idx + 1), 60000);
                },
                // onFail: video couldn't load — skip it, keep current slide visible
                () => this.advance(idx + 1)
            );
        }
    }

    crossfade(outLayer, inLayer, newIndex, newLayerIdx) {
        inLayer.classList.add('active');
        outLayer.classList.remove('active');
        this.currentIndex     = newIndex;
        this.activeLayerIndex = newLayerIdx;
    }

    mountImage(layer, asset) {
        const img = document.createElement('img');
        img.src   = this.encodeSrc(asset.src);
        img.alt   = '';
        img.onerror = () => this.advance(this.currentIndex + 1);
        layer.appendChild(img);
    }

    mountVideo(layer, asset, onReady, onFail) {
        const video        = document.createElement('video');
        video.src          = this.encodeSrc(asset.src);
        video.muted        = true;
        video.playsInline  = true;
        video.preload      = 'auto';
        // No loop — we want it to fire 'ended' when done

        let settled = false;

        const succeed = () => {
            if (settled) return;
            settled = true;
            clearTimeout(watchdog);
            onReady(video);
        };

        const fail = () => {
            if (settled) return;
            settled = true;
            clearTimeout(watchdog);
            layer.innerHTML = '';
            onFail();
        };

        // Wait until the browser has buffered enough to play without interruption
        video.addEventListener('canplaythrough', succeed, { once: true });
        video.addEventListener('error', fail, { once: true });

        // 12-second budget to reach canplaythrough on slow hosting
        const watchdog = setTimeout(fail, 12000);

        layer.appendChild(video);
        video.load();
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
