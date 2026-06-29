/* ========================================
 * PIXEL RAID — Turn-Based Battle Engine (v2)
 * 1v1 Card Battle RPG with Mana & Phases
 * Phases: Draw → Main → Attack → End
 * ======================================== */

const BattleEngine = {
    // ===== STATE =====
    isRunning: false,
    isPaused: false,
    currentPhase: 'idle',   // idle, draw, main, attack, end
    turnNumber: 0,
    isPlayerTurn: true,      // true = player's turn, false = enemy's turn
    battleTimer: null,
    onComplete: null,
    onTurnChange: null,
    onPhaseChange: null,
    onCardPlayed: null,
    log: [],

    // Combatants
    player: null,   // { hero, stats, buffs, shield, mana, maxMana, alive, deck, hand, discard }
    enemy: null,

    // ===== START BATTLE =====
    startBattle(playerHeroCard, playerCardIds, enemyHeroCard, enemyCardIds, onComplete) {
        this.isRunning = true;
        this.isPaused = false;
        this.turnNumber = 0;
        this.log = [];
        this.onComplete = onComplete;

        // Clear any leftover timers from a previous battle
        if (this._mainPhaseTimer) {
            clearTimeout(this._mainPhaseTimer);
            this._mainPhaseTimer = null;
        }
        if (this._phaseTimer) {
            clearTimeout(this._phaseTimer);
            this._phaseTimer = null;
        }

        // Initialize player combatant
        this.player = this._initCombatant(playerHeroCard, playerCardIds, true);

        // Initialize enemy combatant
        this.enemy = this._initCombatant(enemyHeroCard, enemyCardIds, false);

        // Determine first turn by SPD (coin flip if tie)
        if (this.player.stats.spd >= this.enemy.stats.spd) {
            this.isPlayerTurn = true;
        } else {
            this.isPlayerTurn = false;
        }

        this.addLog('⚔️ Battle Start!', 'info');
        this.addLog(`Your hero: ${this.player.name} (HP:${this.player.stats.hp} ATK:${this.player.stats.atk} DEF:${this.player.stats.def})`, 'info');
        this.addLog(`Enemy: ${this.enemy.name} (HP:${this.enemy.stats.hp} ATK:${this.enemy.stats.atk} DEF:${this.enemy.stats.def})`, 'info');

        // Show wave overlay
        this._showOverlay(`⚔️ ${this.isPlayerTurn ? 'You' : 'Enemy'} goes first!`, 'wave');

        // Draw starting hands
        this._drawStartingHand(this.player);
        this._drawStartingHand(this.enemy);

        // Render initial state
        this._renderBattle();

        // Start first turn after overlay
        setTimeout(() => {
            this._startTurn();
        }, 1500);
    },

    // ===== INIT COMBATANT =====
    _initCombatant(heroCard, cardIds, isPlayer) {
        const stats = { ...heroCard.stats };
        // Add mana stat (defaults to 0 if not present)
        if (!stats.mana && stats.mana !== 0) stats.mana = 0;
        if (!stats.maxMana && stats.maxMana !== 0) stats.maxMana = 0;

        // Build deck
        const deck = [];
        for (const cid of cardIds) {
            const tmpl = getSkillCardById(cid);
            if (tmpl) {
                deck.push({ ...tmpl, instanceId: Math.random().toString(36).substr(2, 9) });
            }
        }
        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return {
            hero: heroCard,
            name: heroCard.name,
            stats: stats,
            maxHp: stats.hp,
            buffs: [],
            debuffs: [],
            shield: 0,
            mana: 0,
            maxMana: 0,
            alive: true,
            deck: deck,
            hand: [],
            discard: [],
            isPlayer: isPlayer,
        };
    },

    // ===== DRAW =====
    _drawStartingHand(combatant) {
        for (let i = 0; i < DeckManager.STARTING_HAND; i++) {
            this._drawOneCard(combatant);
        }
    },

    _drawOneCard(combatant) {
        if (combatant.hand.length >= DeckManager.MAX_HAND) return null;

        // Reshuffle discard into deck if empty
        if (combatant.deck.length === 0) {
            if (combatant.discard.length === 0) return null;
            combatant.deck = [...combatant.discard];
            combatant.discard = [];
            // Shuffle
            for (let i = combatant.deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [combatant.deck[i], combatant.deck[j]] = [combatant.deck[j], combatant.deck[i]];
            }
        }

        const card = combatant.deck.pop();
        combatant.hand.push(card);
        return card;
    },

    // ===== TURN FLOW =====
    _startTurn() {
        if (!this.isRunning) return;

        this.turnNumber++;
        const current = this.isPlayerTurn ? this.player : this.enemy;
        const opponent = this.isPlayerTurn ? this.enemy : this.player;

        this.addLog(`\n— Turn ${this.turnNumber}: ${current.name}'s turn —`, 'info');

        // === DRAW PHASE ===
        this.currentPhase = 'draw';
        this._onPhaseChange('draw');

        // Increase mana (+1 per turn, max 10)
        current.maxMana = Math.min(10, current.maxMana + 1);
        current.mana = current.maxMana;

        // Draw a card
        const drawn = this._drawOneCard(current);
        if (drawn) {
            this.addLog(`📥 ${current.name} draws ${drawn.name}`, 'info');
        } else {
            this.addLog(`📥 ${current.name} can't draw (deck empty, hand full or no cards)`, 'info');
        }

        this._renderBattle();

        // === MAIN PHASE ===
        setTimeout(() => {
            if (!this.isRunning) return;
            this.currentPhase = 'main';
            this._onPhaseChange('main');

            if (this.isPlayerTurn) {
                // Player's turn: wait for card plays via UI
                try {
                    this._enablePlayerCards();
                } catch (e) {
                    console.warn('BattleEngine: _enablePlayerCards failed', e);
                }
                // Auto-advance to attack phase after timeout (15 seconds)
                this._mainPhaseTimer = setTimeout(() => {
                    if (this.currentPhase === 'main' && this.isRunning) {
                        this._startAttackPhase();
                    }
                }, 15000);
            } else {
                // Enemy AI plays cards
                this._aiPlayCards();
                setTimeout(() => {
                    if (this.isRunning) this._startAttackPhase();
                }, 800);
            }
        }, 600);
    },

    // ===== MAIN PHASE: PLAYER CARD PLAY =====
    _enablePlayerCards() {
        CardHand.render(this.player.hand, this.player.mana, true);
        CardHand.onCardPlay = (index, card) => {
            this._playCard(this.player, index, card, this.enemy);
        };
    },

    /**
     * Play a card from combatant's hand
     */
    _playCard(combatant, handIndex, card, target) {
        // Check mana
        if (combatant.mana < card.manaCost) {
            this.addLog(`❌ Not enough mana! Need ${card.manaCost}, have ${combatant.mana}`, 'info');
            return false;
        }

        // Spend mana
        combatant.mana -= card.manaCost;

        // Remove from hand, add to discard
        combatant.hand.splice(handIndex, 1);
        combatant.discard.push(card);

        this.addLog(`🃏 ${combatant.name} plays ${card.name} (${card.manaCost} mana)`, 'skill');

        // Apply card effect
        this._applyCardEffect(combatant, target, card);

        // Render
        this._renderBattle();

        // Re-enable cards for player if still in main phase
        if (this.isPlayerTurn && this.currentPhase === 'main') {
            this._enablePlayerCards();
        }

        // Callback
        if (this.onCardPlayed) this.onCardPlayed(combatant, card);

        return true;
    },

    /**
     * Apply a card's effect
     */
    _applyCardEffect(caster, target, card) {
        const eff = card.effect;

        switch (eff.type) {
            case 'damage': {
                let dmg = eff.value;

                // Bonus multiplier for matching type
                if (eff.bonus && caster.hero) {
                    const heroType = caster.hero.type || caster.hero.class;
                    if (heroType === eff.bonus.type) {
                        dmg = Math.floor(dmg * eff.bonus.mult);
                        this.addLog(`  🔥 Type bonus! (${heroType})`, 'skill');
                    }
                }

                // Apply DEF reduction
                dmg = Math.max(1, dmg - Math.floor(target.stats.def * 0.3));

                // Apply shield
                if (target.shield > 0) {
                    const absorbed = Math.min(target.shield, dmg);
                    target.shield -= absorbed;
                    dmg -= absorbed;
                    if (absorbed > 0) this.addLog(`  🛡️ Shield absorbed ${absorbed}`, 'info');
                }

                target.stats.hp = Math.max(0, target.stats.hp - dmg);
                this.addLog(`  💥 ${target.name} takes ${dmg} damage! (HP: ${target.stats.hp}/${target.maxHp})`, 'dmg');

                // Visual
                this._triggerAnimation('hit');
                this._showDamageNum(target, `-${dmg}`, '#ff4444');

                if (target.stats.hp <= 0) {
                    target.alive = false;
                    this.addLog(`  💀 ${target.name} defeated!`, 'death');
                }
                break;
            }

            case 'shield': {
                caster.shield += eff.value;
                this.addLog(`  🛡️ ${caster.name} gains ${eff.value} shield! (${caster.shield} total)`, 'skill');
                this._triggerAnimation('heal');
                this._showDamageNum(caster, `+${eff.value}🛡`, '#4488ff');
                break;
            }

            case 'heal': {
                const healed = Math.min(eff.value, caster.maxHp - caster.stats.hp);
                caster.stats.hp += healed;
                this.addLog(`  💚 ${caster.name} heals ${healed} HP! (HP: ${caster.stats.hp}/${caster.maxHp})`, 'heal');
                this._triggerAnimation('heal');
                this._showDamageNum(caster, `+${healed}`, '#44ff88');
                break;
            }

            case 'lifesteal': {
                let dmg = eff.value;
                dmg = Math.max(1, dmg - Math.floor(target.stats.def * 0.3));
                target.stats.hp = Math.max(0, target.stats.hp - dmg);
                const healed = Math.min(dmg, caster.maxHp - caster.stats.hp);
                caster.stats.hp += healed;
                this.addLog(`  🧛 ${caster.name} drains ${dmg}! Heals ${healed}!`, 'skill');
                this._triggerAnimation('hit');
                this._showDamageNum(target, `-${dmg}`, '#ff4444');
                this._showDamageNum(caster, `+${healed}`, '#44ff88');
                if (target.stats.hp <= 0) {
                    target.alive = false;
                    this.addLog(`  💀 ${target.name} defeated!`, 'death');
                }
                break;
            }

            case 'buff': {
                const buffObj = {
                    name: card.name,
                    stat: eff.stat,
                    value: eff.value,
                    flat: eff.flat || false,
                    duration: eff.duration,
                    turnsLeft: eff.duration,
                };
                caster.buffs.push(buffObj);

                // Apply immediately
                if (eff.flat) {
                    caster.stats[eff.stat] += eff.value;
                } else {
                    caster.stats[eff.stat] = Math.floor(caster.stats[eff.stat] * (1 + eff.value));
                }
                this.addLog(`  ✨ ${caster.name}: ${card.name} active! +${eff.flat ? eff.value : Math.floor(eff.value * 100) + '%'} ${eff.stat.toUpperCase()} for ${eff.duration}t`, 'buff');
                this._triggerAnimation('skill');
                break;
            }

            case 'debuff': {
                if (eff.stat === 'all') {
                    // Debuff all stats
                    for (const s of ['atk', 'def', 'spd']) {
                        const debuffObj = {
                            name: card.name,
                            stat: s,
                            value: eff.value,
                            duration: eff.duration,
                            turnsLeft: eff.duration,
                        };
                        target.debuffs.push(debuffObj);
                        target.stats[s] = Math.floor(target.stats[s] * (1 - eff.value));
                    }
                } else {
                    const debuffObj = {
                        name: card.name,
                        stat: eff.stat,
                        value: eff.value,
                        duration: eff.duration,
                        turnsLeft: eff.duration,
                    };
                    target.debuffs.push(debuffObj);
                    target.stats[eff.stat] = Math.floor(target.stats[eff.stat] * (1 - eff.value));
                }
                this.addLog(`  💀 ${target.name}: ${card.name} active! -${Math.floor(eff.value * 100)}% ${eff.stat.toUpperCase()} for ${eff.duration}t`, 'debuff');
                this._triggerAnimation('skill');
                break;
            }

            case 'mana_gain': {
                const gain = Math.min(eff.value, 10 - caster.mana);
                caster.mana += gain;
                this.addLog(`  💎 ${caster.name} gains ${gain} mana! (${caster.mana}/${caster.maxMana})`, 'skill');
                break;
            }
        }
    },

    // ===== ATTACK PHASE =====
    _startAttackPhase() {
        if (!this.isRunning || this.currentPhase !== 'main') return;

        // Clear main phase timer
        if (this._mainPhaseTimer) {
            clearTimeout(this._mainPhaseTimer);
            this._mainPhaseTimer = null;
        }

        // Disable card playing
        CardHand.enabled = false;

        this.currentPhase = 'attack';
        this._onPhaseChange('attack');

        const attacker = this.isPlayerTurn ? this.player : this.enemy;
        const defender = this.isPlayerTurn ? this.enemy : this.player;

        // Check if attacker is alive
        if (!attacker.alive) {
            this._startEndPhase();
            return;
        }

        // Auto-attack based on ATK stat
        let dmg = Math.max(1, attacker.stats.atk - Math.floor(defender.stats.def * 0.5));

        // Crit check
        const critChance = attacker.stats.crit || 0;
        let isCrit = false;
        if (Math.random() * 100 < critChance) {
            dmg = Math.floor(dmg * 1.8);
            isCrit = true;
        }

        // Apply shield
        if (defender.shield > 0) {
            const absorbed = Math.min(defender.shield, dmg);
            defender.shield -= absorbed;
            dmg -= absorbed;
            if (absorbed > 0) this.addLog(`  🛡️ Shield absorbed ${absorbed}`, 'info');
        }

        defender.stats.hp = Math.max(0, defender.stats.hp - dmg);

        const critText = isCrit ? ' CRIT!' : '';
        this.addLog(`⚔️ ${attacker.name} attacks ${defender.name} for ${dmg} dmg${critText}`, isCrit ? 'crit' : 'dmg');
        this._triggerAnimation(isCrit ? 'crit' : 'hit');
        this._showDamageNum(defender, isCrit ? `CRIT! -${dmg}` : `-${dmg}`, isCrit ? '#ffdd44' : '#ff4444');

        this._renderBattle();

        // Check death
        if (defender.stats.hp <= 0) {
            defender.alive = false;
            this.addLog(`💀 ${defender.name} defeated!`, 'death');
            this._endBattle(this.isPlayerTurn ? 'win' : 'lose');
            return;
        }

        // After attack animation, go to end phase
        setTimeout(() => {
            if (this.isRunning) this._startEndPhase();
        }, 600);
    },

    // ===== END PHASE =====
    _startEndPhase() {
        if (!this.isRunning) return;

        this.currentPhase = 'end';
        this._onPhaseChange('end');

        const current = this.isPlayerTurn ? this.player : this.enemy;

        // Expire buffs
        current.buffs = current.buffs.filter(buff => {
            buff.turnsLeft--;
            if (buff.turnsLeft <= 0) {
                // Remove the stat bonus
                if (buff.flat) {
                    current.stats[buff.stat] -= buff.value;
                } else {
                    current.stats[buff.stat] = Math.floor(current.stats[buff.stat] / (1 + buff.value));
                }
                this.addLog(`⏳ ${current.name}'s ${buff.name} wore off`, 'info');
                return false;
            }
            return true;
        });

        // Expire debuffs on current player's debuffs applied TO the opponent
        const opponent = this.isPlayerTurn ? this.enemy : this.player;
        opponent.debuffs = opponent.debuffs.filter(debuff => {
            debuff.turnsLeft--;
            if (debuff.turnsLeft <= 0) {
                // Restore the stat
                if (debuff.stat === 'all') {
                    for (const s of ['atk', 'def', 'spd']) {
                        opponent.stats[s] = Math.floor(opponent.stats[s] / (1 - debuff.value));
                    }
                } else {
                    opponent.stats[debuff.stat] = Math.floor(opponent.stats[debuff.stat] / (1 - debuff.value));
                }
                this.addLog(`⏳ ${opponent.name}'s ${debuff.name} wore off`, 'info');
                return false;
            }
            return true;
        });

        // Shield decay (lose 20% per turn)
        if (current.shield > 0) {
            current.shield = Math.floor(current.shield * 0.8);
            if (current.shield <= 0) current.shield = 0;
        }

        // Check win condition: deck out
        if (current.deck.length === 0 && current.hand.length === 0 && opponent.deck.length === 0 && opponent.hand.length === 0) {
            if (current.stats.hp > opponent.stats.hp) {
                this.addLog(`🏆 ${current.name} wins by HP advantage!`, 'win');
                this._endBattle(this.isPlayerTurn ? 'win' : 'lose');
                return;
            } else if (opponent.stats.hp > current.stats.hp) {
                this.addLog(`🏆 ${opponent.name} wins by HP advantage!`, 'win');
                this._endBattle(this.isPlayerTurn ? 'lose' : 'win');
                return;
            }
        }

        // Turn timeout (max 50 turns)
        if (this.turnNumber >= 50) {
            const winner = this.player.stats.hp >= this.enemy.stats.hp ? 'win' : 'lose';
            this.addLog(`⏰ Time out! ${winner === 'win' ? 'You win' : 'Enemy wins'} by HP!`, 'info');
            this._endBattle(winner);
            return;
        }

        this._renderBattle();

        // Switch turns
        setTimeout(() => {
            if (!this.isRunning) return;
            this.isPlayerTurn = !this.isPlayerTurn;
            this._startTurn();
        }, 500);
    },

    // ===== AI LOGIC =====
    _aiPlayCards() {
        const ai = this.enemy;
        const player = this.player;

        // Sort hand by priority
        const playable = ai.hand
            .map((card, i) => ({ card, index: i }))
            .filter(({ card }) => card.manaCost <= ai.mana)
            .sort((a, b) => {
                // Priority: heal when low HP, attack when player low, else random
                const hpRatio = ai.stats.hp / ai.maxHp;
                if (hpRatio < 0.3) {
                    // Low HP: prefer heal/defense
                    if (a.card.type === 'special' && a.card.effect.type === 'heal') return -1;
                    if (b.card.type === 'special' && b.card.effect.type === 'heal') return 1;
                    if (a.card.type === 'defense') return -1;
                    if (b.card.type === 'defense') return 1;
                }
                const playerHpRatio = player.stats.hp / player.maxHp;
                if (playerHpRatio < 0.5) {
                    // Player low: prefer attack
                    if (a.card.type === 'attack') return -1;
                    if (b.card.type === 'attack') return 1;
                }
                // Default: play highest mana cost first (maximize value)
                return b.card.manaCost - a.card.manaCost;
            });

        // Play up to 2 cards per turn
        let played = 0;
        for (const { card, index } of playable) {
            if (played >= 2) break;
            if (ai.mana < card.manaCost) continue;

            // Adjust index for previously removed cards
            const actualIndex = ai.hand.indexOf(card);
            if (actualIndex === -1) continue;

            this._playCard(ai, actualIndex, card, this.player);
            played++;
        }

        if (played === 0) {
            this.addLog(`🃏 ${ai.name} has no playable cards`, 'info');
        }
    },

    // ===== OVERLAYS & ANIMATIONS =====
    _showOverlay(text, type) {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;
        const overlay = document.createElement('div');
        overlay.className = 'battle-overlay';
        overlay.innerHTML = `<div class="battle-overlay-text battle-overlay-${type}">${text}</div>`;
        wrap.appendChild(overlay);
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 1500);
    },

    _triggerAnimation(type) {
        const canvas = document.getElementById('battle-canvas');
        if (!canvas) return;
        canvas.classList.remove('battle-shake', 'battle-shake-crit', 'battle-flash-red', 'battle-flash-yellow', 'battle-heal-glow');
        void canvas.offsetWidth;
        switch (type) {
            case 'hit':
                canvas.classList.add('battle-shake', 'battle-flash-red');
                setTimeout(() => canvas.classList.remove('battle-shake', 'battle-flash-red'), 300);
                break;
            case 'crit':
                canvas.classList.add('battle-shake-crit', 'battle-flash-yellow');
                setTimeout(() => canvas.classList.remove('battle-shake-crit', 'battle-flash-yellow'), 500);
                break;
            case 'heal':
                canvas.classList.add('battle-heal-glow');
                setTimeout(() => canvas.classList.remove('battle-heal-glow'), 500);
                break;
            case 'skill':
                canvas.classList.add('battle-skill-highlight');
                setTimeout(() => canvas.classList.remove('battle-skill-highlight'), 800);
                break;
        }
    },

    _showDamageNum(target, text, color) {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;
        const num = document.createElement('div');
        num.className = 'battle-damage-num';
        num.style.left = (50 + Math.random() * 30) + '%';
        num.style.top = target.isPlayer ? '65%' : '25%';
        num.style.color = color;
        num.textContent = text;
        wrap.appendChild(num);
        setTimeout(() => { if (num.parentNode) num.remove(); }, 1200);
    },

    _onPhaseChange(phase) {
        if (this.onPhaseChange) this.onPhaseChange(phase, this.isPlayerTurn);
    },

    // ===== RENDERING =====
    _renderBattle() {
        // Update canvas
        if (typeof BattleRenderer !== 'undefined' && BattleRenderer.renderBattle) {
            // Convert to array format for existing renderer
            const allyArr = [this.player].map(p => ({
                ...p.hero,
                stats: { ...p.stats },
                alive: p.alive,
                position: 0,
                buffs: p.buffs,
                shield: p.shield,
                class: p.hero.class || p.hero.cls,
            }));
            const enemyArr = [this.enemy].map(e => ({
                ...e.hero,
                stats: { ...e.stats },
                alive: e.alive,
                position: 0,
                buffs: e.buffs,
                shield: e.shield,
                class: e.hero.class || e.hero.cls,
            }));
            try {
                BattleRenderer.renderBattle(allyArr, enemyArr);
            } catch (e) {
                // Canvas renderer might not support 1v1 yet — that's OK
            }
        }

        // Update hero stats display
        this._updateHeroDisplay('player', this.player);
        this._updateHeroDisplay('enemy', this.enemy);

        // Update card hand
        if (this.isPlayerTurn && this.currentPhase === 'main') {
            CardHand.render(this.player.hand, this.player.mana, true);
        } else if (this.isPlayerTurn) {
            CardHand.render(this.player.hand, this.player.mana, false);
        }

        // Update deck count display
        const deckEl = document.getElementById('deck-count');
        if (deckEl) deckEl.textContent = this.player.deck.length;

        // Update phase display
        const phaseEl = document.getElementById('phase-display');
        if (phaseEl) {
            const phaseNames = { draw: '📥 Draw Phase', main: '🃏 Main Phase', attack: '⚔️ Attack Phase', end: '⏳ End Phase' };
            phaseEl.textContent = phaseNames[this.currentPhase] || '';
        }

        // Update turn display
        const turnEl = document.getElementById('turn-display');
        if (turnEl) {
            turnEl.textContent = `Turn ${this.turnNumber} — ${this.isPlayerTurn ? 'Your Turn' : 'Enemy Turn'}`;
        }

        // Update mana display
        const manaEl = document.getElementById('player-mana-display');
        if (manaEl) {
            const filled = '●'.repeat(this.player.mana);
            const empty = '○'.repeat(this.player.maxMana - this.player.mana);
            manaEl.textContent = `💎 ${filled}${empty} (${this.player.mana}/${this.player.maxMana})`;
        }

        // End turn button
        const endTurnBtn = document.getElementById('btn-end-turn');
        if (endTurnBtn) {
            endTurnBtn.style.display = (this.isPlayerTurn && this.currentPhase === 'main') ? 'block' : 'none';
        }

        // Callback
        if (this.onTurnChange) this.onTurnChange();
    },

    _updateHeroDisplay(side, combatant) {
        const prefix = side === 'player' ? 'player' : 'enemy';
        const hpBar = document.getElementById(`${prefix}-hp-fill`);
        const hpText = document.getElementById(`${prefix}-hp-text`);
        const nameEl = document.getElementById(`${prefix}-hero-name`);
        const shieldEl = document.getElementById(`${prefix}-shield-display`);
        const statsEl = document.getElementById(`${prefix}-stats-display`);

        if (hpBar) {
            const pct = Math.max(0, (combatant.stats.hp / combatant.maxHp) * 100);
            hpBar.style.width = pct + '%';
            hpBar.className = 'hp-fill' + (pct < 25 ? ' hp-critical' : pct < 50 ? ' hp-warning' : '');
        }
        if (hpText) hpText.textContent = `${combatant.stats.hp} / ${combatant.maxHp}`;
        if (nameEl) nameEl.textContent = combatant.name;
        if (shieldEl) shieldEl.textContent = combatant.shield > 0 ? `🛡️ ${combatant.shield}` : '';
        if (statsEl) {
            const s = combatant.stats;
            statsEl.textContent = `ATK:${s.atk} DEF:${s.def} SPD:${s.spd}`;
        }
    },

    // ===== END BATTLE =====
    _endBattle(result) {
        this.isRunning = false;
        this.currentPhase = 'idle';

        if (this._mainPhaseTimer) {
            clearTimeout(this._mainPhaseTimer);
            this._mainPhaseTimer = null;
        }

        if (result === 'win') {
            this._showOverlay('🏆 VICTORY!', 'clear');
            if (typeof Sound !== 'undefined') Sound.victory?.();
        } else {
            this._showOverlay('💀 DEFEATED', 'defeat');
            if (typeof Sound !== 'undefined') Sound.defeat?.();
        }

        // Distribute EXP
        const levelUps = this.distributeEXP(result === 'win');

        setTimeout(() => {
            if (this.onComplete) this.onComplete(result, this.log, this.turnNumber, levelUps);
        }, 2000);
    },

    // ===== EXP SYSTEM (retained) =====
    distributeEXP(isWin) {
        if (!isWin) return [];
        const levelUps = [];
        const expGain = Math.floor(20 + GameState.player.stage * 5);
        for (const card of GameState.collection) {
            if (GameState.deck.includes(card.id)) {
                if (!card.exp) card.exp = 0;
                if (!card.level) card.level = 1;
                card.exp += expGain;
                const expNeeded = card.level * 50;
                while (card.exp >= expNeeded) {
                    card.exp -= expNeeded;
                    card.level++;
                    const boost = Math.floor(2 + card.level * 0.5);
                    card.stats.atk += boost;
                    card.stats.def += boost;
                    card.stats.hp += boost * 3;
                    card.stats.maxHp += boost * 3;
                    levelUps.push({ name: card.name, level: card.level, boost });
                }
            }
        }
        GameState.save();
        return levelUps;
    },

    // ===== UTILITY =====
    addLog(text, type) {
        this.log.push({ text, type, turn: this.turnNumber });
        if (typeof console !== 'undefined') console.log(`[Battle] ${text}`);
    },

    pause() {
        if (!this.isRunning || this.isPaused) return;
        this.isPaused = true;
        if (this._mainPhaseTimer) clearTimeout(this._mainPhaseTimer);
    },

    resume() {
        if (!this.isRunning || !this.isPaused) return;
        this.isPaused = false;
        if (this.isPlayerTurn && this.currentPhase === 'main') {
            this._enablePlayerCards();
            this._mainPhaseTimer = setTimeout(() => {
                if (this.currentPhase === 'main' && this.isRunning) this._startAttackPhase();
            }, 15000);
        }
    },

    togglePause() {
        if (this.isPaused) this.resume(); else this.pause();
    },

    /**
     * Player clicks "End Turn" to skip to attack phase
     */
    endTurn() {
        if (this.isPlayerTurn && this.currentPhase === 'main' && this.isRunning) {
            this._startAttackPhase();
        }
    },

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentPhase = 'idle';
        if (this._mainPhaseTimer) clearTimeout(this._mainPhaseTimer);
        CardHand.clear();
    },

    /**
     * Get next turn order preview
     */
    getNextTurnOrder(count = 5) {
        const units = [];
        const p = { name: this.player.name, isAlly: true, alive: this.player.alive, class: this.player.hero?.class || this.player.hero?.cls };
        const e = { name: this.enemy.name, isAlly: false, alive: this.enemy.alive, class: this.enemy.hero?.class || this.enemy.hero?.cls };
        for (let i = 0; i < count; i++) {
            units.push(i % 2 === 0 ? p : e);
        }
        return units;
    },

    // ===== LEGACY COMPAT =====
    // These exist so existing UI code doesn't break
    get allyTeam() { return this.player ? [this.player] : []; },
    get enemyTeam() { return this.enemy ? [this.enemy] : []; },
};
