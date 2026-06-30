/* ========================================
 * PIXEL RAID — Card Hand Renderer (v4)
 * Pokemon TCG Chaos Rising style cards
 * Portrait orientation, premium pixel art aesthetic
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
        const hasUsedSkill = options.hasUsedSkill || false;

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
                canPlay = enabled && hasEmptyHeroZone && !hasSummoned;
            } else if (card.cardType === 'skill') {
                canPlay = enabled && !hasUsedSkill;
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
     * Create a single card DOM element — Pokemon TCG Chaos Rising style
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
            // ===== HERO CARD — TCG Chaos Rising style =====
            const template = getTemplateByName(card.templateId || card.name);
            const cls = CLASSES[card.class || card.cls];
            const rarityStars = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
            const stars = rarityStars[card.rarity] || 1;
            const clsColor = cls ? cls.color : '#888';
            const clsName = cls ? cls.name : 'Hero';
            const clsEmoji = cls ? cls.emoji : '⚔️';

            el.innerHTML = `
                <div class="tcg-header" style="background:${clsColor}">
                    <span class="tcg-header-icon">${clsEmoji}</span>
                    <span class="tcg-name">${card.name}</span>
                    <span class="tcg-hp">HP ${card.stats.hp}</span>
                </div>
                <div class="tcg-stars-row">
                    <span class="tcg-stars">${'★'.repeat(stars)}</span>
                </div>
                <div class="tcg-art-window" style="background:#0f3460">
                    ${template && template.image
                        ? `<img src="${template.image}" class="tcg-art-img" onerror="this.parentElement.innerHTML='<div class=\\'card-art-icon\\'>${clsEmoji}</div>'">`
                        : `<div class="card-art-icon">${clsEmoji}</div>`
                    }
                </div>
                <div class="tcg-type-badge" style="color:${clsColor}">
                    <span>Type: ${clsName}</span>
                    <span style="color:${rarityColor}">${RARITIES[card.rarity] ? RARITIES[card.rarity].name : ''}</span>
                </div>
                <div class="tcg-stats-box">
                    <div class="tcg-hp-bar">
                        <div class="tcg-hp-fill"></div>
                    </div>
                    <div class="tcg-stat-row">
                        <span class="card-atk">⚔${card.stats.atk}</span>
                        <span class="card-def">🛡${card.stats.def}</span>
                    </div>
                </div>
            `;
        } else {
            // ===== SKILL CARD — Spell/Trap style =====
            const typeInfo = CARD_TYPES[card.type] || { emoji: '✨', color: '#888' };
            const rarityStars = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
            const stars = rarityStars[card.rarity] || 1;

            el.innerHTML = `
                <div class="tcg-header skill-header" style="background:rgba(10,20,60,0.9)">
                    <span class="tcg-header-icon">${typeInfo.emoji}</span>
                    <span class="tcg-name">${card.name}</span>
                </div>
                <div class="tcg-stars-row">
                    <span class="tcg-stars">${'★'.repeat(stars)}</span>
                </div>
                <div class="tcg-art-window skill-art" style="background:rgba(15,52,96,0.5)">
                    <div class="card-art-icon skill-icon">${typeInfo.emoji}</div>
                </div>
                <div class="tcg-divider"></div>
                <div class="tcg-effect-text">${card.description || ''}</div>
                ${card.manaCost !== undefined ? `<div class="tcg-cooldown">CD: ${card.manaCost}</div>` : ''}
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

        // Hover effects — scale(1.05) + glow (300ms ease-out)
        el.addEventListener('mouseenter', () => {
            if (canPlay) el.style.transform = 'translateY(-14px) scale(1.05)';
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
            setTimeout(() => { if (callback) callback(); }, 350);
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
     * Inject CSS styles for cards — Pokemon TCG Chaos Rising style
     */
    injectStyles() {
        if (document.getElementById('cardhand-styles')) return;
        const style = document.createElement('style');
        style.id = 'cardhand-styles';
        style.textContent = `
            /* ===== CARD HAND CONTAINER ===== */
            .card-hand-container {
                display: flex;
                gap: 8px;
                justify-content: center;
                align-items: flex-end;
                padding: 8px 4px;
                min-height: 140px;
                flex-wrap: nowrap;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }

            /* ===== BASE CARD STYLES ===== */
            .battle-card {
                width: 120px;
                min-height: 170px;
                background: linear-gradient(180deg, #1e1e3a 0%, #141428 100%);
                border: 2px solid #555;
                border-radius: 6px;
                padding: 0;
                cursor: pointer;
                transition: transform 0.3s ease-out, box-shadow 0.3s ease-out, filter 0.3s ease;
                position: relative;
                display: flex;
                flex-direction: column;
                font-family: 'Press Start 2P', monospace;
                user-select: none;
                flex-shrink: 0;
                overflow: hidden;
            }
            .battle-card.hero-card {
                border-width: 2px;
            }
            .battle-card.skill-card {
                border-width: 2px;
            }
            .battle-card:hover {
                z-index: 10;
            }

            /* Card disabled — grayscale, reduced opacity */
            .battle-card.card-disabled {
                opacity: 0.5;
                cursor: not-allowed;
                filter: grayscale(0.6);
            }

            /* Card playable — pulsing border glow */
            .battle-card.card-playable {
                box-shadow: 0 0 8px var(--rarity-glow, #ffd700);
                animation: card-glow 1.5s ease-in-out infinite alternate;
            }

            /* Card selected */
            .battle-card.card-selected {
                transform: translateY(-16px) scale(1.1);
                box-shadow: 0 0 16px var(--rarity-glow, #ffd700);
            }

            /* Card playing animation */
            .battle-card.card-playing {
                animation: card-fly-up 0.3s ease-out forwards;
            }
            .battle-card.card-draw-in {
                animation: card-draw-in 0.5s ease-out;
            }

            /* ===== HERO CARD HEADER — Class-colored banner ===== */
            .tcg-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 3px 5px;
                min-height: 18px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            .tcg-header-icon {
                font-size: 8px;
                flex-shrink: 0;
            }
            .tcg-name {
                font-size: 5px;
                color: #fff;
                font-weight: bold;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 75px;
                flex: 1;
                margin: 0 3px;
                text-align: left;
            }
            .tcg-hp {
                font-size: 5px;
                color: #ff4444;
                font-weight: bold;
                flex-shrink: 0;
            }

            /* Skill card header — blue tint */
            .skill-header {
                background: rgba(10,20,60,0.9) !important;
                border-bottom: 1px solid rgba(68,136,255,0.3);
            }

            /* ===== RARITY STARS ROW ===== */
            .tcg-stars-row {
                display: flex;
                justify-content: center;
                padding: 1px 0;
                background: rgba(0,0,0,0.3);
            }
            .tcg-stars {
                color: #ffd700;
                font-size: 6px;
                letter-spacing: 1px;
            }

            /* ===== ART WINDOW — 60% of card ===== */
            .tcg-art-window {
                width: calc(100% - 6px);
                height: 80px;
                margin: 3px;
                border: 1px solid #c8a832;
                border-radius: 3px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
                background: #0f3460;
            }
            .tcg-art-img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                image-rendering: pixelated;
            }
            .card-art-icon {
                font-size: 28px;
            }
            .skill-art {
                background: rgba(15,52,96,0.5) !important;
            }
            .skill-icon {
                font-size: 32px;
            }

            /* ===== TYPE BADGE ===== */
            .tcg-type-badge {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 2px 5px;
                font-size: 4px;
                background: rgba(0,0,0,0.3);
                border-top: 1px solid rgba(255,255,255,0.05);
            }

            /* ===== DIVIDER ===== */
            .tcg-divider {
                height: 1px;
                background: rgba(255,255,255,0.1);
                margin: 2px 5px;
            }

            /* ===== EFFECT TEXT ===== */
            .tcg-effect-text {
                font-size: 4px;
                color: #aaa;
                text-align: center;
                line-height: 1.4;
                padding: 2px 5px;
                flex: 1;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
            }

            /* ===== COOL-DOWN INDICATOR ===== */
            .tcg-cooldown {
                font-size: 5px;
                color: #4488ff;
                text-align: center;
                padding: 2px;
                background: rgba(68,136,255,0.1);
                border-top: 1px solid rgba(68,136,255,0.2);
                font-weight: bold;
            }

            /* ===== STATS BOX — Bottom of card ===== */
            .tcg-stats-box {
                padding: 3px 5px;
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 3px;
            }
            .tcg-hp-bar {
                width: 100%;
                height: 5px;
                background: #222;
                border-radius: 2px;
                overflow: hidden;
            }
            .tcg-hp-fill {
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, #00ff88, #00cc66);
                border-radius: 2px;
            }
            .tcg-stat-row {
                display: flex;
                justify-content: space-between;
                padding: 0 2px;
                font-size: 6px;
            }

            /* ===== STAT COLORS ===== */
            .card-atk {
                color: #e94560;
                font-weight: bold;
            }
            .card-def {
                color: #4488ff;
                font-weight: bold;
            }

            /* ===== EMPTY HAND ===== */
            .hand-empty {
                color: #666;
                font-family: 'Press Start 2P', monospace;
                font-size: 8px;
                text-align: center;
                padding: 20px;
            }

            /* ===== RARITY BORDER COLORS ===== */
            .battle-card.rarity-common    { border-color: #aaaaaa; --rarity-glow: #aaaaaa; }
            .battle-card.rarity-rare      { border-color: #4488ff; --rarity-glow: #4488ff; }
            .battle-card.rarity-epic      { border-color: #9b59b6; --rarity-glow: #9b59b6; }
            .battle-card.rarity-legendary { border-color: #ff6b35; --rarity-glow: #ff6b35; }
            .battle-card.rarity-mythic    { border-color: #e94560; --rarity-glow: #e94560; }

            /* ===== KEYFRAMES ===== */
            @keyframes card-glow {
                from { box-shadow: 0 0 6px var(--rarity-glow, #ffd700); }
                to   { box-shadow: 0 0 14px var(--rarity-glow, #ffd700), 0 0 20px var(--rarity-glow, #ffd700); }
            }
            @keyframes card-fly-up {
                0%   { transform: translateY(0) scale(1); opacity: 1; }
                30%  { transform: translateY(-10px) scale(1.1); opacity: 1; }
                100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
            }
            @keyframes card-draw-in {
                0%   { transform: translateX(60px) scale(0.3); opacity: 0; }
                100% { transform: translateX(0) scale(1); opacity: 1; }
            }

            /* ===== MOBILE RESPONSIVE ===== */
            @media (max-width: 480px) {
                .battle-card {
                    width: 100px;
                    min-height: 140px;
                }
                .tcg-art-window { height: 65px; }
                .card-art-icon { font-size: 22px; }
                .tcg-name { font-size: 4px; max-width: 60px; }
                .tcg-stat-row { font-size: 5px; }
            }
            @media (max-width: 380px) {
                .battle-card {
                    width: 85px;
                    min-height: 120px;
                }
                .tcg-art-window { height: 55px; }
                .tcg-name { font-size: 3.5px; max-width: 50px; }
            }
        `;
        document.head.appendChild(style);
    },
};
