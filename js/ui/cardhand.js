/* ========================================
 * PIXEL RAID — Card Hand Renderer (v3)
 * Yu-Gi-Oh style hand with hero + skill cards
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
     * Render current hand — supports both old API and new combatant API
     * @param {Array} hand - Array of card objects
     * @param {Object} combatantOrMana - Combatant object (new) or mana number (old)
     * @param {boolean} enabled - Whether cards can be played
     * @param {Object} options - { hasEmptyHeroZone, hasSummoned }
     */
    render(hand, combatantOrMana, enabled = false, options = {}) {
        if (!this.container) return;
        this.enabled = enabled;
        this.container.innerHTML = '';

        const hasEmptyHeroZone = options.hasEmptyHeroZone !== undefined ? options.hasEmptyHeroZone : true;
        const hasSummoned = options.hasSummoned || false;

        // Support both old (mana int) and new (combatant object) APIs
        let currentMana = 0;
        let combatant = null;
        if (typeof combatantOrMana === 'number') {
            currentMana = combatantOrMana;
        } else if (combatantOrMana && typeof combatantOrMana === 'object') {
            combatant = combatantOrMana;
            currentMana = combatant.mana || 0;
        }

        if (!hand || hand.length === 0) {
            this.container.innerHTML = `
                <div class="hand-empty">No cards in hand</div>
            `;
            return;
        }

        hand.forEach((card, index) => {
            let canPlay = enabled;
            if (card.cardType === 'hero' && combatant) {
                // Can play hero if: enabled + empty zone + haven't summoned this turn
                canPlay = enabled && hasEmptyHeroZone && !hasSummoned;
            } else if (card.manaCost !== undefined) {
                canPlay = enabled && currentMana >= card.manaCost;
            } else if (card.cardType === 'skill') {
                canPlay = enabled; // Skills always playable
            }

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

        // Determine card class based on type
        if (card.cardType === 'hero') {
            el.className = `battle-card hero-card rarity-${card.rarity || 'common'}`;
        } else {
            el.className = `battle-card skill-card rarity-${card.rarity || 'common'}`;
        }

        if (!canPlay) el.classList.add('card-disabled');
        if (this.selectedCard === index) el.classList.add('card-selected');

        const rarityColor = RARITIES[card.rarity] ? RARITIES[card.rarity].color : '#aaa';

        el.style.borderColor = rarityColor;
        el.style.setProperty('--rarity-glow', rarityColor);

        if (card.cardType === 'hero') {
            // Hero card display (Yu-Gi-Oh monster style)
            const template = getTemplateByName(card.templateId || card.name);
            const cls = CLASSES[card.class || card.cls];
            const rarityStars = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
            const stars = rarityStars[card.rarity] || 1;

            el.innerHTML = `
                <div class="card-stars">${'★'.repeat(stars)}</div>
                <div class="card-art hero-art" style="background:${cls ? cls.color : '#4488ff'}22">
                    ${template && template.image
                        ? `<img src="${template.image}" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;" onerror="this.style.display='none'">`
                        : `<div class="card-art-icon">${cls ? cls.emoji : '⚔️'}</div>`
                    }
                </div>
                <div class="card-name">${card.name}</div>
                <div class="card-type-badge" style="color:${cls ? cls.color : '#888'}">${cls ? cls.name : 'Hero'}</div>
                <div class="card-stats-row">
                    <span class="card-atk">⚔${card.stats.atk}</span>
                    <span class="card-def">🛡${card.stats.def}</span>
                </div>
                <div class="card-hp">HP: ${card.stats.hp}</div>
            `;
        } else {
            // Skill card display (Yu-Gi-Oh spell style)
            const typeInfo = CARD_TYPES[card.type] || { emoji: '✨', color: '#888' };

            el.innerHTML = `
                ${card.manaCost !== undefined ? `<div class="card-mana ${currentMana < card.manaCost ? 'mana-lack' : ''}">${card.manaCost}</div>` : ''}
                <div class="card-art" style="background:${card.pixelColor || typeInfo.color}22">
                    <div class="card-art-icon">${typeInfo.emoji}</div>
                </div>
                <div class="card-name">${card.name}</div>
                <div class="card-type-badge" style="color:${typeInfo.color}">${typeInfo.name}</div>
                <div class="card-desc">${card.description}</div>
            `;
        }

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
        if (typeof BattleAnimations !== 'undefined') {
            BattleAnimations.animateCardPlay(el, callback);
        } else {
            el.classList.add('card-playing');
            setTimeout(() => { if (callback) callback(); }, 400);
        }
    },

    /**
     * Shake a card (can't play indicator)
     */
    shakeCard(cardIndex) {
        const cards = this.container?.querySelectorAll('.battle-card');
        if (!cards || !cards[cardIndex]) return;
        const el = cards[cardIndex];
        if (typeof BattleAnimations !== 'undefined') {
            BattleAnimations.shakeCard(el);
        } else {
            el.classList.add('card-disabled');
            setTimeout(() => el.classList.remove('card-disabled'), 400);
        }
    },

    /**
     * Animate card being drawn (slide in from deck)
     */
    animateCardDraw() {
        if (typeof BattleAnimations !== 'undefined') {
            BattleAnimations.animateCardDraw(this.container);
        } else {
            const cards = this.container?.querySelectorAll('.battle-card');
            if (!cards || cards.length === 0) return;
            const last = cards[cards.length - 1];
            last.classList.add('card-draw-in');
            setTimeout(() => last.classList.remove('card-draw-in'), 500);
        }
    },

    /**
     * Highlight playable cards
     */
    highlightPlayable(hand, currentMana) {
        const cards = this.container?.querySelectorAll('.battle-card');
        if (!cards) return;

        cards.forEach((el, i) => {
            if (hand[i] && (hand[i].cardType === 'hero' || currentMana >= (hand[i].manaCost || 0))) {
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
                gap: 6px;
                justify-content: center;
                align-items: flex-end;
                padding: 8px 4px;
                min-height: 140px;
                flex-wrap: nowrap;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }
            .battle-card {
                width: 85px;
                min-height: 125px;
                background: var(--bg-card, #1a1a2e);
                border: 2px solid #555;
                border-radius: 6px;
                padding: 4px;
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 1px;
                font-family: 'Press Start 2P', monospace;
                user-select: none;
                flex-shrink: 0;
            }
            .battle-card.hero-card {
                border-width: 3px;
            }
            .battle-card.skill-card {
                border-width: 2px;
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
            .card-stars {
                font-size: 5px;
                color: #ffd700;
                text-align: right;
                line-height: 1;
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
                height: 45px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-top: 2px;
                overflow: hidden;
            }
            .hero-art {
                height: 50px;
            }
            .card-art-icon {
                font-size: 22px;
            }
            .card-name {
                font-size: 5px;
                color: #fff;
                text-align: center;
                line-height: 1.2;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .card-type-badge {
                font-size: 4px;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 1px;
                opacity: 0.8;
            }
            .card-desc {
                font-size: 4px;
                color: #aaa;
                text-align: center;
                line-height: 1.3;
                flex: 1;
            }
            .card-stats-row {
                display: flex;
                justify-content: space-between;
                padding: 1px 4px;
                font-size: 5px;
            }
            .card-atk {
                color: #ff6644;
                font-weight: bold;
            }
            .card-def {
                color: #4488ff;
                font-weight: bold;
            }
            .card-hp {
                font-size: 4px;
                color: #44cc44;
                text-align: center;
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
                    width: 70px;
                    min-height: 105px;
                }
                .card-art { height: 38px; }
                .hero-art { height: 42px; }
                .card-art-icon { font-size: 18px; }
                .card-name { font-size: 4px; }
                .card-desc { font-size: 3.5px; }
                .card-stats-row { font-size: 4px; }
            }
        `;
        document.head.appendChild(style);
    },
};

// Auto-inject styles when loaded
if (typeof document !== 'undefined') {
    CardHand.injectStyles();
}
