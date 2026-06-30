/* ========================================
 * PIXEL RAID — Yu-Gi-Oh Style Battle Engine (v4)
 * Hero-as-Entity Edition
 * Hero sits beside battlefield as a separate entity
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

    // LP (Life Points) — kept for compatibility, hero HP is primary
    MAX_LP: 4000,

    // Field zones per player
    HERO_ZONE_COUNT: 3,
    SKILL_ZONE_COUNT: 2,
    MAX_HAND: 4,
    STARTING_HAND: 4,       // 4 skill cards (hero is separate entity, not a card)

    // Cards per turn limit
    MAX_CARDS_PER_TURN: 1,  // Only 1 card can be played per round

    // Combatants
    player: null,   // { name, battleHero, lp, heroZones[3], skillZones[2], hand[], graveyard[], deck[], isPlayer }
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
    _cardsPlayedThisTurn: 0,
    _playerHasSummoned: false,
    _playerHasUsedSkill: false,

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
        this._cardsPlayedThisTurn = 0;
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

        // Initialize player combatant — hero is a separate entity
        this.player = this._initCombatant(playerHeroCard, playerCardIds, true);
        this.enemy = this._initCombatant(enemyHeroCard, enemyCardIds, false);

        // Determine first turn (SPD comparison)
        const playerSpd = this.player.battleHero ? this.player.battleHero.heroSPD : 10;
        const enemySpd = this.enemy.battleHero ? this.enemy.battleHero.heroSPD : 10;
        this.isPlayerTurn = (playerSpd >= enemySpd);

        this.addLog('⚔️ Duel Start!', 'info');
        if (this.player.battleHero && this.enemy.battleHero) {
            this.addLog(`Your Hero: ${this.player.battleHero.name} (HP: ${this.player.battleHero.heroHP})`, 'info');
            this.addLog(`Enemy Hero: ${this.enemy.battleHero.name} (HP: ${this.enemy.battleHero.heroHP})`, 'info');
        }

        // Show opening overlay
        this._showOverlay(`⚔️ ${this.isPlayerTurn ? 'You go' : 'Enemy goes'} first!`, 'wave');

        // Draw starting hands (4 skill cards — hero is NOT a card in deck)
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

    // ===== INIT COMBATANT — Hero is separate entity =====
    _initCombatant(heroCard, cardIds, isPlayer) {
        // Build deck with ONLY skill cards (hero is NOT in the deck)
        const deck = [];

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

        // Pad deck with random skill cards if too small
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

        // Create battle hero entity (SEPARATE from deck — sits beside battlefield)
        let battleHero = null;
        if (heroCard) {
            const scale = 40; // Scale factor to match LP scale
            const baseHp = heroCard.stats.hp || heroCard.stats.maxHp || 100;
            battleHero = {
                name: heroCard.name,
                class: heroCard.class || heroCard.cls,
                rarity: heroCard.rarity || 'common',
                templateId: heroCard.templateId || heroCard.name,
                image: heroCard.image,
                heroHP: Math.floor(baseHp * scale),
                heroMaxHP: Math.floor(baseHp * scale),
                heroATK: Math.floor((heroCard.stats.atk || 10) * scale),
                heroDEF: Math.floor((heroCard.stats.def || 10) * scale),
                heroSPD: heroCard.stats.spd || 10,
                atkBuff: 0,
                defBuff: 0,
                level: heroCard.level || 1,
                skill: heroCard.skill || null,
            };
        }

        return {
            name: isPlayer ? 'Player' : (heroCard ? heroCard.name : 'Enemy'),
            hero: heroCard,
            battleHero: battleHero,   // Separate hero entity (NOT in deck/hand/zones)
            lp: this.MAX_LP,
            heroZones: [null, null, null],      // 3 hero zone slots (kept for skill zone compat)
            skillZones: [null, null],            // 2 skill zone slots
            hand: [],
            graveyard: [],
            deck: deck,                          // Only skill cards
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
        this._cardsPlayedThisTurn = 0;  // Reset card play counter each turn
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

        this._renderBattle();

        // === MAIN PHASE ===
        setTimeout(() => {
            if (!this.isRunning) return;
            this.currentPhase = 'main';
            this._onPhaseChange('main');

            if (this.isPlayerTurn) {
                this._enablePlayerCards();
                // Safety timeout: auto-advance to battle phase after 60s
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
        const canPlayMore = this._cardsPlayedThisTurn < this.MAX_CARDS_PER_TURN;

        CardHand.render(this.player.hand, this.player, true, {
            hasEmptyHeroZone: false,
            hasSummoned: false,
            hasUsedSkill: !canPlayMore,
            canPlayCard: canPlayMore,
        });
        CardHand.onCardPlay = (index, card) => {
            this.playCard(index);
        };
    },

    /**
     * Public API: Player plays a card from hand by index
     * Limited to 1 card per round
     */
    playCard(handIndex) {
        if (!this.isPlayerTurn || this.currentPhase !== 'main') return false;
        const card = this.player.hand[handIndex];
        if (!card) return false;

        // Check 1-card-per-turn limit
        if (this._cardsPlayedThisTurn >= this.MAX_CARDS_PER_TURN) {
            this.addLog('❌ Already played a card this turn!', 'info');
            CardHand.shakeCard(handIndex);
            return false;
        }

        if (card.cardType === 'skill') {
            this._cardsPlayedThisTurn++;
            // Animate card out, then activate
            CardHand.animateCardPlay(handIndex, () => {
                this._activateSkill(this.player, handIndex, this.enemy);
                this._playerHasUsedSkill = true;
                // Auto-advance to battle phase after playing card
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
     * Play a card from hand to field (legacy compat — now only skill cards)
     */
    _playCard(combatant, handIndex, card, target) {
        // Remove from hand
        combatant.hand.splice(handIndex, 1);

        if (card.cardType === 'skill') {
            // Activate skill immediately
            this._activateSkillCard(combatant, target, card);
            combatant.graveyard.push(card);
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
     * Activate a skill card's effect — targets hero HP now
     */
    _activateSkillCard(caster, target, card) {
        const eff = card.effect;
        this.addLog(`✨ ${caster.name} activates ${card.name}`, 'skill');

        switch (eff.type) {
            case 'damage': {
                let dmg = eff.value;
                // Check for class bonus
                if (eff.bonus && caster.battleHero) {
                    if (caster.battleHero.class === eff.bonus.type) {
                        dmg = Math.floor(dmg * (eff.bonus.mult || 1.5));
                        this.addLog(`  🔥 Class bonus! Damage boosted!`, 'skill');
                    }
                }
                // Scale damage for hero HP system
                const scaledDmg = dmg * 10;
                const enemyCombatant = caster.isPlayer ? this.enemy : this.player;
                const enemyHero = enemyCombatant.battleHero;
                if (enemyHero) {
                    enemyHero.heroHP = Math.max(0, enemyHero.heroHP - scaledDmg);
                    this.addLog(`  💥 ${enemyHero.name} takes ${scaledDmg} damage! (HP: ${enemyHero.heroHP}/${enemyHero.heroMaxHP})`, 'dmg');
                    this._showDamageNum(enemyCombatant, `-${scaledDmg}`, '#ff4444');
                }
                this._triggerAnimation('hit');
                break;
            }

            case 'shield': {
                const ownHero = caster.battleHero;
                if (ownHero) {
                    const shieldVal = eff.value * 10;
                    ownHero.defBuff += shieldVal;
                    this.addLog(`  🛡️ ${ownHero.name} gains +${shieldVal} DEF!`, 'skill');
                    this._showDamageNum(caster, `+${shieldVal}🛡`, '#4488ff');
                }
                this._triggerAnimation('heal');
                break;
            }

            case 'heal': {
                const ownHero = caster.battleHero;
                if (ownHero) {
                    const healVal = eff.value * 10;
                    const actualHeal = Math.min(healVal, ownHero.heroMaxHP - ownHero.heroHP);
                    ownHero.heroHP += actualHeal;
                    this.addLog(`  💚 ${ownHero.name} heals ${actualHeal} HP! (HP: ${ownHero.heroHP}/${ownHero.heroMaxHP})`, 'heal');
                    this._showDamageNum(caster, `+${actualHeal}`, '#44ff88');
                }
                this._triggerAnimation('heal');
                break;
            }

            case 'lifesteal': {
                const enemyCombatant = caster.isPlayer ? this.enemy : this.player;
                const enemyHero = enemyCombatant.battleHero;
                const ownHero = caster.battleHero;
                const dmg = eff.value * 10;
                if (enemyHero) {
                    enemyHero.heroHP = Math.max(0, enemyHero.heroHP - dmg);
                    this.addLog(`  🧛 Drains ${dmg} from ${enemyHero.name}!`, 'skill');
                    this._showDamageNum(enemyCombatant, `-${dmg}`, '#ff4444');
                }
                if (ownHero) {
                    const healed = Math.min(Math.floor(dmg * 0.5), ownHero.heroMaxHP - ownHero.heroHP);
                    ownHero.heroHP += healed;
                    this.addLog(`  💚 Heals ${healed} HP! (HP: ${ownHero.heroHP}/${ownHero.heroMaxHP})`, 'heal');
                    this._showDamageNum(caster, `+${healed}`, '#44ff88');
                }
                this._triggerAnimation('hit');
                break;
            }

            case 'buff': {
                const ownHero = caster.battleHero;
                if (ownHero) {
                    if (eff.stat === 'atk') {
                        const buffVal = Math.floor(ownHero.heroATK * eff.value);
                        ownHero.atkBuff += buffVal;
                        this.addLog(`  ✨ ${ownHero.name}: ATK +${buffVal}`, 'buff');
                    } else if (eff.stat === 'def') {
                        const buffVal = Math.floor(ownHero.heroDEF * eff.value);
                        ownHero.defBuff += buffVal;
                        this.addLog(`  ✨ ${ownHero.name}: DEF +${buffVal}`, 'buff');
                    } else if (eff.stat === 'spd') {
                        // SPD buff — no direct effect in hero-vs-hero but log it
                        this.addLog(`  ✨ ${ownHero.name}: SPD boosted!`, 'buff');
                    } else if (eff.stat === 'crit') {
                        // Crit buff — boost ATK as proxy
                        ownHero.atkBuff += eff.value;
                        this.addLog(`  ✨ ${ownHero.name}: CRIT boosted!`, 'buff');
                    }
                }
                this._triggerAnimation('skill');
                break;
            }

            case 'debuff': {
                const enemyCombatant = caster.isPlayer ? this.enemy : this.player;
                const enemyHero = enemyCombatant.battleHero;
                if (enemyHero) {
                    if (eff.stat === 'atk' || eff.stat === 'all') {
                        const debuffVal = Math.floor(enemyHero.heroATK * eff.value);
                        enemyHero.atkBuff -= debuffVal;
                        this.addLog(`  💀 ${enemyHero.name}: ATK -${debuffVal}`, 'debuff');
                    }
                    if (eff.stat === 'def' || eff.stat === 'all') {
                        const debuffVal = Math.floor(enemyHero.heroDEF * eff.value);
                        enemyHero.defBuff -= debuffVal;
                        this.addLog(`  💀 ${enemyHero.name}: DEF -${debuffVal}`, 'debuff');
                    }
                    if (eff.stat === 'spd') {
                        this.addLog(`  💀 ${enemyHero.name}: SPD reduced!`, 'debuff');
                    }
                }
                this._triggerAnimation('skill');
                break;
            }

            case 'mana_gain': {
                // Draw extra cards
                const count = eff.value || 1;
                for (let i = 0; i < count; i++) {
                    const drawn = this._drawOneCard(caster);
                    if (drawn) {
                        this.addLog(`  📥 ${caster.name} draws an extra card!`, 'skill');
                    }
                }
                break;
            }
        }

        // Check win conditions after skill activation
        this._checkWinConditions();
    },

    /**
     * Get strongest hero on field (highest ATK) — uses battleHero
     */
    _getStrongestHero(combatant) {
        // Return the battle hero entity (always present during battle)
        if (combatant.battleHero) return combatant.battleHero;
        // Fallback: check hero zones
        let strongest = null;
        let maxAtk = -1;
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            const hero = combatant.heroZones[i];
            if (hero) {
                const totalAtk = (hero.stats ? hero.stats.atk : 0) + (hero.atkBuff || 0);
                if (totalAtk > maxAtk) {
                    maxAtk = totalAtk;
                    strongest = hero;
                }
            }
        }
        return strongest;
    },

    /**
     * Get weakest hero on field (lowest current HP) — uses battleHero
     */
    _getWeakestHero(combatant) {
        // With hero-as-entity, there's only one hero — the battleHero
        return combatant.battleHero || null;
    },

    /**
     * Get a random enemy hero on field
     */
    _getRandomEnemyHero(combatant) {
        if (combatant.battleHero) return { hero: combatant.battleHero, index: 0 };
        const heroes = [];
        for (let i = 0; i < this.HERO_ZONE_COUNT; i++) {
            if (combatant.heroZones[i]) heroes.push({ hero: combatant.heroZones[i], index: i });
        }
        if (heroes.length === 0) return null;
        return heroes[Math.floor(Math.random() * heroes.length)];
    },

    /**
     * Destroy a hero (send to graveyard) — legacy compat
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

    // ===== BATTLE PHASE — Hero vs Hero Auto-Combat =====
    _startBattlePhase() {
        if (!this.isRunning || this.currentPhase !== 'main') return;

        if (this._mainPhaseTimer) {
            clearTimeout(this._mainPhaseTimer);
            this._mainPhaseTimer = null;
        }
        if (this._autoAdvanceTimer) {
            clearTimeout(this._autoAdvanceTimer);
            this._autoAdvanceTimer = null;
        }

        CardHand.enabled = false;
        this.currentPhase = 'battle';
        this._onPhaseChange('battle');

        const attacker = this.isPlayerTurn ? this.player : this.enemy;
        const defender = this.isPlayerTurn ? this.enemy : this.player;

        if (!attacker.battleHero || !defender.battleHero) {
            this.addLog('⚔️ No hero to attack!', 'info');
            setTimeout(() => {
                if (this.isRunning) this._startEndPhase();
            }, 500);
            return;
        }

        // Hero auto-attacks enemy hero
        const hero = attacker.battleHero;
        const target = defender.battleHero;

        const totalAtk = hero.heroATK + hero.atkBuff;
        const totalDef = target.heroDEF + target.defBuff;
        const damage = Math.max(1, totalAtk - Math.floor(totalDef * 0.5));
        const isCrit = Math.random() < 0.15; // 15% crit chance
        const finalDamage = isCrit ? Math.floor(damage * 1.5) : damage;

        // Apply damage to enemy hero HP
        target.heroHP = Math.max(0, target.heroHP - finalDamage);

        const critText = isCrit ? ' 💥CRIT!' : '';
        this.addLog(`⚔️ ${hero.name} (${totalAtk} ATK) attacks ${target.name} for ${finalDamage} damage!${critText} (HP: ${target.heroHP}/${target.heroMaxHP})`, 'dmg');

        // Show damage number
        this._showDamageNum(defender, `-${finalDamage}${isCrit ? ' 💥' : ''}`, isCrit ? '#ff4444' : '#ffaa00');
        this._triggerAnimation(isCrit ? 'crit' : 'hit');

        // Animate via Phaser
        if (typeof BattlePhaser !== 'undefined' && BattlePhaser.isActive()) {
            BattlePhaser.triggerShake(isCrit ? 10 : 5, isCrit ? 0.5 : 0.3);
        }
        if (typeof BattleArenaScene !== 'undefined' && BattleArenaScene.isActive()) {
            BattleArenaScene.triggerShake(isCrit ? 10 : 5, isCrit ? 0.5 : 0.3);
        }
        if (typeof BattleAnimations !== 'undefined') {
            BattleAnimations.shakeScreen(isCrit ? 8 : 4, isCrit ? 0.5 : 0.3);
        }

        this._renderBattle();

        // Check if enemy hero is defeated
        if (target.heroHP <= 0) {
            this.addLog(`💀 ${target.name} has been defeated!`, 'death');
            setTimeout(() => {
                if (this.isRunning) this._endBattle(this.isPlayerTurn ? 'win' : 'lose');
            }, 1000);
            return;
        }

        // End battle phase after delay
        setTimeout(() => {
            if (this.isRunning) this._startEndPhase();
        }, 1200);
    },

    /**
     * Legacy attack processing (simplified for hero-as-entity)
     */
    _processNextAttack(attacker, defender) {
        // With hero-as-entity, attack is handled in _startBattlePhase
        // This method is kept for API compatibility
        this._startEndPhase();
    },

    // ===== END PHASE =====
    _startEndPhase() {
        if (!this.isRunning) return;

        this.currentPhase = 'end';
        this._onPhaseChange('end');

        const current = this.isPlayerTurn ? this.player : this.enemy;

        // End-of-turn effects: decay buffs on battleHero
        if (current.battleHero) {
            if (current.battleHero.atkBuff > 0) current.battleHero.atkBuff = Math.floor(current.battleHero.atkBuff * 0.8);
            if (current.battleHero.defBuff > 0) current.battleHero.defBuff = Math.floor(current.battleHero.defBuff * 0.8);
            if (current.battleHero.atkBuff < 0) current.battleHero.atkBuff = Math.floor(current.battleHero.atkBuff * 0.8);
            if (current.battleHero.defBuff < 0) current.battleHero.defBuff = Math.floor(current.battleHero.defBuff * 0.8);
        }

        this._renderBattle();

        // Switch turns
        setTimeout(() => {
            if (!this.isRunning) return;
            this.isPlayerTurn = !this.isPlayerTurn;
            this._startTurn();
        }, 500);
    },

    // ===== WIN CONDITIONS — Check Hero HP =====
    _checkWinConditions() {
        if (!this.isRunning) return false;

        // Hero HP check (primary win condition)
        if (this.player.battleHero && this.player.battleHero.heroHP <= 0) {
            this.addLog(`💀 ${this.player.battleHero.name} HP reached 0!`, 'death');
            this._endBattle('lose');
            return true;
        }
        if (this.enemy.battleHero && this.enemy.battleHero.heroHP <= 0) {
            this.addLog(`🏆 ${this.enemy.battleHero.name} defeated!`, 'win');
            this._endBattle('win');
            return true;
        }

        // LP reaches 0 (fallback)
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

        // Turn limit
        if (this.turnNumber >= 50) {
            const playerHP = this.player.battleHero ? this.player.battleHero.heroHP : this.player.lp;
            const enemyHP = this.enemy.battleHero ? this.enemy.battleHero.heroHP : this.enemy.lp;
            const winner = playerHP >= enemyHP ? 'win' : 'lose';
            this.addLog(`⏰ Time out! ${winner === 'win' ? 'You win' : 'Enemy wins'}!`, 'info');
            this._endBattle(winner);
            return true;
        }

        return false;
    },

    // ===== AI LOGIC — 1 card per turn, skill cards only =====
    _aiPlayCards() {
        const ai = this.enemy;

        // Only 1 card per turn for AI too
        if (this._cardsPlayedThisTurn >= this.MAX_CARDS_PER_TURN) return;

        // Sort hand: prefer damage when player HP is high, heal when AI HP is low
        const playable = ai.hand
            .map((card, i) => ({ card, index: i }))
            .sort((a, b) => {
                const aiHeroHP = ai.battleHero ? ai.battleHero.heroHP / ai.battleHero.heroMaxHP : 1;
                if (aiHeroHP < 0.4) {
                    if (a.card.effect && a.card.effect.type === 'heal') return -1;
                    if (b.card.effect && b.card.effect.type === 'heal') return 1;
                }
                // Prefer damage cards
                if (a.card.effect && a.card.effect.type === 'damage') return -1;
                if (b.card.effect && b.card.effect.type === 'damage') return 1;
                return 0;
            });

        // Play 1 card
        let played = 0;
        for (const { card } of playable) {
            if (played >= 1) break;

            const actualIndex = ai.hand.indexOf(card);
            if (actualIndex === -1) continue;

            if (card.cardType === 'skill') {
                this._activateSkill(ai, actualIndex, this.player);
                played++;
                this._cardsPlayedThisTurn++;
            }
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
            const pos = BattleArenaScene.getHeroZonePosition(
                target._lastHitZone || 0,
                target.isPlayer
            );
            if (color === '#44ff88' || color === '#22cc66') {
                BattleArenaScene.spawnHealNumber(pos.x, pos.y - 20, parseInt(text.replace(/[^0-9]/g, '')) || 0);
            } else {
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
            if (phaseNames[phase]) {
                BattleArenaScene.showPhaseBanner(phaseNames[phase], this.isPlayerTurn);
            }
        } else if (typeof BattleAnimations !== 'undefined' && phaseNames[phase]) {
            BattleAnimations.showPhaseBanner(phaseNames[phase], this.isPlayerTurn);
        }
        if (this.onPhaseChange) this.onPhaseChange(phase, this.isPlayerTurn);
    },

    // ===== RENDERING — Hero HP displayed on canvas =====
    _renderBattle() {
        // BattlePhaser (Phaser.js WebGL) or BattleArenaScene (Canvas) handles field rendering
        if (typeof BattlePhaser !== 'undefined' && BattlePhaser.isActive()) {
            BattlePhaser.renderField(this.player, this.enemy);
        } else if (typeof BattleArenaScene !== 'undefined' && BattleArenaScene.isActive()) {
            // Scene renders itself — just update companion DOM elements
        } else if (typeof BattleRenderer !== 'undefined' && BattleRenderer.renderBattle) {
            try {
                BattleRenderer.renderBattle(this.player, this.enemy);
            } catch (e) {
                console.warn('BattleRenderer error:', e);
            }
        }

        // Update LP displays (now shows hero HP)
        this._updateLPDisplay('player', this.player);
        this._updateLPDisplay('enemy', this.enemy);

        // Update card hand
        if (this.isPlayerTurn && this.currentPhase === 'main') {
            CardHand.render(this.player.hand, this.player, true, { canPlayCard: this._cardsPlayedThisTurn < this.MAX_CARDS_PER_TURN });
        } else if (this.isPlayerTurn) {
            CardHand.render(this.player.hand, this.player, false);
        }

        // Update deck count display
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

        // Update hero HP displays in DOM
        this._updateHeroHPDisplay();

        // End turn button
        const endTurnBtn = document.getElementById('btn-end-turn');
        if (endTurnBtn) {
            endTurnBtn.style.display = (this.isPlayerTurn && this.currentPhase === 'main') ? 'block' : 'none';
        }

        // Callback
        if (this.onTurnChange) this.onTurnChange();
        if (this.onFieldUpdate) this.onFieldUpdate();
    },

    _updateLPDisplay(side, combatant) {
        // LP is now hero HP — rendered on canvas and via _updateHeroHPDisplay
    },

    /**
     * Update hero HP display in DOM (battle hero info strips)
     */
    _updateHeroHPDisplay() {
        // Update player hero HP
        const playerHpEl = document.getElementById('player-hero-hp');
        const playerHpFill = document.getElementById('player-hero-hp-fill');
        const playerNameEl = document.getElementById('player-hero-name');
        if (this.player && this.player.battleHero) {
            const h = this.player.battleHero;
            const pct = Math.max(0, h.heroHP / h.heroMaxHP);
            if (playerHpEl) playerHpEl.textContent = `${h.heroHP} / ${h.heroMaxHP}`;
            if (playerHpFill) {
                playerHpFill.style.width = (pct * 100) + '%';
                playerHpFill.className = 'hp-fill' + (pct < 0.25 ? ' hp-critical' : pct < 0.5 ? ' hp-warning' : '');
            }
            if (playerNameEl) playerNameEl.textContent = h.name + (h.level > 1 ? ` Lv.${h.level}` : '');
        }

        // Update enemy hero HP
        const enemyHpEl = document.getElementById('enemy-hero-hp');
        const enemyHpFill = document.getElementById('enemy-hero-hp-fill');
        const enemyNameEl = document.getElementById('enemy-hero-name');
        if (this.enemy && this.enemy.battleHero) {
            const h = this.enemy.battleHero;
            const pct = Math.max(0, h.heroHP / h.heroMaxHP);
            if (enemyHpEl) enemyHpEl.textContent = `${h.heroHP} / ${h.heroMaxHP}`;
            if (enemyHpFill) {
                enemyHpFill.style.width = (pct * 100) + '%';
                enemyHpFill.className = 'hp-fill' + (pct < 0.25 ? ' hp-critical' : pct < 0.5 ? ' hp-warning' : '');
            }
            if (enemyNameEl) enemyNameEl.textContent = h.name + (h.level > 1 ? ` Lv.${h.level}` : '');
        }
    },

    // ===== END BATTLE — Hero HP loss on defeat =====
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

        // On defeat, reduce player hero HP by 20% of max
        if (result === 'lose' && this.player.battleHero) {
            const hpLoss = Math.floor(this.player.battleHero.heroMaxHP * 0.2);
            this.player.battleHero.heroHP = Math.max(1, this.player.battleHero.heroHP - hpLoss);
            this.addLog(`💔 ${this.player.battleHero.name} loses ${hpLoss} HP from defeat`, 'info');
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

        // Clear card hand between battles
        CardHand.clear();

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
     * Since only 1 card per turn, auto-advance after brief delay.
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
        this._cardsPlayedThisTurn = 0;
        if (this._mainPhaseTimer) clearTimeout(this._mainPhaseTimer);
        if (this._autoAdvanceTimer) { clearTimeout(this._autoAdvanceTimer); this._autoAdvanceTimer = null; }
        CardHand.clear();
    },

    /**
     * Player selects an attacker during battle phase (legacy compat)
     */
    selectAttacker(zoneIndex) {
        if (!this.isPlayerTurn || this.currentPhase !== 'battle') return false;
        const hero = this.player.heroZones[zoneIndex];
        if (!hero || hero.hasAttacked || !hero.canAttack || hero.position !== 'attack') return false;
        this._selectedAttacker = { hero, zoneIndex };
        return true;
    },

    /**
     * Player selects a target during battle phase (legacy compat)
     */
    selectTarget(zoneIndex) {
        if (!this._selectedAttacker) return false;
        const target = this.enemy.heroZones[zoneIndex];
        this._selectedTarget = target ? { hero: target, zoneIndex } : null;
        return true;
    },

    /**
     * Toggle hero position (legacy compat — no-op with hero-as-entity)
     */
    togglePosition(zoneIndex) {
        return false;
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
        const p = { name: this.player?.name || 'Player', isAlly: true, alive: (this.player?.battleHero?.heroHP || 0) > 0 };
        const e = { name: this.enemy?.name || 'Enemy', isAlly: false, alive: (this.enemy?.battleHero?.heroHP || 0) > 0 };
        for (let i = 0; i < count; i++) {
            units.push(i % 2 === 0 ? p : e);
        }
        return units;
    },

    // ===== LEGACY COMPAT =====
    get allyTeam() {
        if (!this.player) return [];
        const team = [];
        if (this.player.battleHero) team.push(this.player.battleHero);
        return team;
    },
    get enemyTeam() {
        if (!this.enemy) return [];
        const team = [];
        if (this.enemy.battleHero) team.push(this.enemy.battleHero);
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
