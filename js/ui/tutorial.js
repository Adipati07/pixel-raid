/* ========================================
 * PIXEL RAID — Tutorial System
 * Step-by-step onboarding for new players
 * ======================================== */

const Tutorial = {
    active: false,
    step: 0,
    overlay: null,
    highlightEl: null,
    chosenClass: null,
    chosenName: '',

    // ========== Polish helpers (added) ==========
    _KEY: 'pixelraid_tutorial_step',
    _reducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },
    _loadSavedStep() {
        try { return parseInt(localStorage.getItem(this._KEY) || '0', 10) || 0; }
        catch (e) { return 0; }
    },
    _saveStep(step) {
        try { localStorage.setItem(this._KEY, String(step)); } catch (e) {}
    },
    _clearSavedStep() {
        try { localStorage.removeItem(this._KEY); } catch (e) {}
    },
    _installKeyboardNav() {
        if (this._keyHandler) return;
        this._keyHandler = (e) => {
            if (!this.active) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
            else if (e.key === 'Escape') { e.preventDefault(); this.end(); }
        };
        window.addEventListener('keydown', this._keyHandler);
    },
    _uninstallKeyboardNav() {
        if (this._keyHandler) {
            window.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    },

    STEPS: [
        {
            id: 'character_creation',
            title: '⚔️ Create Your Character',
            text: '', // Custom render — no text needed
            target: null,
            position: 'center',
        },
        {
            id: 'welcome',
            title: '⚔️ Welcome to Pixel Raid!',
            text: 'Collect hero cards, build your deck, and battle through stages!\n\nThis is a turn-based card battler — you play skill cards, manage mana, and outsmart enemies!\n\nLet me show you around...',
            target: null,
            position: 'center',
        },
        {
            id: 'meet_heroes',
            title: '🃏 Your Starter Heroes',
            text: '', // Will be dynamically filled based on class choice
            target: null,
            position: 'center',
        },
        {
            id: 'nav_battle',
            title: '⚔️ Battle Screen',
            text: 'This is where you fight!\n\nBattles are 1v1 turn-based. Each turn has 4 phases:\n🃏 Draw Phase — draw a skill card\n⚡ Main Phase — play skill cards from your hand\n⚔️ Attack Phase — your hero attacks automatically\n⏭ End Phase — turn passes to enemy\n\nWin by reducing enemy HP to 0!',
            target: '#screen-battle',
            position: 'bottom',
        },
        {
            id: 'mana_system',
            title: '❤️ Life Points',
            text: 'Both duelists start with 4000 LP (Life Points)!\n\nPlay hero cards to your field zones.\nAttack enemy heroes to deal damage.\nReduce enemy LP to 0 to win!\n\nTip: Protect your heroes and attack strategically!',
            target: '#battle-canvas',
            position: 'top',
        },
        {
            id: 'card_hand',
            title: '🃏 Skill Cards',
            text: 'Your hand shows skill cards you can play:\n\n🔴 Attack — deal damage to enemy\n🛡️ Defense — gain shield or reduce damage\n⬆️ Buff — boost your ATK/DEF/SPD\n⬇️ Debuff — weaken the enemy\n⭐ Special — unique powerful effects\n\nClick a card to play it during Main Phase!',
            target: '#card-hand-area',
            position: 'top',
        },
        {
            id: 'start_battle',
            title: '🎮 Try Your First Battle!',
            text: 'Press "Start Battle" to begin!\n\nDraw 3 cards to start. Play skill cards wisely, manage your mana, and defeat the enemy!\n\nDon\'t worry — you\'ll earn gold and EXP whether you win or lose.',
            target: '#btn-start-battle',
            position: 'top',
        },
        {
            id: 'nav_heroes',
            title: '🦸 Heroes Tab',
            text: 'Check your hero collection here.\n\nSee stats (HP, ATK, DEF, SPD, MANA) and skills of each card.\nNew heroes unlock as you level up!',
            target: '[data-screen="heroes"]',
            position: 'bottom',
        },
        {
            id: 'nav_formation',
            title: '📐 Formation & Synergy',
            text: 'Pick your battle hero here!\n\nOnly 1 hero goes into battle, but choose wisely — each hero has different stats and skills.\n\nBring heroes of the same type for synergy bonuses:\n• 3x Warriors → Iron Wall (+20 DEF)\n• 2x Mages → Arcane Surge (+15 ATK)\n• Balanced team → Full Balance (+50 HP)',
            target: '[data-screen="formation"]',
            position: 'bottom',
        },
        {
            id: 'nav_shop',
            title: '🏪 Card Shop',
            text: 'Buy card packs to get new heroes!\n\n📦 Basic Pack — 50g, 3 cards\n📦 Premium Pack — 150g, guaranteed rare\n📦 Elite Pack — 3 gems, boosted rates\n📦 Legendary Pack — 10 gems, guaranteed epic+',
            target: '[data-screen="shop"]',
            position: 'bottom',
        },
        {
            id: 'level_up',
            title: '📈 Level Up to Unlock',
            text: 'Win battles → earn EXP → level up!\n\nEach level unlocks new heroes and rewards:\n• Lv2: Forest Warrior\n• Lv5: Golem + 3 Gems\n• Lv10: Frost Giant + 5 Gems\n• Lv20: GOLDEN PALADIN + 2000 Gold + 15 Gems\n\nLevel up to collect them all!',
            target: null,
            position: 'center',
        },
        {
            id: 'ready',
            title: '🚀 You\'re Ready!',
            text: '', // Will be dynamically filled
            target: null,
            position: 'center',
        },
    ],

    start() {
        if (GameState.stats.battlesWon > 0) return; // Skip if already played
        // Auto-skip if player already has heroes (main.js gave them)
        if (GameState.collection.length >= 3) {
            console.log('Tutorial skipped — already have heroes');
            return;
        }
        this.active = true;
        this.chosenClass = null;
        this.chosenName = '';
        const saved = this._loadSavedStep();
        this.step = (saved > 0 && saved < this.STEPS.length - 1) ? saved : 0;
        this._installKeyboardNav();
        this.showStep();
    },

    showStep() {
        const step = this.STEPS[this.step];
        if (!step) {
            this.end();
            return;
        }

        // Remove old overlay
        if (this.overlay) this.overlay.remove();
        if (this.highlightEl) {
            this.highlightEl.classList.remove('tutorial-highlight');
            this.highlightEl = null;
        }

        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';

        // Special render for character creation
        if (step.id === 'character_creation') {
            this.renderCharacterCreation();
            document.body.appendChild(this.overlay);
            requestAnimationFrame(() => {
                this.overlay.classList.add('active');
            });
            return;
        }

        // Dynamically fill text for steps that depend on player choices
        if (step.id === 'meet_heroes') {
            const starterTeam = CLASS_STARTER_MAP[this.chosenClass];
            if (starterTeam) {
                const heroList = starterTeam.heroes.map(name => {
                    const tmpl = CARD_TEMPLATES.find(t => t.name === name);
                    const emoji = tmpl ? CLASSES[tmpl.cls]?.emoji : '🗡️';
                    const desc = tmpl ? tmpl.skill.name : '';
                    return `${emoji} ${name} — ${desc}`;
                }).join('\n');
                step.text = `Your ${CLASSES[this.chosenClass]?.name || this.chosenClass} starter team:\n\n${heroList}\n\nThey're already in your deck!`;
            }
        }

        if (step.id === 'ready') {
            const className = CLASSES[this.chosenClass]?.name || this.chosenClass;
            const classEmoji = CLASSES[this.chosenClass]?.emoji || '⚔️';
            step.text = `That's everything you need to know, ${this.chosenName}!\n\nYour ${classEmoji} ${className} journey begins now.\n\nBattle tips:\n• Draw 3 cards to start, 1 more each turn\n• Mana +1/turn (max 10) — save for big plays!\n• Attack cards deal damage, Defense gives shield\n• Buff/Debuff swing the fight in your favor\n• Win stages to earn gold & level up\n\nGood luck, ${this.chosenName}! ⚔️`;
        }

        // Highlight target element
        let targetRect = null;
        if (step.target) {
            const el = document.querySelector(step.target);
            if (el) {
                el.classList.add('tutorial-highlight');
                this.highlightEl = el;
                targetRect = el.getBoundingClientRect();
                // Scroll into view
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        // Position tooltip
        const isFirst = this.step === 0;
        const isLast = this.step === this.STEPS.length - 1;

        this.overlay.innerHTML = `
            <div class="tutorial-backdrop"></div>
            <div class="tutorial-tooltip ${step.position}">
                <div class="tutorial-step-count">Step ${this.step + 1}/${this.STEPS.length}</div>
                <div class="tutorial-progress" aria-label="Tutorial progress">
                    ${this.STEPS.map((_, i) => `<span class="tutorial-dot ${i < this.step ? 'done' : i === this.step ? 'current' : 'upcoming'}"></span>`).join('')}
                </div>
                <div class="tutorial-title">${step.title}</div>
                <div class="tutorial-text">${step.text.replace(/\n/g, '<br>')}</div>
                <div class="tutorial-buttons">
                    ${this.step > 0 ? '<button class="btn tutorial-btn-back">← Back</button>' : ''}
                    ${isFirst ? '<button class="btn btn-gold tutorial-btn-next">Let\'s Go! →</button>' : ''}
                    ${!isFirst && !isLast ? '<button class="btn btn-gold tutorial-btn-next">Next →</button>' : ''}
                    ${isLast ? '<button class="btn btn-gold tutorial-btn-finish">⚔️ Start Playing!</button>' : ''}
                    ${!isLast ? '<button class="btn tutorial-btn-skip">Skip Tutorial</button>' : ''}
                    ${!isLast ? '<button class="btn tutorial-btn-skip-all">Skip All</button>' : ''}
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Highlight ring on target
        if (targetRect) {
            const tooltip = this.overlay.querySelector('.tutorial-tooltip');
            const ring = document.createElement('div');
            ring.className = 'tutorial-ring';
            ring.style.top = (targetRect.top - 8) + 'px';
            ring.style.left = (targetRect.left - 8) + 'px';
            ring.style.width = (targetRect.width + 16) + 'px';
            ring.style.height = (targetRect.height + 16) + 'px';
            this.overlay.appendChild(ring);
        }

        // Bind buttons
        this.overlay.querySelector('.tutorial-btn-next')?.addEventListener('click', () => this.next());
        this.overlay.querySelector('.tutorial-btn-back')?.addEventListener('click', () => this.prev());
        this.overlay.querySelector('.tutorial-btn-finish')?.addEventListener('click', () => this.end());
        this.overlay.querySelector('.tutorial-btn-skip')?.addEventListener('click', () => this.end());
        this.overlay.querySelector('.tutorial-btn-skip-all')?.addEventListener('click', () => this.end());

        // Animate in
        requestAnimationFrame(() => {
            this.overlay.classList.add('active');
        });
    },

    renderCharacterCreation() {
        const classes = [
            { key: 'warrior', emoji: '⚔️', name: 'Warrior', color: '#ff6644',
              desc: 'Tanky fighters with high DEF.\nYour team focuses on survival and steady damage.',
              heroes: CLASS_STARTER_MAP.warrior.heroes },
            { key: 'mage', emoji: '🔮', name: 'Mage', color: '#8844ff',
              desc: 'Powerful magic damage dealers.\nYour team devastates enemies with AOE spells.',
              heroes: CLASS_STARTER_MAP.mage.heroes },
            { key: 'archer', emoji: '🏹', name: 'Archer', color: '#44cc88',
              desc: 'Swift ranged attackers with high SPD.\nYour team strikes fast from a distance.',
              heroes: CLASS_STARTER_MAP.archer.heroes },
        ];

        const classCards = classes.map(c => {
            const heroEmojis = c.heroes.map(h => {
                const tmpl = CARD_TEMPLATES.find(t => t.name === h);
                return tmpl ? CLASSES[tmpl.cls]?.emoji || '🗡️' : '🗡️';
            });
            return `
                <div class="cc-class-card" data-class="${c.key}" style="border-color: ${c.color}40;">
                    <div class="cc-class-emoji">${c.emoji}</div>
                    <div class="cc-class-name" style="color: ${c.color};">${c.name}</div>
                    <div class="cc-class-desc">${c.desc.replace(/\n/g, '<br>')}</div>
                    <div class="cc-class-heroes">
                        ${c.heroes.map((h, i) => `<span class="cc-hero-tag">${heroEmojis[i]} ${h}</span>`).join('')}
                    </div>
                </div>
            `;
        }).join('');

        this.overlay.innerHTML = `
            <div class="tutorial-backdrop"></div>
            <div class="tutorial-tooltip center" style="max-width: 480px;">
                <div class="tutorial-title">⚔️ Create Your Character</div>
                <div class="tutorial-text" style="margin-bottom: 12px;">
                    Choose your name and class to begin your adventure!
                </div>
                <div class="cc-name-section">
                    <label style="font-size: 9px; color: var(--text-dim); display: block; margin-bottom: 4px;">YOUR NAME</label>
                    <input type="text" id="cc-name-input" class="cc-name-input"
                           placeholder="Enter your name..." maxlength="16" value="${this.chosenName}">
                </div>
                <div class="cc-classes-section">
                    <label style="font-size: 9px; color: var(--text-dim); display: block; margin-bottom: 8px;">CHOOSE YOUR CLASS</label>
                    <div class="cc-class-grid">
                        ${classCards}
                    </div>
                </div>
                <div class="tutorial-buttons" style="margin-top: 16px;">
                    <button class="btn btn-gold tutorial-btn-confirm" disabled>⚔️ Begin Adventure!</button>
                </div>
                <button class="btn tutorial-btn-skip" style="margin-top: 8px;">Skip Tutorial</button>
            </div>
            <style>
                .cc-name-input {
                    font-family: 'Press Start 2P', monospace;
                    font-size: 10px;
                    padding: 10px 14px;
                    background: rgba(255,255,255,0.05);
                    border: 2px solid rgba(255,255,255,0.15);
                    border-radius: 6px;
                    color: var(--gold);
                    width: 100%;
                    text-align: center;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .cc-name-input:focus {
                    border-color: var(--gold);
                }
                .cc-name-input::placeholder {
                    color: var(--text-dim);
                }
                .cc-class-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                }
                .cc-class-card {
                    background: rgba(255,255,255,0.03);
                    border: 2px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 12px 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                }
                .cc-class-card:hover {
                    transform: translateY(-2px);
                    background: rgba(255,255,255,0.06);
                }
                .cc-class-card.selected {
                    border-color: var(--gold) !important;
                    background: rgba(255,215,0,0.1);
                    box-shadow: 0 0 16px rgba(255,215,0,0.2);
                }
                .cc-class-emoji {
                    font-size: 28px;
                    margin-bottom: 4px;
                }
                .cc-class-name {
                    font-family: 'Press Start 2P';
                    font-size: 9px;
                    margin-bottom: 4px;
                }
                .cc-class-desc {
                    font-size: 8px;
                    color: var(--text-dim);
                    line-height: 1.5;
                    margin-bottom: 6px;
                }
                .cc-class-heroes {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .cc-hero-tag {
                    font-size: 7px;
                    color: var(--text);
                    background: rgba(255,255,255,0.04);
                    padding: 2px 4px;
                    border-radius: 3px;
                }
                .tutorial-btn-confirm:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                @media (max-width: 500px) {
                    .cc-class-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        `;

        // Bind class card selection
        const classCardsEls = this.overlay.querySelectorAll('.cc-class-card');
        classCardsEls.forEach(card => {
            card.addEventListener('click', () => {
                classCardsEls.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.chosenClass = card.dataset.class;
                this._updateConfirmBtn();
            });
        });

        // Bind name input
        const nameInput = this.overlay.querySelector('#cc-name-input');
        nameInput.addEventListener('input', () => {
            this.chosenName = nameInput.value.trim();
            this._updateConfirmBtn();
        });

        // Bind confirm button
        this.overlay.querySelector('.tutorial-btn-confirm').addEventListener('click', () => {
            this._confirmCharacterCreation();
        });

        // Bind skip button
        this.overlay.querySelector('.tutorial-btn-skip').addEventListener('click', () => {
            this.end();
        });

        // Re-select if previously chosen
        if (this.chosenClass) {
            const prev = this.overlay.querySelector(`.cc-class-card[data-class="${this.chosenClass}"]`);
            if (prev) prev.classList.add('selected');
        }
        this._updateConfirmBtn();
    },

    _updateConfirmBtn() {
        const btn = this.overlay?.querySelector('.tutorial-btn-confirm');
        if (btn) {
            btn.disabled = !(this.chosenName && this.chosenClass);
        }
    },

    _confirmCharacterCreation() {
        if (!this.chosenName || !this.chosenClass) return;

        // Store name
        GameState.player.name = this.chosenName;

        // Give starter heroes based on class choice
        const starterTeam = CLASS_STARTER_MAP[this.chosenClass];
        if (starterTeam) {
            // Clear any existing deck/collection (fresh game)
            GameState.collection = [];
            GameState.deck = [];

            starterTeam.heroes.forEach(heroName => {
                const tmpl = CARD_TEMPLATES.find(t => t.name === heroName);
                if (tmpl) {
                    const card = generateCard(tmpl, 'common');
                    GameState.addToCollection(card);
                    GameState.deck.push(card.id);
                    card.inDeck = true;
                }
            });
        }

        // Give starter items if not already given
        if (!GameState.inventory || GameState.inventory.length === 0) {
            const starterSword = createItem(ITEM_TEMPLATES.find(t => t.name === 'Rusty Sword'));
            const starterArmor = createItem(ITEM_TEMPLATES.find(t => t.name === 'Leather Vest'));
            if (starterSword) GameState.addItem(starterSword);
            if (starterArmor) GameState.addItem(starterArmor);
        }

        GameState.save();
        console.log(`🎮 Character created: ${this.chosenName} (${this.chosenClass})`);

        // Update header display
        const nameEl = document.getElementById('player-name');
        if (nameEl) nameEl.textContent = this.chosenName;

        // Advance to next step
        this.next();
    },

    next() {
        if (this.step < this.STEPS.length - 1) this._saveStep(this.step + 1);
        this.step++;
        this.showStep();
    },

    prev() {
        if (this.step > 0) {
            this.step--;
            this.showStep();
        }
    },

    end() {
        this.active = false;
        this._uninstallKeyboardNav();
        this._clearSavedStep();
        if (this.overlay) {
            this.overlay.classList.add('fade-out');
            setTimeout(() => this.overlay?.remove(), this._reducedMotion() ? 0 : 300);
        }
        if (this.highlightEl) {
            this.highlightEl.classList.remove('tutorial-highlight');
        }

        // If collection is empty (user skipped character creation), give default starters
        if (!GameState.collection || GameState.collection.length === 0) {
            GameState.player.name = GameState.player.name || 'Adventurer';
            const starterNames = ['Silver Knight', 'Fire Wielder', 'Princess'];
            starterNames.forEach(heroName => {
                const tmpl = CARD_TEMPLATES.find(t => t.name === heroName);
                if (tmpl) {
                    const card = generateCard(tmpl, 'common');
                    GameState.addToCollection(card);
                    GameState.deck.push(card.id);
                    card.inDeck = true;
                }
            });
            // Give starter items
            if (!GameState.inventory || GameState.inventory.length === 0) {
                const starterSword = createItem(ITEM_TEMPLATES.find(t => t.name === 'Rusty Sword'));
                const starterArmor = createItem(ITEM_TEMPLATES.find(t => t.name === 'Leather Vest'));
                if (starterSword) GameState.addItem(starterSword);
                if (starterArmor) GameState.addItem(starterArmor);
            }
        }

        GameState.stats.tutorialDone = true;
        GameState.save();

        // Update player name display
        const nameEl = document.getElementById('player-name');
        if (nameEl && GameState.player.name) nameEl.textContent = GameState.player.name;

        // Refresh UI with final state
        if (typeof UI !== 'undefined' && UI.updateHeader) {
            UI.updateHeader();
        }

        // Show heroes screen so player can see their new cards
        if (typeof UI !== 'undefined' && UI.showScreen) {
            setTimeout(() => UI.showScreen('heroes'), 400);
        }
    },
};
