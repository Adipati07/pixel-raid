/* ========================================
 * PIXEL RAID — Auto-Battle Engine
 * Turn-based card combat system
 * Enhanced with animations, damage numbers, overlays
 * ======================================== */

const BattleEngine = {
    allyTeam: [],
    enemyTeam: [],
    turnOrder: [],
    currentTurn: 0,
    log: [],
    onComplete: null,
    battleTimer: null,
    isRunning: false,

    startBattle(allyCards, enemyCards, onComplete) {
        this.allyTeam = allyCards.map((c, i) => ({
            ...c,
            stats: { ...c.stats },
            buffs: [],
            alive: true,
            shield: 0,
            dodgeBuff: 0,
            dotDmg: 0,
            hotHeal: 0,
            critBuff: 0,
            position: i,
        }));
        this.enemyTeam = enemyCards.map((c, i) => ({
            ...c,
            stats: { ...c.stats },
            buffs: [],
            alive: true,
            shield: 0,
            dodgeBuff: 0,
            dotDmg: 0,
            hotHeal: 0,
            critBuff: 0,
            position: i,
        }));
        this.log = [];
        this.currentTurn = 0;
        this.onComplete = onComplete;
        this.isRunning = true;

        // Apply synergies to BOTH teams
        this.applySynergies(this.allyTeam, GameState.getDeckCards());
        this.applySynergies(this.enemyTeam, enemyCards);

        // Calculate turn order by SPD
        this.buildTurnOrder();

        // Log start
        this.addLog('⚔️ Battle Start!', 'info');
        this.addLog(`Your deck: ${this.allyTeam.map(c => c.name).join(', ')}`, 'info');
        this.addLog(`Enemy: ${this.enemyTeam.map(c => c.name).join(', ')}`, 'info');

        // Show wave announcement
        const waveNum = GameState.player.wave;
        this.showWaveOverlay(waveNum);

        // Start turn loop after wave overlay
        setTimeout(() => this.runNextTurn(), 1200);
    },

    // ===== WAVE OVERLAY =====
    showWaveOverlay(waveNum) {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;
        const overlay = document.createElement('div');
        overlay.className = 'battle-overlay';
        overlay.innerHTML = `<div class="battle-overlay-text battle-overlay-wave">Wave ${waveNum}</div>`;
        wrap.appendChild(overlay);
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 1500);
    },

    // ===== STAGE CLEAR CELEBRATION =====
    showStageClearOverlay() {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;
        const overlay = document.createElement('div');
        overlay.className = 'battle-overlay';
        overlay.innerHTML = `<div class="battle-overlay-text battle-overlay-clear">STAGE CLEAR!</div>`;
        wrap.appendChild(overlay);
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 2000);
        if (typeof Sound !== 'undefined') Sound.victory();
    },

    // ===== DEFEAT OVERLAY =====
    showDefeatOverlay() {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;
        const overlay = document.createElement('div');
        overlay.className = 'battle-overlay';
        overlay.innerHTML = `<div class="battle-overlay-text battle-overlay-defeat">DEFEATED</div>`;
        wrap.appendChild(overlay);
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 2000);
        if (typeof Sound !== 'undefined') Sound.defeat();
    },

    // ===== FLOATING DAMAGE NUMBERS =====
    showDamageNumber(x, y, text, color) {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;
        const num = document.createElement('div');
        num.className = 'battle-damage-num';
        num.style.left = x + 'px';
        num.style.top = y + 'px';
        num.style.color = color;
        num.textContent = text;
        wrap.appendChild(num);
        setTimeout(() => { if (num.parentNode) num.remove(); }, 1200);
    },

    // ===== SKILL NAME POPUP =====
    showSkillNamePopup(unitName, skillName, isAlly) {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;
        const canvas = document.getElementById('battle-canvas');
        if (!canvas) return;
        // Position based on team side
        const canvasRect = canvas.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        const x = isAlly ? 30 : canvasRect.width - 180;
        const y = 20;
        const popup = document.createElement('div');
        popup.className = 'skill-name-popup';
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
        popup.textContent = `✨ ${unitName}: ${skillName}!`;
        wrap.appendChild(popup);
        setTimeout(() => { if (popup.parentNode) popup.remove(); }, 1500);
    },

    // ===== CANVAS ANIMATION TRIGGERS =====
    triggerCanvasAnimation(type) {
        const canvas = document.getElementById('battle-canvas');
        if (!canvas) return;
        // Remove old animation class
        canvas.classList.remove('battle-shake', 'battle-shake-crit', 'battle-flash-red', 'battle-flash-yellow', 'battle-heal-glow');
        // Force reflow
        void canvas.offsetWidth;
        switch(type) {
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

    // ===== HERO DEATH VISUAL =====
    markHeroDead(unit) {
        // The canvas renderer already handles dead units (opacity 0.3)
        // We also trigger a visual shake
        const isAlly = this.allyTeam.includes(unit);
        this.triggerCanvasAnimation('hit');
        // Show death number
        const canvas = document.getElementById('battle-canvas');
        if (canvas) {
            const cx = canvas.width / 2;
            this.showDamageNumber(
                cx + (Math.random() - 0.5) * 100,
                canvas.height / 2 - 40,
                '💀 ' + unit.name,
                '#888888'
            );
        }
    },

    applySynergies(team, deckCards) {
        const classCounts = {};
        for (const card of deckCards) {
            classCounts[card.class] = (classCounts[card.class] || 0) + 1;
        }

        // Class synergies
        for (const [cls, count] of Object.entries(classCounts)) {
            const syn = SYNERGIES[cls];
            if (syn) {
                const tier = count >= 3 ? 3 : count >= 2 ? 2 : 0;
                if (tier && syn[tier]) {
                    this.addLog(`🔗 ${syn[tier].desc}`, 'synergy');
                    for (const card of team) {
                        const s = syn[tier].stat;
                        if (card.stats[s] !== undefined) {
                            card.stats[s] = Math.floor(card.stats[s] * (1 + syn[tier].bonus));
                        }
                    }
                }
            }
        }

        // Cross-class combos
        const classSet = new Set(deckCards.map(c => c.class));
        for (const combo of COMBO_SYNERGIES) {
            if (combo.classes.every(c => classSet.has(c))) {
                this.addLog(`🔗 ${combo.desc}`, 'synergy');
                for (const card of team) {
                    for (const [stat, bonus] of Object.entries(combo.bonus)) {
                        if (card.stats[stat] !== undefined) {
                            card.stats[stat] = Math.floor(card.stats[stat] * (1 + bonus));
                        }
                    }
                }
            }
        }
    },

    buildTurnOrder() {
        const allUnits = [...this.allyTeam, ...this.enemyTeam].filter(u => u.alive);
        this.turnOrder = allUnits.sort((a, b) => b.stats.spd - a.stats.spd);
    },

    runNextTurn() {
        if (!this.isRunning) return;

        // Check win/lose
        const allyAlive = this.allyTeam.filter(c => c.alive);
        const enemyAlive = this.enemyTeam.filter(c => c.alive);

        if (enemyAlive.length === 0) {
            this.isRunning = false;
            this.addLog('🏆 Victory!', 'win');
            if (this.onComplete) this.onComplete('win', this.log, this.currentTurn);
            return;
        }
        if (allyAlive.length === 0) {
            this.isRunning = false;
            this.addLog('💀 Defeat!', 'lose');
            this.showDefeatOverlay();
            if (this.onComplete) this.onComplete('lose', this.log, this.currentTurn);
            return;
        }

        // Get current attacker
        const aliveUnits = [...this.allyTeam, ...this.enemyTeam].filter(u => u.alive);
        const sorted = aliveUnits.sort((a, b) => b.stats.spd - a.stats.spd);
        const attacker = sorted[this.currentTurn % sorted.length];

        if (!attacker || !attacker.alive) {
            this.currentTurn++;
            this.scheduleNextTurn();
            return;
        }

        // Apply HOT heal at start of turn
        if (attacker.hotHeal > 0) {
            attacker.stats.hp = Math.min(attacker.stats.maxHp, attacker.stats.hp + attacker.hotHeal);
            this.addLog(`💚 ${attacker.name} regenerates ${attacker.hotHeal} HP`, 'heal');
            this.triggerCanvasAnimation('heal');
            if (typeof Sound !== 'undefined') Sound.heal();
            // Show heal number
            const isAlly = this.allyTeam.includes(attacker);
            const canvas = document.getElementById('battle-canvas');
            if (canvas) {
                const cx = isAlly ? 100 + attacker.position * 70 : canvas.width - 100 - attacker.position * 70;
                this.showDamageNumber(cx, canvas.height / 2 - 20, `+${attacker.hotHeal}`, '#44cc44');
            }
        }

        // Apply DOT damage
        if (attacker.dotDmg > 0) {
            attacker.stats.hp -= attacker.dotDmg;
            this.addLog(`🟢 ${attacker.name} takes ${attacker.dotDmg} poison damage`, 'dmg');
            if (attacker.stats.hp <= 0) {
                attacker.alive = false;
                attacker.stats.hp = 0;
                this.addLog(`💀 ${attacker.name} died from poison!`, 'death');
                this.markHeroDead(attacker);
                this.currentTurn++;
                this.scheduleNextTurn();
                return;
            }
        }

        // Expire buffs at start of turn
        this.expireBuffs(attacker);

        // Determine target
        const isAlly = this.allyTeam.includes(attacker);
        const targets = isAlly ? this.enemyTeam.filter(c => c.alive) : this.allyTeam.filter(c => c.alive);
        const target = this.selectTarget(attacker, targets);

        if (!target) {
            this.currentTurn++;
            this.scheduleNextTurn();
            return;
        }

        // Execute attack
        this.executeAttack(attacker, target, isAlly);

        this.currentTurn++;

        // Prevent infinite battles (max 100 turns)
        if (this.currentTurn > 100) {
            this.isRunning = false;
            this.addLog('⏰ Time out! Draw!', 'lose');
            if (this.onComplete) this.onComplete('lose', this.log, this.currentTurn);
            return;
        }

        this.scheduleNextTurn();
    },

    scheduleNextTurn() {
        const delay = Math.floor(800 / GameState.battleSpeed);
        this.battleTimer = setTimeout(() => this.runNextTurn(), delay);
    },

    expireBuffs(unit) {
        unit.buffs = unit.buffs.filter(buff => {
            buff.duration--;
            if (buff.duration <= 0) {
                if (buff.type === 'stat') {
                    unit.stats[buff.stat] = Math.floor(unit.stats[buff.stat] / buff.multiplier);
                }
                this.addLog(`⏳ ${unit.name}'s ${buff.name} wore off`, 'info');
                return false;
            }
            return true;
        });
    },

    addBuff(unit, name, stat, multiplier, duration) {
        unit.buffs.push({ name, type: 'stat', stat, multiplier, duration });
        unit.stats[stat] = Math.floor(unit.stats[stat] * multiplier);
    },

    selectTarget(attacker, targets) {
        const frontRow = targets.filter(t => t.position <= 1);
        const midRow = targets.filter(t => t.position >= 2 && t.position <= 3);
        const backRow = targets.filter(t => t.position >= 4);

        const priorityTargets = frontRow.length > 0 ? frontRow :
                                midRow.length > 0 ? midRow : backRow;

        return priorityTargets.reduce((best, t) => t.stats.hp < best.stats.hp ? t : best, priorityTargets[0]);
    },

    executeAttack(attacker, target, isAlly) {
        // Check dodge
        if (target.dodgeBuff > 0 && Math.random() < target.dodgeBuff) {
            this.addLog(`💨 ${target.name} dodged ${attacker.name}'s attack!`, 'info');
            return;
        }

        // Calculate damage
        let dmg = Math.max(1, attacker.stats.atk - Math.floor(target.stats.def * 0.5));

        // Check crit (with buff)
        let isCrit = false;
        const critChance = attacker.stats.crit + attacker.critBuff;
        if (Math.random() * 100 < critChance) {
            dmg = Math.floor(dmg * 1.8);
            isCrit = true;
        }

        // Apply damage
        if (target.shield > 0) {
            const absorbed = Math.min(target.shield, dmg);
            target.shield -= absorbed;
            dmg -= absorbed;
            if (absorbed > 0) this.addLog(`🛡️ ${target.name}'s shield absorbed ${absorbed}`, 'info');
        }

        target.stats.hp = Math.max(0, target.stats.hp - dmg);

        const logClass = isCrit ? 'crit' : 'dmg';
        const critText = isCrit ? ' CRIT!' : '';
        this.addLog(`${isAlly ? '🟢' : '🔴'} ${attacker.name} → ${target.name} for ${dmg} dmg${critText}`, logClass);

        // Trigger canvas animation
        this.triggerCanvasAnimation(isCrit ? 'crit' : 'hit');

        // Show floating damage number on canvas
        const canvas = document.getElementById('battle-canvas');
        if (canvas) {
            const targetIsAlly = this.allyTeam.includes(target);
            const baseX = targetIsAlly ? 100 + target.position * 70 : canvas.width - 100 - target.position * 70;
            const baseY = canvas.height / 2 - 30 + (target.position % 2) * 20;
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 20;
            if (isCrit) {
                this.showDamageNumber(baseX + offsetX, baseY + offsetY, `CRIT! -${dmg}`, '#ffdd44');
                if (typeof Sound !== 'undefined') Sound.critical();
            } else {
                this.showDamageNumber(baseX + offsetX, baseY + offsetY, `-${dmg}`, '#ff4444');
                if (typeof Sound !== 'undefined') Sound.attack();
            }
        }

        // Check death
        if (target.stats.hp <= 0) {
            target.alive = false;
            this.addLog(`💀 ${target.name} defeated!`, 'death');
            this.markHeroDead(target);
            if (typeof Sound !== 'undefined') Sound.death();
        }

        // Trigger skill
        this.trySkill(attacker, target, isAlly);
    },

    trySkill(attacker, target, isAlly) {
        if (!attacker.skill || Math.random() > attacker.skill.chance) return;

        const skill = attacker.skill;
        const allies = isAlly ? this.allyTeam : this.enemyTeam;
        const enemies = isAlly ? this.enemyTeam : this.allyTeam;

        // Show skill activation visuals
        this.triggerCanvasAnimation('skill');
        this.showSkillNamePopup(attacker.name, skill.name, isAlly);
        if (typeof Sound !== 'undefined') Sound.skill();

        switch (skill.type) {
            case 'buff_def':
                this.addBuff(attacker, skill.name, 'def', 1 + skill.val, 3);
                this.addLog(`✨ ${attacker.name} uses ${skill.name}! DEF up for 3 turns!`, 'skill');
                break;
            case 'buff_atk':
                this.addBuff(attacker, skill.name, 'atk', 1 + skill.val, 3);
                this.addLog(`✨ ${attacker.name} uses ${skill.name}! ATK up for 3 turns!`, 'skill');
                break;
            case 'shield':
                attacker.shield += skill.val;
                this.addLog(`✨ ${attacker.name} uses ${skill.name}! Shield ${skill.val}!`, 'skill');
                break;
            case 'lifesteal': {
                const heal = Math.floor(attacker.stats.atk * skill.val);
                attacker.stats.hp = Math.min(attacker.stats.maxHp, attacker.stats.hp + heal);
                this.addLog(`✨ ${attacker.name} uses ${skill.name}! Heals ${heal}!`, 'heal');
                this.triggerCanvasAnimation('heal');
                // Show heal number
                const canvas = document.getElementById('battle-canvas');
                if (canvas) {
                    const cx = isAlly ? 100 + attacker.position * 70 : canvas.width - 100 - attacker.position * 70;
                    this.showDamageNumber(cx, canvas.height / 2 - 30, `+${heal}`, '#44cc44');
                }
                break;
            }
            case 'aoe': {
                const aoeDmg = Math.floor(attacker.stats.atk * skill.val);
                for (const e of enemies.filter(c => c.alive)) {
                    e.stats.hp = Math.max(0, e.stats.hp - aoeDmg);
                    if (e.stats.hp <= 0) { e.alive = false; this.addLog(`💀 ${e.name} defeated!`, 'death'); this.markHeroDead(e); }
                }
                this.addLog(`✨ ${attacker.name} uses ${skill.name}! AOE ${aoeDmg} to all!`, 'skill');
                // Show AOE damage on all enemies
                const canvas = document.getElementById('battle-canvas');
                if (canvas) {
                    enemies.filter(c => c.alive || c.stats.hp <= 0).forEach((e, i) => {
                        const eIsAlly = this.allyTeam.includes(e);
                        const cx = eIsAlly ? 100 + e.position * 70 : canvas.width - 100 - e.position * 70;
                        this.showDamageNumber(cx + (Math.random()-0.5)*30, canvas.height/2 - 30 + i * 15, `-${aoeDmg}`, '#ff6644');
                    });
                }
                break;
            }
            case 'heal': {
                const lowest = allies.filter(c => c.alive).reduce((b, c) => c.stats.hp < b.stats.hp ? c : b, allies[0]);
                if (lowest) {
                    const healAmt = Math.floor(lowest.stats.maxHp * skill.val);
                    lowest.stats.hp = Math.min(lowest.stats.maxHp, lowest.stats.hp + healAmt);
                    this.addLog(`✨ ${attacker.name} uses ${skill.name}! Heals ${lowest.name} for ${healAmt}!`, 'heal');
                    this.triggerCanvasAnimation('heal');
                    const canvas = document.getElementById('battle-canvas');
                    if (canvas) {
                        const lIsAlly = this.allyTeam.includes(lowest);
                        const cx = lIsAlly ? 100 + lowest.position * 70 : canvas.width - 100 - lowest.position * 70;
                        this.showDamageNumber(cx, canvas.height/2 - 30, `+${healAmt}`, '#44cc44');
                    }
                }
                break;
            }
            case 'hot': {
                const hotTarget = allies.filter(c => c.alive).reduce((b, c) => c.stats.hp < b.stats.hp ? c : b, allies[0]);
                if (hotTarget) {
                    hotTarget.hotHeal = Math.floor(hotTarget.stats.maxHp * skill.val);
                    this.addLog(`✨ ${attacker.name} uses ${skill.name}! ${hotTarget.name} regenerating ${hotTarget.hotHeal}/turn!`, 'heal');
                    this.triggerCanvasAnimation('heal');
                }
                break;
            }
            case 'dot':
                target.dotDmg += skill.val;
                this.addLog(`✨ ${attacker.name} uses ${skill.name}! ${target.name} poisoned!`, 'skill');
                break;
            case 'debuff_spd':
                target.stats.spd = Math.floor(target.stats.spd * (1 - skill.val));
                this.addLog(`✨ ${attacker.name} uses ${skill.name}! ${target.name} slowed!`, 'skill');
                break;
            case 'stun':
                target.stats.spd = 0;
                this.addLog(`✨ ${attacker.name} uses ${skill.name}! ${target.name} stunned!`, 'skill');
                break;
            case 'dodge_buff':
                attacker.dodgeBuff = skill.val;
                attacker.buffs.push({ name: 'Evasion', type: 'dodge', duration: 2 });
                this.addLog(`✨ ${attacker.name} uses ${skill.name}! Evasion up for 2 turns!`, 'skill');
                break;
            case 'crit_boost':
                attacker.critBuff = skill.val;
                attacker.buffs.push({ name: 'Crit Boost', type: 'crit', duration: 3 });
                this.addLog(`✨ ${attacker.name} uses ${skill.name}! CRIT +${skill.val}% for 3 turns!`, 'skill');
                break;
            case 'true_dmg':
                target.stats.hp = Math.max(0, target.stats.hp - skill.val);
                this.addLog(`✨ ${attacker.name} uses ${skill.name}! ${skill.val} true damage!`, 'skill');
                // Show true damage number
                const tdCanvas = document.getElementById('battle-canvas');
                if (tdCanvas) {
                    const tIsAlly = this.allyTeam.includes(target);
                    const cx = tIsAlly ? 100 + target.position * 70 : tdCanvas.width - 100 - target.position * 70;
                    this.showDamageNumber(cx, tdCanvas.height/2 - 30, `-${skill.val} TRUE`, '#aa44ff');
                }
                if (target.stats.hp <= 0) { target.alive = false; this.addLog(`💀 ${target.name} defeated!`, 'death'); this.markHeroDead(target); }
                break;
            case 'execute':
                if (target.stats.hp < target.stats.maxHp * skill.val) {
                    target.stats.hp = 0;
                    target.alive = false;
                    this.addLog(`✨ ${attacker.name} uses ${skill.name}! ${target.name} executed!`, 'death');
                    this.markHeroDead(target);
                }
                break;
            case 'multi_hit':
                for (let i = 0; i < skill.val; i++) {
                    if (target.alive) {
                        const hitDmg = Math.max(1, Math.floor(attacker.stats.atk * 0.5));
                        target.stats.hp = Math.max(0, target.stats.hp - hitDmg);
                        if (target.stats.hp <= 0) { target.alive = false; this.addLog(`💀 ${target.name} defeated!`, 'death'); this.markHeroDead(target); }
                    }
                }
                this.addLog(`✨ ${attacker.name} uses ${skill.name}! ${skill.val + 1} hits!`, 'skill');
                break;
        }
    },

    addLog(text, type) {
        this.log.push({ text, type, turn: this.currentTurn });
        // Update UI
        const logEl = document.getElementById('battle-log');
        if (logEl) {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type || 'info'}`;
            // Add turn number prefix
            const turnSpan = document.createElement('span');
            turnSpan.className = 'log-turn-num';
            turnSpan.textContent = `[T${this.currentTurn}]`;
            entry.appendChild(turnSpan);
            entry.appendChild(document.createTextNode(text));
            logEl.appendChild(entry);
            // Auto-scroll to bottom
            logEl.scrollTop = logEl.scrollHeight;
        }
        // Update canvas
        BattleRenderer.renderBattle(this.allyTeam, this.enemyTeam);
    },

    stop() {
        this.isRunning = false;
        if (this.battleTimer) clearTimeout(this.battleTimer);
    },
};
