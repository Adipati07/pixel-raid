/* ========================================
 * PIXEL RAID — Yu-Gi-Oh! Style Battle Engine (v3)
 * Card Duel RPG with Field Zones & Phases
 * Phases: Draw → Main → Battle → End
 * ======================================== */

const BattleEngine = {
    // ===== STATE =====
    isRunning: false,
    isPaused: false,
    currentPhase: 'idle',   // idle, draw, main, battle, end
    turnNumber: 0,
    isPlayerTurn: true,
    battleTimer: null,
    onComplete: null,
    onTurnChange: null,
    onPhaseChange: null,
    onCardPlayed: null,
    onFieldUpdate: null,
    log: [],

    // LP (Life Points)
    MAX_LP: 4000,

    // Field zones per player
    HERO_ZONE_COUNT: 3,
    SKILL_ZONE_COUNT: 2,
    MAX_HAND: 7,
    STARTING_HAND: 5,

    // Combatants
    player: null,   // { name, lp, heroZones[3], skillZones[2], hand[], graveyard[], deck[], isPlayer }
    enemy: null,

    // Auto-play mode
    autoPlay: false,

    // Selected card for battle phase
    _selectedAttacker: null,
    _selectedTarget: null,
    _attackQueue: [],
    _mainPhaseTimer: null,
    _phaseTimer: null,
    _autoAdvanceTimer: null,

    // ===== START BATTLE =====
    startBattle(playerHeroCard, playerCardIds, enemyHeroCard, enemyCardIds, onComplete) {
        this.isRunning = true;
        this.isPaused = false;
        this.turnNumber = 0;
        this.log = [];
        this.onComplete = onComplete;
        this._selectedAttacker = null;
        this._selectedTarget = null;
        this._attackQueue = [];
        this._playerHasSummoned = false;
        this._playerHasUsedSkill = false;

        // Initialize animation system
        if (typeof BattleAnimations !== 'undefined') {
            BattleAnimations.stop(); // clear any leftover state
            BattleAnimations.init();
        }

        // Clear any leftover timers
        if (this._mainPhaseTimer) { clearTimeout(this._mainPhaseTimer); this._mainPhaseTimer = null; }
        if (this._phaseTimer) { clearTimeout(this._phaseTimer); this._phaseTimer = null; }
        if (this._autoAdvanceTimer) { clearTimeout(this._autoAdvanceTimer); this._autoAdvanceTimer = null; }

        // Initialize player combatant with Yu-Gi-Oh field
        this.player = this._initCombatant(playerHeroCard, playerCardIds, true);
        this.enemy = this._initCombatant(enemyHeroCard, enemyCardIds, false);

        // Determine first turn (coin flip / SPD comparison)
        if (this.player.heroes[0] && this.enemy.heroes[0]) {
            this.isPlayerTurn = (this.player.heroes[0].stats.spd >= this.enemy.heroes[0].stats.spd);
        } else {
            this.isPlayerTurn = Math.random() < 0.5;
        }

        this.addLog('⚔️ Duel Start!', 'info');
        this.addLog(`Your LP: ${this.player.lp} | Enemy LP: ${this.enemy.lp}`, 'info');

        // Show opening overlay
        this._showOverlay(`⚔️ ${this.isPlayerTurn ? 'You go' : 'Enemy goes'} first!`, 'wave');

        // Draw starting hands
        for (let i = 0; i < this.STARTING_HAND; i++) {
            this._drawOneCard(this.player);
            this._drawOneCard(this.enemy);
        }

        // Render initial state
        this._renderBattle();

        // Start first turn after overlay
        setTimeout(() => {
            this._startTurn();
        }, 1500);
    },

    // ===== INIT COMBATANT (Yu-Gi-Oh field) =====
    _initCombatant(heroCard, cardIds, isPlayer) {
        // Build deck: mix of hero cards and skill cards
        const deck = [];

        // Add hero card as a hero card entry (the main fighter)
        if (heroCard) {
            const heroEntry = {
                ...heroCard,
                instanceId: Math.random().toString(36).substr(2, 9),
                cardType: 'hero',       // 'hero' or 'skill'
                position: 'attack',     // 'attack' or 'defense'
                faceUp: true,
                currentHp: heroCard.stats.hp || heroCard.stats.maxHp,
                maxHp: heroCard.stats.hp || heroCard.stats.maxHp,
                canAttack: false,       // can't attack the turn it's summoned
                hasAttacked: false,
                atkBuff: 0,
                defBuff: 0,
            };
            // Add extra copies of hero to make deck more interesting
            deck.push({ ...heroEntry, instanceId: Math.random().toString(36).substr(2, 9) });
            deck.push({ ...heroEntry, instanceId: Math.random().toString(36).substr(2, 9) });
        }

        // Add skill cards to deck
        for (const cid of cardIds) {
            const tmpl = getSkillCardById(cid);
            if (tmpl) {
                deck.push({
                    ...tmpl,
                    instanceId: Math.random().toString(36).substr(2, 9),
                    cardType: 'skill',
                });
            }
        }

        // If deck is too small, pad with random skill cards
        while (deck.length < 15) {
            const pool = SKILL_CARD_TEMPLATES;
            const tmpl = pool[Math.floor(Math.random() * pool.length)];
            deck.push({
                ...tmpl,
                instanceId: Math.random().toString(36).substr(2, 9),
                cardType: 'skill',
            });
        }

        // Shuffle deck
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        // Scale hero stats for Yu-Gi-Oh style (multiply to match LP scale)
        const scaleStats = (card) => {
            if (card.cardType === 'hero') {
                const scale = 40; // Scale factor to match 4000 LP
                card.stats = { ...card.stats };
                card.stats.atk = Math.floor((card.stats.atk || 10) * scale);
                card.stats.def = Math.floor((card.stats.def || 10) * scale);
                card.currentHp = Math.floor((card.maxHp || 100) * scale);
                card.maxHp = card.currentHp;
            }
            return card;
        };

        deck.forEach(scaleStats);

        return {
            name: isPlayer ? 'Player' : (heroCard ? heroCard.name : 'Enemy'),
            hero: heroCard,
            lp: this.MAX_LP,
            heroZones: [null, null, null],      // 3 hero zone slots
            skillZones: [null, null],            // 2 skill zone slots
            hand: [],
            graveyard: [],
            deck: deck,
            isPlayer: isPlayer,
            heroes: heroCard ? [heroCard] : [],  // reference for synergy checks
        };
    },

    // ===== DRAW =====
    _drawOneCard(combatant) {
        if (combatant.hand.length >= this.MAX_HAND) return null;

        // Reshuffle graveyard into deck if empty
        if (combatant.deck.length === 0) {
            if (combatant.graveyard.length === 0) return null;
            combatant.deck = [...combatant.graveyard];
            combatant.graveyard = [];
            for (let i = combatant.deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [combatant.deck[i], combatant.deck[j]] = [combatant.deck[j], combatant.deck[i]];
            }
        }

        const card = combatant.deck.pop();
        if (card) {
            combatant.hand.push(card);
        }
        return card;
    },

    // ===== TURN FLOW =====
    _startTurn() {
        if (!this.isRunning) return;

        this.turnNumber++;
        this._playerHasSummoned = false;
        this._playerHasUsedSkill = false;
        const current = this.isPlayerTurn ? this.player : this.enemy;
        const opponent = this.isPlayerTurn ? this.enemy : this.player;

        this.addLog(`\n— Turn ${this.turnNumber}: ${current.name}'s turn —`, 'info');

        // === DRAW PHASE ===
        this.currentPhase = 'draw';
        this._onPhaseChange('draw');

        // Skip draw on turn 1 for the first player
        if (this.turnNumber > 1 || !this.isPlayerTurn) {
            const drawn = this._drawOneCard(current);
            if (drawn) {
                this.addLog(`📥 ${current.name} draws a card`, 'info');
            } else {
                this.addLog(`📥 ${current.name} can't draw (deck empty or hand full)`, 'info');
            }
        }

        // Reset attack flags for all heroes on field
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            const hero = current.heroZones[i];
            if (hero) {
                hero.hasAttacked = false;
                hero.canAttack = true; // can attack from turn after summon
            }
        }

        this._renderBattle();

        // === MAIN PHASE ===
        setTimeout(() => {
            if (!this.isRunning) return;
            this.currentPhase = 'main';
            this._onPhaseChange('main');

            if (this.isPlayerTurn) {
                this._enablePlayerCards();
                // Safety timeout: auto-advance to battle phase after 60s (player must click End Turn)
                this._mainPhaseTimer = setTimeout(() => {
                    if (this.currentPhase === 'main' && this.isRunning) {
                        this.addLog('⏰ Turn auto-advanced (60s timeout)', 'info');
                        this._startBattlePhase();
                    }
                }, 60000);
            } else {
                // Enemy AI plays cards
                this._aiPlayCards();
                setTimeout(() => {
                    if (this.isRunning) this._startBattlePhase();
                }, 1000);
            }
        }, 600);
    },

    // ===== MAIN PHASE: PLAYER CARD PLAY =====
    _enablePlayerCards() {
        // Determine which hero zones are empty for each card type
        const hasEmptyHeroZone = this.player.heroZones.some(z => z === null);
        const hasSummoned = this._playerHasSummoned; // once per turn normal summon
        const hasUsedSkill = this._playerHasUsedSkill || false;

        CardHand.render(this.player.hand, this.player, true, { hasEmptyHeroZone, hasSummoned, hasUsedSkill });
        CardHand.onCardPlay = (index, card) => {
            this.playCard(index);
        };
    },

    /**
     * Public API: Player plays a card from hand by index
     */
    playCard(handIndex) {
        if (!this.isPlayerTurn || this.currentPhase !== 'main') return false;
        const card = this.player.hand[handIndex];
        if (!card) return false;

        if (card.cardType === 'hero') {
            // Check summoning limit
            if (this._playerHasSummoned) {
                this.addLog('❌ Already summoned this turn!', 'info');
                CardHand.shakeCard(handIndex);
                return false;
            }
            // Check for empty zone
            const zoneIndex = this._findEmptyZone(this.player);
            if (zoneIndex === -1) {
                this.addLog('❌ No empty hero zones!', 'info');
                CardHand.shakeCard(handIndex);
                return false;
            }
            // Animate card out, then summon
            CardHand.animateCardPlay(handIndex, () => {
                this._summonHero(this.player, handIndex, zoneIndex, this.enemy);
                this._playerHasSummoned = true;
                // Auto-advance to battle phase after a card is played
                this._scheduleAutoAdvance();
            });
            return true;
        } else if (card.cardType === 'skill') {
            // Animate card out, then activate
            CardHand.animateCardPlay(handIndex, () => {
                this._activateSkill(this.player, handIndex, this.enemy);
                this._playerHasUsedSkill = true;
                // Auto-advance to battle phase after a card is played
                this._scheduleAutoAdvance();
            });
            return true;
        }
        return false;
    },

    /**
     * Find first empty hero zone for a combatant
     */
    _findEmptyZone(combatant) {
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            if (combatant.heroZones[i] === null) return i;
        }
        return -1;
    },

    /**
     * Summon a hero card from hand to a specific zone
     */
    _summonHero(combatant, handIndex, zoneIndex, target) {
        const card = combatant.hand.splice(handIndex, 1)[0];
        if (!card) return false;

        card.position = 'attack';
        card.faceUp = true;
        card.canAttack = false;
        card.hasAttacked = false;
        card.atkBuff = 0;
        card.defBuff = 0;
        combatant.heroZones[zoneIndex] = card;

        this.addLog(`🃏 ${combatant.name} summons ${card.name} to Zone ${zoneIndex + 1} (ATK)`, 'skill');

        // Spawn summon animation
        this._showDamageNum(combatant, `✦ Summon!`, '#ffd700');
        this._triggerAnimation('skill');

        // Emit event for renderer
        if (typeof BattleAnimations !== 'undefined') {
            const zonePos = this._getZoneScreenPos(combatant, zoneIndex);
            if (zonePos) {
                BattleAnimations.spawnSummonEffect(zonePos.x, zonePos.y);
            }
        }

        this._renderBattle();
        if (this.isPlayerTurn && this.currentPhase === 'main') {
            this._enablePlayerCards();
        }
        if (this.onCardPlayed) this.onCardPlayed(combatant, card);
        return true;
    },

    /**
     * Activate a skill card from hand
     */
    _activateSkill(combatant, handIndex, target) {
        const card = combatant.hand.splice(handIndex, 1)[0];
        if (!card) return false;

        this._activateSkillCard(combatant, target, card);
        combatant.graveyard.push(card);

        this._renderBattle();
        if (this.isPlayerTurn && this.currentPhase === 'main') {
            this._enablePlayerCards();
        }
        if (this.onCardPlayed) this.onCardPlayed(combatant, card);
        return true;
    },

    /**
     * Get approximate screen position of a hero zone for animations
     */
    _getZoneScreenPos(combatant, zoneIndex) {
        const canvas = document.getElementById('battle-canvas');
        if (!canvas) return null;
        const W = canvas.width;
        const H = canvas.height;
        const rowHeight = H / 6;
        const zoneW = 80;
        const totalHeroW = zoneW * 3 + 20;
        const heroStartX = (W - totalHeroW) / 2;

        if (combatant.isPlayer) {
            const heroY = rowHeight * 3 + (rowHeight * 2 - 100) / 2;
            return {
                x: heroStartX + zoneIndex * (zoneW + 10) + zoneW / 2,
                y: heroY + 50,
            };
        } else {
            const heroY = rowHeight + (rowHeight * 2 - 100) / 2;
            return {
                x: heroStartX + zoneIndex * (zoneW + 10) + zoneW / 2,
                y: heroY + 50,
            };
        }
    },

    /**
     * Play a card from hand to field
     */
    _playCard(combatant, handIndex, card, target) {
        // Remove from hand
        combatant.hand.splice(handIndex, 1);

        if (card.cardType === 'hero') {
            // Find empty hero zone
            let zoneIndex = -1;
            for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
                if (combatant.heroZones[i] === null) {
                    zoneIndex = i;
                    break;
                }
            }
            if (zoneIndex === -1) {
                this.addLog(`❌ No empty hero zones!`, 'info');
                combatant.hand.splice(handIndex, 0, card); // put back
                return false;
            }

            // Summon hero to zone (in Attack Position by default)
            card.position = 'attack';
            card.faceUp = true;
            card.canAttack = false; // can't attack the turn it's summoned (summoning sickness)
            card.hasAttacked = false;
            card.atkBuff = 0;
            card.defBuff = 0;
            combatant.heroZones[zoneIndex] = card;

            this.addLog(`🃏 ${combatant.name} summons ${card.name} to Hero Zone ${zoneIndex + 1} (ATK Position)`, 'skill');
            this._showDamageNum(combatant.isPlayer ? this.player : this.enemy, `Summon!`, '#ffd700');
        } else if (card.cardType === 'skill') {
            // Find empty skill zone
            let zoneIndex = -1;
            for (let i = 0; i < this.SKILL_ZONE_COUNT; i++) {
                if (combatant.skillZones[i] === null) {
                    zoneIndex = i;
                    break;
                }
            }
            if (zoneIndex === -1) {
                // If no skill zone, activate immediately and discard
                this._activateSkillCard(combatant, target, card);
                combatant.graveyard.push(card);
                this._renderBattle();
                if (this.isPlayerTurn && this.currentPhase === 'main') {
                    this._enablePlayerCards();
                }
                if (this.onCardPlayed) this.onCardPlayed(combatant, card);
                return true;
            }

            // Place in skill zone and activate immediately
            combatant.skillZones[zoneIndex] = card;
            this._activateSkillCard(combatant, target, card);

            // Move to graveyard after activation
            setTimeout(() => {
                combatant.skillZones[zoneIndex] = null;
                combatant.graveyard.push(card);
                this._renderBattle();
            }, 500);
        }

        this._renderBattle();

        // Re-enable cards for player if still in main phase
        if (this.isPlayerTurn && this.currentPhase === 'main') {
            this._enablePlayerCards();
        }

        if (this.onCardPlayed) this.onCardPlayed(combatant, card);
        return true;
    },

    /**
     * Activate a skill card's effect
     */
    _activateSkillCard(caster, target, card) {
        const eff = card.effect;
        this.addLog(`✨ ${caster.name} activates ${card.name}`, 'skill');

        switch (eff.type) {
            case 'damage': {
                let dmg = eff.value;
                // Apply to enemy LP directly (or enemy hero if targeting)
                const enemyCombatant = caster.isPlayer ? this.enemy : this.player;
                const enemyHero = this._getStrongestHero(enemyCombatant);
                if (enemyHero) {
                    // Damage the hero
                    const scaledDmg = dmg * 10; // Scale skill damage
                    enemyHero.currentHp = Math.max(0, enemyHero.currentHp - scaledDmg);
                    this.addLog(`  💥 ${enemyHero.name} takes ${scaledDmg} damage! (HP: ${enemyHero.currentHp}/${enemyHero.maxHp})`, 'dmg');
                    this._showDamageNum(enemyCombatant, `-${scaledDmg}`, '#ff4444');
                    if (enemyHero.currentHp <= 0) {
                        this._destroyHero(enemyCombatant, enemyHero);
                    }
                } else {
                    // Direct LP damage
                    const scaledDmg = dmg * 10;
                    enemyCombatant.lp = Math.max(0, enemyCombatant.lp - scaledDmg);
                    this.addLog(`  💥 ${enemyCombatant.name} takes ${scaledDmg} LP damage! (LP: ${enemyCombatant.lp})`, 'dmg');
                    this._showDamageNum(enemyCombatant, `-${scaledDmg}`, '#ff4444');
                }
                this._triggerAnimation('hit');
                break;
            }

            case 'shield': {
                const hero = this._getStrongestHero(caster);
                if (hero) {
                    hero.defBuff += eff.value * 10;
                    this.addLog(`  🛡️ ${hero.name} gains +${eff.value * 10} DEF!`, 'skill');
                    this._showDamageNum(caster, `+${eff.value * 10}🛡`, '#4488ff');
                }
                this._triggerAnimation('heal');
                break;
            }

            case 'heal': {
                const hero = this._getWeakestHero(caster);
                if (hero) {
                    const healed = Math.min(eff.value * 10, hero.maxHp - hero.currentHp);
                    hero.currentHp += healed;
                    this.addLog(`  💚 ${hero.name} heals ${healed} HP! (HP: ${hero.currentHp}/${hero.maxHp})`, 'heal');
                    this._showDamageNum(caster, `+${healed}`, '#44ff88');
                }
                // Also heal LP
                const lpHeal = eff.value * 5;
                caster.lp = Math.min(this.MAX_LP, caster.lp + lpHeal);
                this.addLog(`  💚 ${caster.name} heals ${lpHeal} LP! (LP: ${caster.lp})`, 'heal');
                this._triggerAnimation('heal');
                break;
            }

            case 'lifesteal': {
                const enemyCombatant = caster.isPlayer ? this.enemy : this.player;
                const enemyHero = this._getStrongestHero(enemyCombatant);
                let dmg = eff.value * 10;
                if (enemyHero) {
                    enemyHero.currentHp = Math.max(0, enemyHero.currentHp - dmg);
                    const healed = Math.min(dmg, caster.lp > 0 ? this.MAX_LP - caster.lp : 0);
                    caster.lp = Math.min(this.MAX_LP, caster.lp + Math.floor(dmg / 2));
                    this.addLog(`  🧛 Drains ${dmg}! Heals ${Math.floor(dmg / 2)} LP!`, 'skill');
                    this._showDamageNum(enemyCombatant, `-${dmg}`, '#ff4444');
                    this._showDamageNum(caster, `+${Math.floor(dmg / 2)}`, '#44ff88');
                    if (enemyHero.currentHp <= 0) {
                        this._destroyHero(enemyCombatant, enemyHero);
                    }
                }
                this._triggerAnimation('hit');
                break;
            }

            case 'buff': {
                // Buff all heroes on caster's field
                for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
                    const hero = caster.heroZones[i];
                    if (hero) {
                        if (eff.stat === 'atk') {
                            hero.atkBuff += Math.floor(hero.stats.atk * eff.value);
                            this.addLog(`  ✨ ${hero.name}: ATK +${Math.floor(hero.stats.atk * eff.value)}`, 'buff');
                        } else if (eff.stat === 'def') {
                            hero.defBuff += Math.floor(hero.stats.def * eff.value);
                            this.addLog(`  ✨ ${hero.name}: DEF +${Math.floor(hero.stats.def * eff.value)}`, 'buff');
                        }
                    }
                }
                this._triggerAnimation('skill');
                break;
            }

            case 'debuff': {
                const enemyCombatant = caster.isPlayer ? this.enemy : this.player;
                for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
                    const hero = enemyCombatant.heroZones[i];
                    if (hero) {
                        if (eff.stat === 'atk' || eff.stat === 'all') {
                            hero.atkBuff -= Math.floor(hero.stats.atk * eff.value);
                        }
                        if (eff.stat === 'def' || eff.stat === 'all') {
                            hero.defBuff -= Math.floor(hero.stats.def * eff.value);
                        }
                        this.addLog(`  💀 ${hero.name}: Stats reduced!`, 'debuff');
                    }
                }
                this._triggerAnimation('skill');
                break;
            }

            case 'mana_gain': {
                // In Yu-Gi-Oh style, this could be a draw effect
                const drawn = this._drawOneCard(caster);
                if (drawn) {
                    this.addLog(`  📥 ${caster.name} draws an extra card!`, 'skill');
                }
                break;
            }
        }

        // Check win conditions after skill activation
        this._checkWinConditions();
    },

    /**
     * Get strongest hero on field (highest ATK)
     */
    _getStrongestHero(combatant) {
        let strongest = null;
        let maxAtk = -1;
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            const hero = combatant.heroZones[i];
            if (hero) {
                const totalAtk = hero.stats.atk + hero.atkBuff;
                if (totalAtk > maxAtk) {
                    maxAtk = totalAtk;
                    strongest = hero;
                }
            }
        }
        return strongest;
    },

    /**
     * Get weakest hero on field (lowest current HP)
     */
    _getWeakestHero(combatant) {
        let weakest = null;
        let minHp = Infinity;
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            const hero = combatant.heroZones[i];
            if (hero && hero.currentHp < minHp) {
                minHp = hero.currentHp;
                weakest = hero;
            }
        }
        return weakest;
    },

    /**
     * Get a random enemy hero on field
     */
    _getRandomEnemyHero(combatant) {
        const heroes = [];
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            if (combatant.heroZones[i]) heroes.push({ hero: combatant.heroZones[i], index: i });
        }
        if (heroes.length === 0) return null;
        return heroes[Math.floor(Math.random() * heroes.length)];
    },

    /**
     * Destroy a hero (send to graveyard)
     */
    _destroyHero(combatant, hero) {
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            if (combatant.heroZones[i] === hero) {
                combatant.heroZones[i] = null;
                combatant.graveyard.push(hero);
                this.addLog(`  💀 ${hero.name} is destroyed!`, 'death');
                break;
            }
        }
    },

    // ===== BATTLE PHASE =====
    _startBattlePhase() {
        if (!this.isRunning || this.currentPhase !== 'main') return;

        if (this._mainPhaseTimer) {
            clearTimeout(this._mainPhaseTimer);
            this._mainPhaseTimer = null;
        }

        CardHand.enabled = false;
        this.currentPhase = 'battle';
        this._onPhaseChange('battle');

        const attacker = this.isPlayerTurn ? this.player : this.enemy;
        const defender = this.isPlayerTurn ? this.enemy : this.player;

        // Build attack queue: all heroes that can attack
        this._attackQueue = [];
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            const hero = attacker.heroZones[i];
            if (hero && hero.canAttack && !hero.hasAttacked && hero.position === 'attack' && hero.faceUp) {
                this._attackQueue.push({ hero, zoneIndex: i });
            }
        }

        if (this._attackQueue.length === 0) {
            this.addLog(`⚔️ No heroes can attack`, 'info');
            setTimeout(() => {
                if (this.isRunning) this._startEndPhase();
            }, 500);
            return;
        }

        // Process attacks sequentially
        this._processNextAttack(attacker, defender);
    },

    _processNextAttack(attacker, defender) {
        if (!this.isRunning || this._attackQueue.length === 0) {
            this._startEndPhase();
            return;
        }

        const { hero: atkHero, zoneIndex: atkIdx } = this._attackQueue.shift();
        atkHero.hasAttacked = true;

        const totalAtk = atkHero.stats.atk + atkHero.atkBuff;

        // Check if defender has any heroes on field (must attack them first)
        const defHeroes = [];
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            if (defender.heroZones[i]) defHeroes.push({ hero: defender.heroZones[i], index: i });
        }

        if (defHeroes.length === 0) {
            // DIRECT ATTACK! No monsters to block
            const lpDamage = totalAtk;
            defender.lp = Math.max(0, defender.lp - lpDamage);
            this.addLog(`⚔️ ${atkHero.name} attacks directly! ${lpDamage} damage! (LP: ${defender.lp})`, 'dmg');
            defender._lastHitZone = 0;
            if (typeof BattlePhaser !== 'undefined' && BattlePhaser.isActive()) {
                BattlePhaser.animateAttack(atkIdx, 0, this.isPlayerTurn, lpDamage, lpDamage > 800);
            }
            if (typeof BattleArenaScene !== 'undefined' && BattleArenaScene.isActive()) {
                BattleArenaScene.playAttack(atkIdx, 0, this.isPlayerTurn, lpDamage, lpDamage > 800);
            }
            this._showDamageNum(defender, `-${lpDamage}`, '#ff4444');
            this._triggerAnimation('crit');
            if (typeof BattleAnimations !== 'undefined') {
                BattleAnimations.shakeScreen(5, 0.3);
            }

            this._renderBattle();

            if (this._checkWinConditions()) return;

            setTimeout(() => {
                this._processNextAttack(attacker, defender);
            }, 800);
            return;
        }

        // Pick target: AI picks weakest, player could pick but for simplicity pick random/weakest
        let targetInfo;
        if (this.isPlayerTurn) {
            // Player attacks: target the first available enemy hero (simplified)
            targetInfo = defHeroes[0];
        } else {
            // AI targets the weakest hero
            targetInfo = defHeroes.reduce((weakest, curr) => {
                return (curr.hero.currentHp < weakest.hero.currentHp) ? curr : weakest;
            }, defHeroes[0]);
        }

        const defHero = targetInfo.hero;
        const defIdx = targetInfo.index;
        const totalDef = defHero.stats.def + defHero.defBuff;

        if (defHero.position === 'attack') {
            // ATK vs ATK battle
            const damage = totalAtk - (defHero.stats.atk + defHero.atkBuff);
            const isCrit = Math.abs(damage) > 800;

            // Trigger attack lunge animation
            defHero._lastHitZone = defIdx;
            atkHero._lastHitZone = atkIdx;
            if (typeof BattlePhaser !== 'undefined' && BattlePhaser.isActive()) {
                BattlePhaser.animateAttack(atkIdx, defIdx, this.isPlayerTurn, Math.abs(damage), isCrit);
            }
            if (typeof BattleArenaScene !== 'undefined' && BattleArenaScene.isActive()) {
                BattleArenaScene.playAttack(atkIdx, defIdx, this.isPlayerTurn, Math.abs(damage), isCrit);
            }

            if (totalAtk > (defHero.stats.atk + defHero.atkBuff)) {
                // Attacker wins: defender destroyed, defender takes damage
                this.addLog(`⚔️ ${atkHero.name} (${totalAtk} ATK) vs ${defHero.name} (${defHero.stats.atk + defHero.atkBuff} ATK)`, 'dmg');
                this._destroyHero(defender, defHero);
                const lpDmg = Math.abs(damage);
                defender.lp = Math.max(0, defender.lp - lpDmg);
                this.addLog(`  💥 ${defender.name} takes ${lpDmg} battle damage! (LP: ${defender.lp})`, 'dmg');
                this._showDamageNum(defender, `-${lpDmg}`, '#ff4444');
                this._triggerAnimation(isCrit ? 'crit' : 'hit');
            } else if (totalAtk < (defHero.stats.atk + defHero.atkBuff)) {
                // Defender wins: attacker destroyed, attacker takes damage
                this.addLog(`⚔️ ${atkHero.name} (${totalAtk} ATK) vs ${defHero.name} (${defHero.stats.atk + defHero.atkBuff} ATK)`, 'dmg');
                this._destroyHero(attacker, atkHero);
                const lpDmg = Math.abs(damage);
                attacker.lp = Math.max(0, attacker.lp - lpDmg);
                this.addLog(`  💥 ${attacker.name} takes ${lpDmg} battle damage! (LP: ${attacker.lp})`, 'dmg');
                this._showDamageNum(attacker, `-${lpDmg}`, '#ff4444');
                this._triggerAnimation(isCrit ? 'crit' : 'hit');
            } else {
                // Tie: both destroyed
                this.addLog(`⚔️ ${atkHero.name} vs ${defHero.name} — Mutual destruction!`, 'dmg');
                this._destroyHero(attacker, atkHero);
                this._destroyHero(defender, defHero);
                this._triggerAnimation('hit');
            }
        } else {
            // ATK vs DEF battle
            defHero._lastHitZone = defIdx;
            if (typeof BattlePhaser !== 'undefined' && BattlePhaser.isActive()) {
                const dmg = totalAtk > totalDef ? totalAtk - totalDef : totalDef - totalAtk;
                BattlePhaser.animateAttack(atkIdx, defIdx, this.isPlayerTurn, dmg, dmg > 800);
            }
            if (typeof BattleArenaScene !== 'undefined' && BattleArenaScene.isActive()) {
                const dmg = totalAtk > totalDef ? totalAtk - totalDef : totalDef - totalAtk;
                BattleArenaScene.playAttack(atkIdx, defIdx, this.isPlayerTurn, dmg, dmg > 800);
            }

            if (defHero.faceUp) {
                this.addLog(`⚔️ ${atkHero.name} (${totalAtk} ATK) attacks ${defHero.name} (DEF Position, ${totalDef} DEF)`, 'dmg');
            } else {
                this.addLog(`⚔️ ${atkHero.name} (${totalAtk} ATK) attacks face-down monster`, 'dmg');
            }

            if (totalAtk > totalDef) {
                // Defender destroyed, no LP damage
                if (!defHero.faceUp) {
                    defHero.faceUp = true; // flip face-up
                    this.addLog(`  🔄 ${defHero.name} is flipped face-up!`, 'info');
                }
                this._destroyHero(defender, defHero);
                this.addLog(`  💀 ${defHero.name} destroyed!`, 'death');
                this._triggerAnimation('hit');
            } else if (totalAtk < totalDef) {
                // Attacker takes difference as damage
                const lpDmg = totalDef - totalAtk;
                attacker.lp = Math.max(0, attacker.lp - lpDmg);
                this.addLog(`  💥 ${attacker.name} takes ${lpDmg} damage! (LP: ${attacker.lp})`, 'dmg');
                this._showDamageNum(attacker, `-${lpDmg}`, '#ff4444');
                this._triggerAnimation('hit');
                if (!defHero.faceUp) {
                    defHero.faceUp = true;
                    this.addLog(`  🔄 ${defHero.name} is flipped face-up!`, 'info');
                }
            } else {
                // Equal: nothing happens
                this.addLog(`  ⚖️ Equal stats! Nothing happens.`, 'info');
                if (!defHero.faceUp) {
                    defHero.faceUp = true;
                }
            }
        }

        this._renderBattle();

        if (this._checkWinConditions()) return;

        // Process next attack after delay
        setTimeout(() => {
            this._processNextAttack(attacker, defender);
        }, 1000);
    },

    // ===== END PHASE =====
    _startEndPhase() {
        if (!this.isRunning) return;

        this.currentPhase = 'end';
        this._onPhaseChange('end');

        const current = this.isPlayerTurn ? this.player : this.enemy;

        // End-of-turn effects: decay buffs
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            const hero = current.heroZones[i];
            if (hero) {
                // Buffs decay slightly each turn
                if (hero.atkBuff > 0) hero.atkBuff = Math.floor(hero.atkBuff * 0.8);
                if (hero.defBuff > 0) hero.defBuff = Math.floor(hero.defBuff * 0.8);
                if (hero.atkBuff < 0) hero.atkBuff = Math.floor(hero.atkBuff * 0.8);
                if (hero.defBuff < 0) hero.defBuff = Math.floor(hero.defBuff * 0.8);
            }
        }

        this._renderBattle();

        // Switch turns
        setTimeout(() => {
            if (!this.isRunning) return;
            this.isPlayerTurn = !this.isPlayerTurn;
            this._startTurn();
        }, 500);
    },

    // ===== WIN CONDITIONS =====
    _checkWinConditions() {
        if (!this.isRunning) return false;

        // LP reaches 0
        if (this.player.lp <= 0) {
            this.addLog(`💀 Player LP reached 0!`, 'death');
            this._endBattle('lose');
            return true;
        }
        if (this.enemy.lp <= 0) {
            this.addLog(`🏆 Enemy LP reached 0!`, 'win');
            this._endBattle('win');
            return true;
        }

        // Deck out (no cards in deck and can't draw)
        if (this.player.deck.length === 0 && this.player.hand.length === 0) {
            let hasHeroes = false;
            for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
                if (this.player.heroZones[i]) { hasHeroes = true; break; }
            }
            if (!hasHeroes) {
                this.addLog(`💀 Player has no cards left!`, 'death');
                this._endBattle('lose');
                return true;
            }
        }
        if (this.enemy.deck.length === 0 && this.enemy.hand.length === 0) {
            let hasHeroes = false;
            for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
                if (this.enemy.heroZones[i]) { hasHeroes = true; break; }
            }
            if (!hasHeroes) {
                this.addLog(`🏆 Enemy has no cards left!`, 'win');
                this._endBattle('win');
                return true;
            }
        }

        // Turn limit
        if (this.turnNumber >= 50) {
            const winner = this.player.lp >= this.enemy.lp ? 'win' : 'lose';
            this.addLog(`⏰ Time out! ${winner === 'win' ? 'You win' : 'Enemy wins'} by LP!`, 'info');
            this._endBattle(winner);
            return true;
        }

        return false;
    },

    // ===== AI LOGIC =====
    _aiPlayCards() {
        const ai = this.enemy;
        let aiSummoned = false;

        // Sort hand: play heroes first, then skills
        const playable = ai.hand
            .map((card, i) => ({ card, index: i }))
            .sort((a, b) => {
                // Heroes first
                if (a.card.cardType === 'hero' && b.card.cardType !== 'hero') return -1;
                if (b.card.cardType === 'hero' && a.card.cardType !== 'hero') return 1;
                // Among heroes, highest ATK first
                if (a.card.cardType === 'hero' && b.card.cardType === 'hero') {
                    return (b.card.stats.atk || 0) - (a.card.stats.atk || 0);
                }
                // Among skills, prefer damage when player LP is low, heal when AI LP is low
                if (ai.lp < this.MAX_LP * 0.4) {
                    if (a.card.effect && a.card.effect.type === 'heal') return -1;
                    if (b.card.effect && b.card.effect.type === 'heal') return 1;
                }
                return 0;
            });

        // Play up to 3 cards per turn
        let played = 0;
        for (const { card } of playable) {
            if (played >= 3) break;

            const actualIndex = ai.hand.indexOf(card);
            if (actualIndex === -1) continue;

            if (card.cardType === 'hero') {
                if (aiSummoned) continue; // one summon per turn
                const zone = this._findEmptyZone(ai);
                if (zone === -1) continue;
                this._summonHero(ai, actualIndex, zone, this.player);
                aiSummoned = true;
            } else if (card.cardType === 'skill') {
                this._activateSkill(ai, actualIndex, this.player);
                }
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
        // Use BattlePhaser (WebGL) or BattleArenaScene (Canvas) or CSS fallback
        if (typeof BattlePhaser !== 'undefined' && BattlePhaser.isActive()) {
            switch (type) {
                case 'hit':
                    BattlePhaser.triggerShake(5, 0.3);
                    break;
                case 'crit':
                    BattlePhaser.triggerShake(10, 0.6);
                    break;
                case 'skill':
                    BattlePhaser.showPhaseBanner('SKILL ACTIVATE!', this.isPlayerTurn);
                    break;
            }
            return;
        }
        if (typeof BattleArenaScene !== 'undefined' && BattleArenaScene.isActive()) {
            switch (type) {
                case 'hit':
                    BattleArenaScene.triggerShake(5, 0.3);
                    break;
                case 'crit':
                    BattleArenaScene.triggerShake(10, 0.6);
                    break;
                case 'heal':
                    // Heal glow handled by spawnHealNumber in _showDamageNum
                    break;
                case 'skill':
                    BattleArenaScene.showPhaseBanner('SKILL ACTIVATE!', this.isPlayerTurn);
                    break;
            }
            return;
        }
        // Fallback: CSS class-based animation
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
        if (typeof BattlePhaser !== 'undefined' && BattlePhaser.isActive()) {
            const pos = BattlePhaser.getHeroZonePosition(
                target._lastHitZone || 0,
                target.isPlayer
            );
            if (color === '#44ff88' || color === '#22cc66') {
                BattlePhaser.spawnHealText(parseInt(text.replace(/[^0-9]/g, '')) || 0, pos.x, pos.y - 20);
            } else {
                BattlePhaser.spawnDmgText(
                    parseInt(text.replace(/[^0-9]/g, '')) || text,
                    pos.x + (Math.random() - 0.5) * 30,
                    pos.y - 20,
                    color
                );
            }
            return;
        }
        if (typeof BattleArenaScene !== 'undefined' && BattleArenaScene.isActive()) {
            // Use Canvas-based damage numbers via BattleArenaScene
            const pos = BattleArenaScene.getHeroZonePosition(
                target._lastHitZone || 0,
                target.isPlayer
            );
            if (color === '#44ff88' || color === '#22cc66') {
                // Heal
                BattleArenaScene.spawnHealNumber(pos.x, pos.y - 20, parseInt(text.replace(/[^0-9]/g, '')) || 0);
            } else {
                // Damage
                const isCrit = text.includes('CRIT') || text.includes('💥');
                BattleArenaScene.spawnDamageNumber(
                    pos.x + (Math.random() - 0.5) * 30,
                    pos.y - 20,
                    parseInt(text.replace(/[^0-9]/g, '')) || text,
                    isCrit
                );
            }
            return;
        }
        if (typeof BattleAnimations !== 'undefined') {
            const canvas = document.getElementById('battle-canvas');
            if (canvas) {
                const x = canvas.width * (0.4 + Math.random() * 0.2);
                const y = target.isPlayer ? canvas.height * 0.65 : canvas.height * 0.25;
                BattleAnimations.spawnDamageNumber(x, y, text, color);
                if (text.includes('-') && parseInt(text.replace(/[^0-9]/g, '')) > 500) {
                    BattleAnimations.shakeScreen(4, 0.3);
                }
            }
        } else {
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
        }
    },

    _onPhaseChange(phase) {
        const phaseNames = {
            draw: 'DRAW PHASE',
            main: 'MAIN PHASE',
            battle: 'BATTLE PHASE',
            end: 'END PHASE',
        };
        if (typeof BattlePhaser !== 'undefined' && BattlePhaser.isActive()) {
            if (phaseNames[phase]) {
                BattlePhaser.showPhaseBanner(phaseNames[phase], this.isPlayerTurn);
            }
        } else
        if (typeof BattleArenaScene !== 'undefined' && BattleArenaScene.isActive()) {
            // Canvas-based phase banner via scene
            if (phaseNames[phase]) {
                BattleArenaScene.showPhaseBanner(phaseNames[phase], this.isPlayerTurn);
            }
        } else if (typeof BattleAnimations !== 'undefined' && phaseNames[phase]) {
            BattleAnimations.showPhaseBanner(phaseNames[phase], this.isPlayerTurn);
        }
        if (this.onPhaseChange) this.onPhaseChange(phase, this.isPlayerTurn);
    },

    // ===== RENDERING =====
    _renderBattle() {
        // BattlePhaser (Phaser.js WebGL) or BattleArenaScene (Canvas) handles field rendering
        if (typeof BattlePhaser !== 'undefined' && BattlePhaser.isActive()) {
            BattlePhaser.renderField(this.player, this.enemy);
        } else if (typeof BattleArenaScene !== 'undefined' && BattleArenaScene.isActive()) {
            // Scene renders itself — just update companion DOM elements
        } else if (typeof BattleRenderer !== 'undefined' && BattleRenderer.renderBattle) {
            // Fallback to old renderer if scene not active
            try {
                BattleRenderer.renderBattle(this.player, this.enemy);
            } catch (e) {
                console.warn('BattleRenderer error:', e);
            }
        }

        // Update LP displays
        this._updateLPDisplay('player', this.player);
        this._updateLPDisplay('enemy', this.enemy);

        // Update card hand
        if (this.isPlayerTurn && this.currentPhase === 'main') {
            CardHand.render(this.player.hand, this.player, true);
        } else if (this.isPlayerTurn) {
            CardHand.render(this.player.hand, this.player, false);
        }

        // Update deck count display (element may have been removed from DOM)
        const deckEl = document.getElementById('deck-count');
        if (deckEl) deckEl.textContent = this.player.deck.length;

        // Update graveyard count
        const gyEl = document.getElementById('graveyard-count');
        if (gyEl) gyEl.textContent = this.player.graveyard.length;

        // Update phase display
        const phaseEl = document.getElementById('phase-display');
        if (phaseEl) {
            const phaseNames = { draw: '📥 Draw Phase', main: '🃏 Main Phase', battle: '⚔️ Battle Phase', end: '⏳ End Phase' };
            phaseEl.textContent = phaseNames[this.currentPhase] || '';
        }

        // Update turn display
        const turnEl = document.getElementById('turn-display');
        if (turnEl) {
            turnEl.textContent = `Turn ${this.turnNumber} — ${this.isPlayerTurn ? 'Your Turn' : 'Enemy Turn'}`;
        }

        // End turn button (removed from DOM — no-op)
        const endTurnBtn = document.getElementById('btn-end-turn');
        if (endTurnBtn) {
            endTurnBtn.style.display = (this.isPlayerTurn && this.currentPhase === 'main') ? 'block' : 'none';
        }

        // Callback
        if (this.onTurnChange) this.onTurnChange();
        if (this.onFieldUpdate) this.onFieldUpdate();
    },

    _updateLPDisplay(side, combatant) {
        // LP is now rendered entirely on the canvas — this method is kept for compatibility
        // but does nothing since the DOM elements were removed
    },

    // ===== END BATTLE =====
    _endBattle(result) {
        this.isRunning = false;
        this.currentPhase = 'idle';

        if (this._mainPhaseTimer) {
            clearTimeout(this._mainPhaseTimer);
            this._mainPhaseTimer = null;
        }
        if (this._autoAdvanceTimer) {
            clearTimeout(this._autoAdvanceTimer);
            this._autoAdvanceTimer = null;
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

    // ===== EXP SYSTEM =====
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
                if (this.currentPhase === 'main' && this.isRunning) this._startBattlePhase();
            }, 20000);
        }
    },

    togglePause() {
        if (this.isPaused) this.resume(); else this.pause();
    },

    endTurn() {
        if (this.isPlayerTurn && this.currentPhase === 'main' && this.isRunning) {
            this._startBattlePhase();
        }
    },

    /**
     * Schedule auto-advance to battle phase after playing a card.
     * Gives player ~1000ms to play another card, then auto-starts combat.
     */
    _scheduleAutoAdvance() {
        if (this._autoAdvanceTimer) clearTimeout(this._autoAdvanceTimer);
        this._autoAdvanceTimer = setTimeout(() => {
            this._autoAdvanceTimer = null;
            if (this.isPlayerTurn && this.currentPhase === 'main' && this.isRunning) {
                this.addLog('⚔️ Auto-advancing to Battle Phase', 'info');
                this._startBattlePhase();
            }
        }, 1000);
    },

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentPhase = 'idle';
        if (this._mainPhaseTimer) clearTimeout(this._mainPhaseTimer);
        if (this._autoAdvanceTimer) { clearTimeout(this._autoAdvanceTimer); this._autoAdvanceTimer = null; }
        CardHand.clear();
    },

    /**
     * Player selects an attacker during battle phase
     */
    selectAttacker(zoneIndex) {
        if (!this.isPlayerTurn || this.currentPhase !== 'battle') return false;
        const hero = this.player.heroZones[zoneIndex];
        if (!hero || hero.hasAttacked || !hero.canAttack || hero.position !== 'attack') return false;
        this._selectedAttacker = { hero, zoneIndex };
        return true;
    },

    /**
     * Player selects a target during battle phase
     */
    selectTarget(zoneIndex) {
        if (!this._selectedAttacker) return false;
        const target = this.enemy.heroZones[zoneIndex];
        this._selectedTarget = target ? { hero: target, zoneIndex } : null;
        return true;
    },

    /**
     * Toggle hero position (attack ↔ defense)
     */
    togglePosition(zoneIndex) {
        if (!this.isPlayerTurn || this.currentPhase !== 'main') return false;
        const hero = this.player.heroZones[zoneIndex];
        if (!hero) return false;
        hero.position = hero.position === 'attack' ? 'defense' : 'attack';
        this.addLog(`🔄 ${hero.name} switched to ${hero.position} position`, 'info');
        this._renderBattle();
        return true;
    },

    /**
     * Get field state for renderer
     */
    getFieldState() {
        return {
            player: this.player,
            enemy: this.enemy,
            turn: this.turnNumber,
            phase: this.currentPhase,
            isPlayerTurn: this.isPlayerTurn,
        };
    },

    getNextTurnOrder(count = 5) {
        const units = [];
        const p = { name: this.player?.name || 'Player', isAlly: true, alive: (this.player?.lp || 0) > 0 };
        const e = { name: this.enemy?.name || 'Enemy', isAlly: false, alive: (this.enemy?.lp || 0) > 0 };
        for (let i = 0; i < count; i++) {
            units.push(i % 2 === 0 ? p : e);
        }
        return units;
    },

    // ===== LEGACY COMPAT =====
    get allyTeam() {
        if (!this.player) return [];
        const team = [];
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            if (this.player.heroZones[i]) team.push(this.player.heroZones[i]);
        }
        return team;
    },
    get enemyTeam() {
        if (!this.enemy) return [];
        const team = [];
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            if (this.enemy.heroZones[i]) team.push(this.enemy.heroZones[i]);
        }
        return team;
    },

    // ===== FORMATION HELPERS =====
    getActiveFormation() {
        try {
            const saved = localStorage.getItem('pixel_raid_formation');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    },

    getActiveSynergies() {
        const formation = this.getActiveFormation();
        if (!formation.length) return [];
        const typeCount = {};
        formation.forEach(f => {
            if (f && f.type) {
                typeCount[f.type] = (typeCount[f.type] || 0) + 1;
            }
        });
        const synergies = [];
        for (const [type, count] of Object.entries(typeCount)) {
            if (SYNERGIES[type]) {
                for (const [threshold, bonus] of Object.entries(SYNERGIES[type])) {
                    if (count >= parseInt(threshold)) {
                        synergies.push({ type, ...bonus });
                    }
                }
            }
        }
        return synergies;
    },

    applyFormationBonuses(heroes) {
        const synergies = this.getActiveSynergies();
        if (!synergies.length) return heroes;
        return heroes.map(hero => {
            const h = { ...hero, stats: { ...hero.stats } };
            for (const syn of synergies) {
                if (syn.stat && h.stats[syn.stat] !== undefined) {
                    h.stats[syn.stat] = Math.floor(h.stats[syn.stat] * (1 + syn.bonus));
                }
            }
            return h;
        });
    },
};
