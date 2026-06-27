/* ========================================
 * PIXEL RAID — Pack Opening Animation
 * ======================================== */

const PackAnimation = {
    currentCards: [],
    isOpening: false,

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
        box.className = 'pack-box';
        box.style.display = 'flex';
        hint.textContent = 'Tap the pack to open!';
        hint.style.display = 'block';
        cardsContainer.innerHTML = '';
        closeBtn.classList.add('hidden');

        modal.classList.add('active');
    },

    openPack() {
        if (this.isOpening) return;
        this.isOpening = true;

        const box = document.getElementById('pack-box');
        const hint = document.getElementById('pack-hint');
        const cardsContainer = document.getElementById('pack-cards');
        const closeBtn = document.getElementById('pack-close-btn');

        // Shake animation
        box.classList.add('opening');
        hint.textContent = 'Opening...';

        setTimeout(() => {
            // Hide pack box
            box.style.display = 'none';
            hint.style.display = 'none';

            // Reveal cards one by one
            this.currentCards.forEach((card, i) => {
                const cardEl = document.createElement('div');
                cardEl.className = `pack-card-reveal card ${card.rarity}`;
                
                // Create card canvas
                const canvas = document.createElement('canvas');
                canvas.width = 100;
                canvas.height = 160;
                canvas.style.imageRendering = 'pixelated';
                CardRenderer.drawFullCard(canvas, card, 100, 160);

                cardEl.appendChild(canvas);
                cardsContainer.appendChild(cardEl);

                // Reveal with delay
                setTimeout(() => {
                    cardEl.classList.add('revealed');
                    if (card.rarity === 'legendary' || card.rarity === 'mythic') {
                        cardEl.classList.add('legendary-glow');
                    }
                }, 300 + i * 400);
            });

            // Show close button after all cards revealed
            setTimeout(() => {
                closeBtn.classList.remove('hidden');
            }, 300 + this.currentCards.length * 400 + 500);

        }, 600);
    },

    close() {
        const modal = document.getElementById('pack-modal');
        modal.classList.remove('active');
        this.currentCards = [];
        this.isOpening = false;
        
        // Refresh shop screen
        UI.renderShopContent('summon');
    },
};

/* Loading Screen Animation */
const LoadingScreen = {
    show() {
        const fill = document.getElementById('loading-fill');
        const text = document.getElementById('loading-text');
        const screen = document.getElementById('loading-screen');

        const steps = [
            { progress: 20, text: 'Loading heroes...' },
            { progress: 40, text: 'Preparing battle engine...' },
            { progress: 60, text: 'Building card database...' },
            { progress: 80, text: 'Initializing shop...' },
            { progress: 100, text: 'Ready to raid!' },
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < steps.length) {
                fill.style.width = steps[i].progress + '%';
                text.textContent = steps[i].text;
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    screen.classList.add('fade-out');
                    setTimeout(() => screen.remove(), 500);
                }, 300);
            }
        }, 200);
    },
};
