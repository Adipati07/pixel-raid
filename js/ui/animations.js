/* ========================================
 * PIXEL RAID — Pack Opening Animation
 * ======================================== */

const PackAnimation = {
    currentCards: [],
    isOpening: false,
    sparkleRAF: null,

    show(packName, cards) {
        this.currentCards = cards;
        this.isOpening = false;

        const modal = document.getElementById('pack-modal');
        const title = document.getElementById('pack-title');
        const box = document.getElementById('pack-box');
        const hint = document.getElementById('pack-hint');
        const cardsContainer = document.getElementById('pack-cards');
        const closeBtn = document.getElementById('pack-close-btn');

        title.textContent = `📦 ${packName}`;
        box.classList.remove('opened');
        box.style.display = 'flex';
        hint.textContent = 'Tap the pack to open!';
        hint.style.display = 'block';
        cardsContainer.innerHTML = '';
        closeBtn.style.display = 'none';

        modal.classList.add('show');
        this.startSparkles();
    },

    open() {
        if (this.isOpening) return;
        this.isOpening = true;
        if (typeof Sound !== 'undefined') Sound.packOpen();

        const box = document.getElementById('pack-box');
        const hint = document.getElementById('pack-hint');
        const cardsContainer = document.getElementById('pack-cards');
        const closeBtn = document.getElementById('pack-close-btn');

        // Shake animation
        box.style.animation = 'pack-shake 0.4s ease-in-out';
        hint.textContent = 'Opening...';

        // Burst sparkles on open
        this.burstSparkles();

        setTimeout(() => {
            // Hide pack box with dramatic expansion
            box.classList.add('opened');
            hint.style.display = 'none';

            // Flash effect
            const modal = document.getElementById('pack-modal');
            modal.style.animation = 'pack-flash 0.3s ease-out';
            setTimeout(() => modal.style.animation = '', 300);

            // Reveal cards one by one with staggered animation
            this.currentCards.forEach((card, i) => {
                // Play card reveal sound with stagger
                setTimeout(() => {
                    if (typeof Sound !== 'undefined') Sound.cardReveal(card.rarity);
                }, i * 250 + 200);

                const cardEl = document.createElement('div');
                cardEl.className = `card ${card.rarity}`;
                cardEl.style.cssText = 'animation: card-reveal 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; animation-delay: ' + (i * 0.25) + 's;';

                // Add glow for rare+ cards
                if (card.rarity === 'legendary' || card.rarity === 'mythic') {
                    cardEl.style.boxShadow = `0 0 25px ${RARITIES[card.rarity].color}`;
                }

                // Render the card using CardRenderer
                const canvas = document.createElement('canvas');
                canvas.width = 100;
                canvas.height = 160;
                canvas.style.imageRendering = 'pixelated';
                if (typeof CardRenderer !== 'undefined') {
                    CardRenderer.drawFullCard(canvas, card, 100, 160);
                }
                cardEl.appendChild(canvas);

                // Card info below
                const info = document.createElement('div');
                info.style.cssText = 'font-size:7px;text-align:center;margin-top:4px;';
                info.innerHTML = `<div style="color:${RARITIES[card.rarity].color}">${card.name}</div>`;
                cardEl.appendChild(info);

                cardsContainer.appendChild(cardEl);
            });

            // Show close button after all cards revealed
            const totalDelay = this.currentCards.length * 250 + 800;
            setTimeout(() => {
                closeBtn.style.display = 'inline-block';
                closeBtn.style.animation = 'card-reveal 0.4s ease both';
            }, totalDelay);

        }, 500);
    },

    close() {
        const modal = document.getElementById('pack-modal');
        modal.classList.remove('show');
        this.currentCards = [];
        this.isOpening = false;
        this.stopSparkles();

        // Refresh shop screen
        if (typeof UI !== 'undefined' && UI.renderShopContent) {
            UI.renderShopContent('summon');
        }
    },

    // === Sparkle Canvas ===
    startSparkles() {
        const canvas = document.getElementById('pack-sparkles');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const particles = [];

        // Ambient sparkles around the pack box
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1,
                speedY: -(Math.random() * 0.5 + 0.2),
                speedX: (Math.random() - 0.5) * 0.3,
                opacity: Math.random(),
                color: ['#ffd700', '#ff6b35', '#00ccff', '#ff44aa'][Math.floor(Math.random() * 4)],
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.y += p.speedY;
                p.x += p.speedX;
                p.opacity += (Math.random() - 0.5) * 0.05;
                p.opacity = Math.max(0.1, Math.min(1, p.opacity));

                if (p.y < 0) { p.y = canvas.height; p.x = Math.random() * canvas.width; }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.opacity;
                ctx.fill();

                // Star cross effect
                ctx.globalAlpha = p.opacity * 0.5;
                ctx.fillRect(p.x - p.size * 2, p.y - 0.5, p.size * 4, 1);
                ctx.fillRect(p.x - 0.5, p.y - p.size * 2, 1, p.size * 4);
                ctx.globalAlpha = 1;
            });
            this.sparkleRAF = requestAnimationFrame(draw);
        };
        draw();
    },

    burstSparkles() {
        const canvas = document.getElementById('pack-sparkles');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const burst = [];
        const cx = canvas.width / 2, cy = canvas.height / 2;

        for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 / 40) * i;
            const speed = Math.random() * 4 + 2;
            burst.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 1,
                life: 1,
                color: ['#ffd700', '#ff6b35', '#ffffff', '#00ccff'][Math.floor(Math.random() * 4)],
            });
        }

        const drawBurst = () => {
            let alive = false;
            burst.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.02;
                if (p.life <= 0) return;
                alive = true;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.fill();
                ctx.globalAlpha = 1;
            });
            if (alive) requestAnimationFrame(drawBurst);
        };
        drawBurst();
    },

    stopSparkles() {
        if (this.sparkleRAF) {
            cancelAnimationFrame(this.sparkleRAF);
            this.sparkleRAF = null;
        }
    },
};

/* Loading Screen — informative tips + lore */
const LoadingScreen = {
    tips: [
        '💡 Tip: Warriors have high DEF — place them in front row!',
        '💡 Tip: Mages deal AoE damage — great against grouped enemies.',
        '💡 Tip: Assassins target the weakest enemy first.',
        '💡 Tip: Match hero classes for powerful synergy bonuses.',
        '💡 Tip: Legendary cards have unique passive abilities.',
        '📖 Lore: The Pixel Realm was fractured by the Void War...',
        '📖 Lore: Ancient card fragments hold the power of fallen heroes.',
        '📖 Lore: The Arena was built by the first Card Masters.',
        '💡 Tip: Upgrade duplicate cards to boost their star rating.',
        '💡 Tip: Save gems for Legendary packs — better value!',
        '💡 Tip: Position healers behind tanks for maximum survival.',
        '📖 Lore: Each hero carries memories of a forgotten world.',
    ],

    show() {
        const bar = document.getElementById('loading-bar-inner');
        const tip = document.getElementById('loading-tip');
        const screen = document.getElementById('loading-screen');
        if (!screen || !bar) return;

        let tipIndex = 0;
        const steps = [
            { progress: 15,  text: 'Gathering heroes from the frontier...' },
            { progress: 35,  text: 'Forging card battle engine...' },
            { progress: 55,  text: 'Building the card database...' },
            { progress: 75,  text: 'Initializing the Arena...' },
            { progress: 90,  text: 'Loading your collection...' },
            { progress: 100, text: 'Ready to raid! ⚔️' },
        ];

        // Rotate tips every 1.5s
        const tipInterval = setInterval(() => {
            tipIndex = (tipIndex + 1) % this.tips.length;
            tip.style.opacity = '0';
            setTimeout(() => {
                tip.textContent = this.tips[tipIndex];
                tip.style.opacity = '1';
            }, 200);
        }, 1500);
        tip.style.transition = 'opacity 0.2s ease';

        let i = 0;
        const interval = setInterval(() => {
            if (i < steps.length) {
                bar.style.width = steps[i].progress + '%';
                tip.textContent = steps[i].text;
                i++;
            } else {
                clearInterval(interval);
                clearInterval(tipInterval);
                setTimeout(() => {
                    screen.classList.add('fade-out');
                    setTimeout(() => screen.remove(), 800);
                }, 300);
            }
        }, 250);
    },
};

// CSS keyframes injected dynamically
const style = document.createElement('style');
style.textContent = `
@keyframes pack-shake {
    0%, 100% { transform: translateX(0) rotate(0); }
    20% { transform: translateX(-8px) rotate(-3deg); }
    40% { transform: translateX(8px) rotate(3deg); }
    60% { transform: translateX(-4px) rotate(-1.5deg); }
    80% { transform: translateX(4px) rotate(1.5deg); }
}
@keyframes pack-flash {
    0% { background: rgba(255,215,0,0.3); }
    100% { background: rgba(0,0,0,0.95); }
}
`;
document.head.appendChild(style);
