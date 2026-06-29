/* ========================================
 * PIXEL RAID — Card Hand Renderer
 * Renders skill cards in battle hand area
 * Click to play cards during Main Phase
 * ======================================== */

const CardHand = {
    container: null,
    selectedCard: null,
    enabled: false,
    onCardPlay: null,  // callback(handIndex, card)

    /**
     * Initialize card hand UI
     * @param {string} containerId - DOM id for hand container
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('CardHand container not found:', containerId);
            return;
        }
        this.container.classList.add('card-hand-container');
    },

    /**
     * Render current hand
     * @param {Array} hand - Array of skill card objects
     * @param {number} currentMana - Player's current mana
     * @param {boolean} enabled - Whether cards can be played
     */
    render(hand, currentMana, enabled = false) {
        if (!this.container) return;
        this.enabled = enabled;
        this.container.innerHTML = '';

        if (!hand || hand.length === 0) {
            this.container.innerHTML = `
                <div class="hand-empty">No cards in hand</div>
            `;
            return;
        }

        hand.forEach((card, index) => {
            const canPlay = enabled && currentMana >= card.manaCost;
            try {
                const el = this._createCardElement(card, index, canPlay, currentMana);
                this.container.appendChild(el);
            } catch (e) {
                console.warn('CardHand: failed to render card', index, e);
            }
        });
    },

    /**
     * Create a single card DOM element
     */
    _createCardElement(card, index, canPlay, currentMana) {
        const el = document.createElement('div');
        el.className = `battle-card rarity-${card.rarity}`;
        if (!canPlay) el.classList.add('card-disabled');
        if (this.selectedCard === index) el.classList.add('card-selected');

        const typeInfo = CARD_TYPES[card.type] || { emoji: '?', color: '#888' };
        const rarityColor = RARITIES[card.rarity]?.color || '#aaa';

        el.style.borderColor = rarityColor;
        el.style.setProperty('--rarity-glow', rarityColor);

        el.innerHTML = `
            <div class="card-mana ${currentMana < card.manaCost ? 'mana-lack' : ''}">
                ${card.manaCost}
            </div>
            <div class="card-art" style="background:${card.pixelColor || typeInfo.color}22">
                <div class="card-art-icon">${typeInfo.emoji}</div>
            </div>
            <div class="card-name">${card.name}</div>
            <div class="card-type-badge" style="color:${typeInfo.color}">${typeInfo.name}</div>
            <div class="card-desc">${card.description}</div>
        `;

        // Click to play
        if (canPlay) {
            el.addEventListener('click', () => {
                if (!this.enabled) return;
                if (this.onCardPlay) {
                    this.onCardPlay(index, card);
                }
            });
        }

        // Hover tooltip
        el.addEventListener('mouseenter', () => {
            if (canPlay) el.style.transform = 'translateY(-12px) scale(1.05)';
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = '';
        });

        return el;
    },

    /**
     * Animate card being played (fly up and fade)
     */
    animateCardPlay(cardIndex, callback) {
        const cards = this.container?.querySelectorAll('.battle-card');
        if (!cards || !cards[cardIndex]) {
            if (callback) callback();
            return;
        }

        const el = cards[cardIndex];
        el.classList.add('card-playing');

        setTimeout(() => {
            if (callback) callback();
        }, 400);
    },

    /**
     * Animate card being drawn (slide in from deck)
     */
    animateCardDraw() {
        const cards = this.container?.querySelectorAll('.battle-card');
        if (!cards || cards.length === 0) return;

        const last = cards[cards.length - 1];
        last.classList.add('card-draw-in');
        setTimeout(() => last.classList.remove('card-draw-in'), 500);
    },

    /**
     * Highlight playable cards
     */
    highlightPlayable(hand, currentMana) {
        const cards = this.container?.querySelectorAll('.battle-card');
        if (!cards) return;

        cards.forEach((el, i) => {
            if (hand[i] && currentMana >= hand[i].manaCost) {
                el.classList.remove('card-disabled');
                el.classList.add('card-playable');
            } else {
                el.classList.add('card-disabled');
                el.classList.remove('card-playable');
            }
        });
    },

    /**
     * Clear the hand display
     */
    clear() {
        if (this.container) this.container.innerHTML = '';
        this.selectedCard = null;
        this.enabled = false;
    },

    /**
     * Inject CSS styles for cards
     */
    injectStyles() {
        if (document.getElementById('cardhand-styles')) return;
        const style = document.createElement('style');
        style.id = 'cardhand-styles';
        style.textContent = `
            .card-hand-container {
                display: flex;
                gap: 8px;
                justify-content: center;
                align-items: flex-end;
                padding: 8px 4px;
                min-height: 140px;
                flex-wrap: wrap;
            }
            .battle-card {
                width: 90px;
                min-height: 130px;
                background: var(--bg-card, #1a1a2e);
                border: 2px solid #555;
                border-radius: 6px;
                padding: 4px;
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 2px;
                font-family: 'Press Start 2P', monospace;
                user-select: none;
                flex-shrink: 0;
            }
            .battle-card:hover {
                z-index: 10;
            }
            .battle-card.card-disabled {
                opacity: 0.5;
                cursor: not-allowed;
                filter: grayscale(0.5);
            }
            .battle-card.card-playable {
                box-shadow: 0 0 8px var(--rarity-glow, #ffd700);
                animation: card-glow 1.5s ease-in-out infinite alternate;
            }
            .battle-card.card-selected {
                transform: translateY(-16px) scale(1.1);
                box-shadow: 0 0 16px var(--rarity-glow, #ffd700);
            }
            .battle-card.card-playing {
                animation: card-fly-up 0.4s ease-out forwards;
            }
            .battle-card.card-draw-in {
                animation: card-draw-in 0.5s ease-out;
            }
            .card-mana {
                position: absolute;
                top: -4px;
                left: -4px;
                width: 20px;
                height: 20px;
                background: #2244aa;
                color: #88ccff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
                font-weight: bold;
                border: 1px solid #4488ff;
                z-index: 2;
            }
            .card-mana.mana-lack {
                background: #442222;
                color: #ff6666;
                border-color: #ff4444;
            }
            .card-art {
                width: 100%;
                height: 50px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-top: 4px;
            }
            .card-art-icon {
                font-size: 22px;
            }
            .card-name {
                font-size: 6px;
                color: #fff;
                text-align: center;
                line-height: 1.2;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .card-type-badge {
                font-size: 5px;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 1px;
                opacity: 0.8;
            }
            .card-desc {
                font-size: 5px;
                color: #aaa;
                text-align: center;
                line-height: 1.3;
                flex: 1;
            }
            .hand-empty {
                color: #666;
                font-family: 'Press Start 2P', monospace;
                font-size: 8px;
                text-align: center;
                padding: 20px;
            }
            /* Rarity glow */
            .battle-card.rarity-common    { border-color: #aaaaaa; --rarity-glow: #aaaaaa; }
            .battle-card.rarity-rare      { border-color: #4488ff; --rarity-glow: #4488ff; }
            .battle-card.rarity-epic      { border-color: #aa44ff; --rarity-glow: #aa44ff; }
            .battle-card.rarity-legendary { border-color: #ff8800; --rarity-glow: #ff8800; }
            .battle-card.rarity-mythic    { border-color: #ff2266; --rarity-glow: #ff2266; }

            @keyframes card-glow {
                from { box-shadow: 0 0 6px var(--rarity-glow, #ffd700); }
                to   { box-shadow: 0 0 14px var(--rarity-glow, #ffd700); }
            }
            @keyframes card-fly-up {
                0%   { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(-80px) scale(0.5); opacity: 0; }
            }
            @keyframes card-draw-in {
                0%   { transform: translateX(60px) scale(0.3); opacity: 0; }
                100% { transform: translateX(0) scale(1); opacity: 1; }
            }

            /* Mobile responsive */
            @media (max-width: 480px) {
                .battle-card {
                    width: 72px;
                    min-height: 110px;
                }
                .card-art { height: 40px; }
                .card-art-icon { font-size: 18px; }
                .card-name { font-size: 5px; }
                .card-desc { font-size: 4px; }
            }
        `;
        document.head.appendChild(style);
    },
};

// Auto-inject styles when loaded
if (typeof document !== 'undefined') {
    CardHand.injectStyles();
}
