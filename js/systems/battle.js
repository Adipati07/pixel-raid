/* ========================================
 * PIXEL RAID — Tactical Auto Battler Engine (Sprint 2)
 * Board-based: 5 slots per side, energy system, auto battle
 * Flow: Draw → Energy → Play → Arrange → Battle → Result
 * ======================================== */

const BattleEngine = {
    // ===== STATE =====
    isRunning: false,
    currentPhase: 'idle',   // idle, draw, energy, play, arrange, battle, result
    turnNumber: 0,
    onComplete: null,
    onPhaseChange: null,
    onFieldUpdate: null,
    onAttack: null,
    onDraw: null,
    log: [],

    // Board config
    BOARD_SIZE: 5,           // 5 slots per side (0=front, 4=back)
    MAX_HAND: 7,
    STARTING_HAND: 4,
    STARTING_ENERGY: 3,
    MAX_ENERGY: 10,
    ENERGY_PER_TURN: 1,
    DRAWS_PER_TURN: 1,
    HERO_HP: 20,

    // Combatants
    player: null,   // { name, heroHp, heroMaxHp, energy, maxEnergy, board[5], hand[], deck[], isPlayer }
    enemy: null,

    // Timers
    _phaseTimer: null,
    _battleStepTimer: null,

    // ===== START BATTLE =====
    startBattle(playerDeck, enemyDeck, options = {}) {
        this.isRunning = true;
        this.currentPhase = 'idle';
        this.turnNumber = 0;
        this.log = [];

        // Init player
        this.player = {
            name: options.playerName || 'You',
            heroHp: this.HERO_HP,
            heroMaxHp: this.HERO_HP,
            energy: this.STARTING_ENERGY,
            maxEnergy: this.STARTING_ENERGY,
            board: new Array(this.BOARD_SIZE).fill(null),
            hand: [],
            deck: [...playerDeck],
            isPlayer: true,
        };

        // Init enemy
        this.enemy = {
            name: options.enemyName || 'Enemy',
            heroHp: this.HERO_HP,
            heroMaxHp: this.HERO_HP,
            energy: this.STARTING_ENERGY,
            maxEnergy: this.STARTING_ENERGY,
            board: new Array(this.BOARD_SIZE).fill(null),
            hand: [],
            deck: [...enemyDeck],
            isPlayer: false,
        };

        // Shuffle decks
        this._shuffle(this.player.deck);
        this._shuffle(this.enemy.deck);

        // Draw starting hands
        for (let i = 0; i < this.STARTING_HAND; i++) {
            this._drawCard(this.player);
            this._drawCard(this.enemy);
        }

        this._log('⚔️ Battle Start!');
        this._startTurn();
    },

    // ===== TURN FLOW =====
    _startTurn() {
        this.turnNumber++;

        // Increase max energy (cap at MAX_ENERGY)
        if (this.turnNumber > 1) {
            this.player.maxEnergy = Math.min(this.MAX_ENERGY, this.player.maxEnergy + this.ENERGY_PER_TURN);
            this.enemy.maxEnergy = Math.min(this.MAX_ENERGY, this.enemy.maxEnergy + this.ENERGY_PER_TURN);
        }

        // Draw cards
        for (let i = 0; i < this.DRAWS_PER_TURN; i++) {
            this._drawCard(this.player);
            this._drawCard(this.enemy);
        }

        this._log(`\n— Turn ${this.turnNumber} —`);
        this._setPhase('draw');

        // Auto advance to energy phase after brief delay
        this._phaseTimer = setTimeout(() => {
            this._enterEnergyPhase();
        }, 600);
    },

    // ===== ENERGY PHASE =====
    _enterEnergyPhase() {
        // Refill energy
        const gained = this.player.maxEnergy - this.player.energy;
        this.player.energy = this.player.maxEnergy;
        this.enemy.energy = this.enemy.maxEnergy;

        this._log(`⚡ +${gained} Energy (${this.player.energy}/${this.player.maxEnergy})`);
        this._setPhase('energy');

        // Auto advance to play phase after brief delay
        this._phaseTimer = setTimeout(() => {
            this._setPhase('play');
            this._notifyFieldUpdate();
        }, 400);
    },

    // ===== PLAY PHASE — Player plays cards =====
    playCard(handIndex, slotIndex) {
        if (this.currentPhase !== 'play') return false;
        if (handIndex < 0 || handIndex >= this.player.hand.length) return false;
        if (slotIndex < 0 || slotIndex >= this.BOARD_SIZE) return false;
        if (this.player.board[slotIndex] !== null) return false;

        const card = this.player.hand[handIndex];
        if (card.cost > this.player.energy) return false;

        // Pay cost
        this.player.energy -= card.cost;

        // Place unit on board
        const unit = {
            id: card.id,
            name: card.name,
            atk: card.atk,
            hp: card.hp,
            maxHp: card.maxHp,
            cost: card.cost,
            type: card.type,
            pixelColor: card.pixelColor,
            emoji: card.emoji,
            slot: slotIndex,
        };
        this.player.board[slotIndex] = unit;

        // Remove from hand
        this.player.hand.splice(handIndex, 1);

        this._log(`🃏 ${this.player.name} played ${card.name} (⚔${card.atk} ❤${card.hp}) → Slot ${slotIndex + 1}`);
        this._notifyFieldUpdate();
        return true;
    },

    // ===== ADVANCE PHASE =====
    advancePhase() {
        if (this.currentPhase === 'play') {
            this._setPhase('arrange');
            this._log('📐 Arrange your units!');
            this._notifyFieldUpdate();
        } else if (this.currentPhase === 'arrange') {
            this._enterBattlePhase();
        }
    },

    // ===== ARRANGE PHASE — Rearrange units on board =====
    rearrangeUnit(fromSlot, toSlot) {
        if (this.currentPhase !== 'arrange') return false;
        if (fromSlot < 0 || fromSlot >= this.BOARD_SIZE) return false;
        if (toSlot < 0 || toSlot >= this.BOARD_SIZE) return false;
        if (fromSlot === toSlot) return false;

        const unit = this.player.board[fromSlot];
        const target = this.player.board[toSlot];

        // Swap units
        this.player.board[fromSlot] = target;
        this.player.board[toSlot] = unit;

        // Update slot references
        if (this.player.board[fromSlot]) this.player.board[fromSlot].slot = fromSlot;
        if (this.player.board[toSlot]) this.player.board[toSlot].slot = toSlot;

        this._log(`📐 Moved unit from Slot ${fromSlot + 1} → Slot ${toSlot + 1}`);
        this._notifyFieldUpdate();
        return true;
    },

    // ===== BATTLE PHASE =====
    _enterBattlePhase() {
        // Enemy AI: play cards greedily
        this._enemyPlayCards();

        this._setPhase('battle');
        this._log('⚔️ Auto Battle Phase!');
        this._runAutoBattle();
    },

    // ===== AUTO BATTLE — Units attack in order =====
    _runAutoBattle() {
        // Collect all attacks: front-to-back for each side
        const attacks = [];

        // Player units attack (front to back: slot 0→4)
        for (let i = 0; i < this.BOARD_SIZE; i++) {
            const unit = this.player.board[i];
            if (unit && unit.hp > 0) {
                attacks.push({ attacker: unit, side: 'player', slot: i });
            }
        }

        // Enemy units attack (front to back)
        for (let i = 0; i < this.BOARD_SIZE; i++) {
            const unit = this.enemy.board[i];
            if (unit && unit.hp > 0) {
                attacks.push({ attacker: unit, side: 'enemy', slot: i });
            }
        }

        // Execute attacks one by one with delay
        this._executeAttackSequence(attacks, 0);
    },

    _executeAttackSequence(attacks, index) {
        if (index >= attacks.length) {
            // All attacks done → check win/lose → result phase
            this._battleStepTimer = setTimeout(() => {
                this._cleanupDead();
                this._notifyFieldUpdate();

                const result = this._checkWinLose();
                if (result) {
                    // Win or lose → show result
                    this._setPhase('result');
                    this._log(result === 'player' ? '🎉 Victory!' : '💀 Defeat!');
                    if (this.onComplete) this.onComplete(result);
                    return;
                }

                // No winner yet → next turn
                this._startTurn();
            }, 400);
            return;
        }

        const { attacker, side, slot } = attacks[index];
        if (attacker.hp <= 0) { this._executeAttackSequence(attacks, index + 1); return; }
        const myBoard = side === 'player' ? this.player.board : this.enemy.board;
        const enemyBoard = side === 'player' ? this.enemy.board : this.player.board;
        const enemyCombatant = side === 'player' ? this.enemy : this.player;

        // Target: opposing slot first, then hero
        let target = null;
        let targetSlot = slot;
        let targetIsHero = false;

        if (enemyBoard[slot] && enemyBoard[slot].hp > 0) {
            target = enemyBoard[slot];
        } else {
            // No unit in opposing slot → attack hero
            targetIsHero = true;
            target = null; // will damage hero directly
        }

        if (targetIsHero) {
            // Attack hero directly
            const dmg = attacker.atk;
            enemyCombatant.heroHp = Math.max(0, enemyCombatant.heroHp - dmg);
            this._log(`💥 ${attacker.name} attacks ${enemyCombatant.name}'s Hero for ${dmg} dmg! (HP: ${enemyCombatant.heroHp}/${enemyCombatant.heroMaxHp})`);

            if (this.onAttack) {
                this.onAttack({
                    attacker: { ...attacker, side, slot },
                    target: null,
                    targetIsHero: true,
                    targetSlot: null,
                    targetSide: side === 'player' ? 'enemy' : 'player',
                    damage: dmg,
                });
            }
        } else {
            // Attack opposing unit
            const dmg = attacker.atk;
            target.hp -= dmg;
            this._log(`💥 ${attacker.name} attacks ${target.name} for ${dmg} dmg! (HP: ${Math.max(0, target.hp)}/${target.maxHp})`);

            if (this.onAttack) {
                this.onAttack({
                    attacker: { ...attacker, side, slot },
                    target: { ...target },
                    targetIsHero: false,
                    targetSlot: slot,
                    targetSide: side === 'player' ? 'enemy' : 'player',
                    damage: dmg,
                });
            }
        }

        this._notifyFieldUpdate();

        // Next attack after delay
        this._battleStepTimer = setTimeout(() => {
            this._executeAttackSequence(attacks, index + 1);
        }, 500);
    },

    // ===== CLEANUP =====
    _cleanupDead() {
        for (let i = 0; i < this.BOARD_SIZE; i++) {
            if (this.player.board[i] && this.player.board[i].hp <= 0) {
                this._log(`💀 ${this.player.board[i].name} destroyed!`);
                this.player.board[i] = null;
            }
            if (this.enemy.board[i] && this.enemy.board[i].hp <= 0) {
                this._log(`💀 ${this.enemy.board[i].name} destroyed!`);
                this.enemy.board[i] = null;
            }
        }
    },

    _checkWinLose() {
        if (this.enemy.heroHp <= 0) return 'player';
        if (this.player.heroHp <= 0) return 'enemy';
        // Stalemate — all resources exhausted, whoever has more HP wins
        if (this.player.deck.length === 0 && this.player.hand.length === 0 && this.player.board.every(u => !u) &&
            this.enemy.deck.length === 0 && this.enemy.hand.length === 0 && this.enemy.board.every(u => !u)) {
            return this.player.heroHp >= this.enemy.heroHp ? 'player' : 'enemy';
        }
        return null;
    },

    // ===== ENEMY AI — Greedy play =====
    _enemyPlayCards() {
        // Sort hand by cost descending, play what we can afford
        const sorted = this.enemy.hand
            .map((c, i) => ({ card: c, index: i }))
            .sort((a, b) => b.card.cost - a.card.cost);

        let played = [];
        for (const { card, index } of sorted) {
            if (card.cost > this.enemy.energy) continue;

            // Find first empty slot (prefer front slots)
            let emptySlot = -1;
            for (let s = 0; s < this.BOARD_SIZE; s++) {
                if (this.enemy.board[s] === null) { emptySlot = s; break; }
            }
            if (emptySlot === -1) break;

            // Play card
            this.enemy.energy -= card.cost;
            this.enemy.board[emptySlot] = {
                id: card.id,
                name: card.name,
                atk: card.atk,
                hp: card.hp,
                maxHp: card.maxHp,
                cost: card.cost,
                type: card.type,
                pixelColor: card.pixelColor,
                emoji: card.emoji,
                slot: emptySlot,
            };
            played.push({ card, slot: emptySlot, handIdx: index });
        }

        // Remove played cards from hand (reverse order to preserve indices)
        played.sort((a, b) => b.handIdx - a.handIdx);
        for (const { handIdx } of played) {
            this.enemy.hand.splice(handIdx, 1);
        }

        if (played.length > 0) {
            const names = played.map(p => `${p.card.name}→Slot${p.slot + 1}`).join(', ');
            this._log(`🤖 Enemy plays: ${names}`);
        }
    },

    // ===== HELPERS =====
    _drawCard(combatant) {
        if (combatant.deck.length === 0) return null;
        if (combatant.hand.length >= this.MAX_HAND) return null;
        const card = combatant.deck.pop();
        combatant.hand.push(card);
        if (combatant.isPlayer && this.onDraw) {
            this.onDraw(card);
        }
        return card;
    },

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    },

    _setPhase(phase) {
        this.currentPhase = phase;
        if (this.onPhaseChange) this.onPhaseChange(phase);
    },

    _notifyFieldUpdate() {
        if (this.onFieldUpdate) this.onFieldUpdate();
    },

    _log(msg) {
        this.log.push(msg);
        // Keep last 50
        if (this.log.length > 50) this.log.shift();
    },

    // ===== GETTERS =====
    getFieldState() {
        return {
            player: this.player,
            enemy: this.enemy,
            turn: this.turnNumber,
            phase: this.currentPhase,
        };
    },

    getBoardState(side) {
        const combatant = side === 'player' ? this.player : this.enemy;
        return combatant.board;
    },

    // ===== STOP =====
    stop() {
        this.isRunning = false;
        this.currentPhase = 'idle';
        if (this._phaseTimer) clearTimeout(this._phaseTimer);
        if (this._battleStepTimer) clearTimeout(this._battleStepTimer);
        this.player = null;
        this.enemy = null;
    },
};
