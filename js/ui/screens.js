/* ========================================
 * PIXEL RAID — UI Screens & Interactions
 * ======================================== */

const UI = {
    currentScreen: 'battle',
    selectedCard: null,
    marketListings: [],

    init() {
        this.bindNav();
        this.bindBattleControls();
        this.bindShopTabs();
        this.bindInventoryTabs();
        this.updateHeader();
        this.showScreen('battle');
    },

    bindNav() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof Sound !== 'undefined') Sound.click();
                this.showScreen(btn.dataset.screen);
            });
        });
    },

    showScreen(name) {
        this.currentScreen = name;
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        
        const screen = document.getElementById(`screen-${name}`);
        const btn = document.querySelector(`[data-screen="${name}"]`);
        if (screen) screen.classList.add('active');
        if (btn) btn.classList.add('active');

        // Render screen content
        switch (name) {
            case 'battle': this.renderBattleScreen(); break;
            case 'heroes': this.renderHeroesScreen(); break;
            case 'formation': this.renderStrategyScreen(); break;
            case 'inventory': this.renderInventoryScreen(); break;
            case 'shop': this.renderShopScreen(); break;
        }
    },

    updateHeader() {
        document.getElementById('player-name').textContent = GameState.player.name;
        document.getElementById('gold-display').textContent = GameState.player.gold;
        document.getElementById('gem-display').textContent = GameState.player.gems;
    },

    // ===== BATTLE SCREEN =====
    renderBattleScreen() {
        // Show deck preview (hero + skill cards) when battle is not active
        this.renderBattleDeckPreview();

        // Update header stats if stage/wave elements exist
        const stageEl = document.getElementById('stage-number');
        if (stageEl) stageEl.textContent = GameState.player.stage;
        const waveEl = document.getElementById('wave-number');
        if (waveEl) waveEl.textContent = GameState.player.wave;
        const progressEl = document.getElementById('progress-fill');
        if (progressEl) {
            const progress = ((GameState.player.wave - 1) / GameState.player.maxWave) * 100;
            progressEl.style.width = progress + '%';
        }
        
        // Render initial battle canvas (skip if Phaser handles rendering)
        const canvas = document.getElementById('battle-canvas');
        if (canvas && canvas.tagName === 'CANVAS') {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#0a0a2a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffd700';
            ctx.font = '14px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('Press Start Battle!', canvas.width / 2, canvas.height / 2);
        }
    },

    /**
     * Render battle deck preview — shows active hero + skill deck cards
     * Visible when battle is NOT running, hidden during battle
     */
    renderBattleDeckPreview() {
        const preview = document.getElementById('battle-deck-preview');
        if (!preview) return;

        // Hide preview when battle is active
        if (typeof BattleEngine !== 'undefined' && BattleEngine.isRunning) {
            preview.style.display = 'none';
            return;
        }
        preview.style.display = '';

        const deckCards = GameState.getDeckCards();
        const skillCards = GameState.skillDeck.length > 0
            ? GameState.getSkillDeckCards()
            : SKILL_CARD_TEMPLATES.slice(0, 4).map(t => ({ ...t }));

        // No hero in deck — prompt user
        if (deckCards.length === 0) {
            preview.innerHTML = `
                <div style="text-align:center;padding:24px 12px;">
                    <div style="font-size:28px;margin-bottom:8px;">🃏</div>
                    <div style="font-family:'Press Start 2P';font-size:9px;color:var(--gold);margin-bottom:8px;">No Hero Selected</div>
                    <div style="font-size:8px;color:var(--text-dim);">Go to <strong>Strategy</strong> to build your deck!</div>
                </div>
            `;
            return;
        }

        const hero = deckCards[0];
        const template = getTemplateByName(hero.templateId || hero.name);
        const cls = CLASSES[hero.class] || {};
        const rarity = RARITIES[hero.rarity] || {};
        const typeIcons = { attack: '⚔️', defense: '🛡️', buff: '✨', debuff: '💀', special: '⚡' };

        // Hero preview section
        let heroHTML = `
            <div class="battle-preview-hero">
                <div class="battle-preview-hero-sprite" id="battle-preview-sprite"></div>
                <div class="battle-preview-hero-info">
                    <div class="battle-preview-hero-name" style="color:${rarity.color || '#fff'}">${hero.name}${hero.level > 1 ? ' Lv.' + hero.level : ''}</div>
                    <div class="battle-preview-hero-class" style="color:${cls.color || '#888'}">${cls.emoji || ''} ${cls.name || hero.class}</div>
                    <div class="battle-preview-hero-stats">
                        <span style="color:#44cc44">HP:${hero.stats.hp}</span>
                        <span style="color:#ff6644">ATK:${hero.stats.atk}</span>
                        <span style="color:#4488ff">DEF:${hero.stats.def}</span>
                        <span style="color:#ffaa00">SPD:${hero.stats.spd}</span>
                    </div>
                </div>
            </div>
        `;

        // Skill cards section
        let skillsHTML = '<div class="battle-preview-skills">';
        skillCards.forEach(card => {
            const typeIcon = typeIcons[card.type] || '🃏';
            const cardType = CARD_TYPES[card.type] || {};
            skillsHTML += `
                <div class="battle-preview-skill-card">
                    <div class="battle-preview-skill-icon">${typeIcon}</div>
                    <div class="battle-preview-skill-name">${card.name}</div>
                    <div class="battle-preview-skill-mana" style="color:${cardType.color || '#aaa'}">💎 ${card.manaCost}</div>
                </div>
            `;
        });
        skillsHTML += '</div>';

        preview.innerHTML = heroHTML + skillsHTML;

        // Draw hero sprite (image with canvas fallback)
        const spriteContainer = document.getElementById('battle-preview-sprite');
        if (spriteContainer) {
            if (template && template.image) {
                const img = document.createElement('img');
                img.width = 80; img.height = 80;
                img.style.imageRendering = 'pixelated';
                img.src = template.image;
                img.onerror = () => {
                    const cvs = document.createElement('canvas');
                    cvs.width = 80; cvs.height = 80;
                    if (typeof CardRenderer !== 'undefined') CardRenderer.drawCardSprite(cvs, hero, 80);
                    spriteContainer.innerHTML = '';
                    spriteContainer.appendChild(cvs);
                };
                spriteContainer.innerHTML = '';
                spriteContainer.appendChild(img);
            } else if (typeof CardRenderer !== 'undefined') {
                const cvs = document.createElement('canvas');
                cvs.width = 80; cvs.height = 80;
                CardRenderer.drawCardSprite(cvs, hero, 80);
                spriteContainer.innerHTML = '';
                spriteContainer.appendChild(cvs);
            }
        }
    },

    bindBattleControls() {
        document.getElementById('btn-start-battle').addEventListener('click', () => {
            if (typeof Sound !== 'undefined') Sound.click();
            this.startBattle();
        });
        document.getElementById('btn-auto-next').addEventListener('click', () => {
            GameState.autoNext = !GameState.autoNext;
            const btn = document.getElementById('btn-auto-next');
            btn.classList.toggle('btn-gold', GameState.autoNext);
            btn.textContent = GameState.autoNext ? '⏹️ Stop Auto' : '🔄 Auto Next Stage';
        });

        // Default battle speed = 2x (fast) — no speed buttons in UI
        GameState.battleSpeed = 2;
    },

    startBattle() {
        // 1v1 Card Battle: pick 1 hero + skill cards from deck
        const deckCards = GameState.getDeckCards();
        if (deckCards.length === 0) {
            this.toast('Build your deck first! Go to Heroes.', 'error');
            return;
        }

        // Pick first hero in deck as active battle hero
        const playerHero = deckCards[0];

        // Get skill card IDs for the player
        let playerSkillIds = GameState.skillDeck.slice();
        // If no skill deck built, use default starter skill cards
        if (playerSkillIds.length === 0) {
            playerSkillIds = SKILL_CARD_TEMPLATES.slice(0, 4).map(c => c.id);
        }

        // Generate enemy: 1 hero + skill cards
        const stage = GameState.player.stage;
        const enemyDeck = GameState.generateEnemyDeck(stage);
        const enemyHero = enemyDeck[0]; // pick first generated enemy
        const enemySkillIds = GameState.generateEnemySkillDeck(stage);

        // Initialize card hand renderer with the hand area container
        CardHand.init('card-hand-area');
        
        document.getElementById('btn-start-battle').disabled = true;

        // Click on battle container for hero info
        const battleContainer = document.getElementById('battle-canvas-container');
        if (battleContainer) {
            battleContainer.onclick = (e) => {
                if (!BattleEngine.isRunning) return;
                this.showEnemyInfo(BattleEngine.isPlayerTurn ? BattleEngine.enemy.hero : BattleEngine.player.hero);
            };
        }

        // Set phase banner callback to use BattlePhaser or BattleArenaScene
        BattleEngine.onPhaseChange = (phase, isPlayerTurn) => {
            const phaseNames = { draw: 'DRAW PHASE', main: 'MAIN PHASE', battle: 'BATTLE PHASE', end: 'END PHASE' };
            if (phaseNames[phase]) {
                if (typeof BattlePhaser !== 'undefined' && BattlePhaser.isActive()) {
                    BattlePhaser.showPhaseBanner(phaseNames[phase], isPlayerTurn);
                } else {
                    BattleArenaScene.showPhaseBanner(phaseNames[phase], isPlayerTurn);
                }
            }
        };

        // BUG FIX: Wait for Phaser scene to be ready before starting the battle engine.
        // BattlePhaser.enter() is async — cards render before Phaser scene is ready on retry.
        const startEngine = () => {
            BattleEngine.startBattle(playerHero, playerSkillIds, enemyHero, enemySkillIds, (result, log, turns) => {
                // Exit battle scene (Phaser or Canvas)
                if (typeof BattlePhaser !== 'undefined' && BattlePhaser.isActive()) {
                    BattlePhaser.exit(() => {
                        document.getElementById('btn-start-battle').disabled = false;
                    });
                }
                BattleArenaScene.exit(() => {
                    document.getElementById('btn-start-battle').disabled = false;
                });

                // Process results after exit transition completes
                setTimeout(() => {

                if (result === 'win') {
                    GameState.stats.battlesWon++;

                    // Process wave
                    if (GameState.player.wave < GameState.player.maxWave) {
                        GameState.player.wave++;
                    } else {
                        // Stage complete!
                        const rewards = Economy.processStageReward(stage);
                        GameState.player.stage++;
                        GameState.player.wave = 1;
                        GameState.stats.highestStage = Math.max(GameState.stats.highestStage, GameState.player.stage);

                        // Show stage clear modal with rewards
                        setTimeout(() => this.showStageClearModal(rewards, stage), 800);

                        // Hero EXP distribution
                        const levelUps = BattleEngine.distributeEXP(true);
                        if (levelUps.length > 0) {
                            levelUps.forEach(lu => {
                                this.toast(`⬆️ ${lu.name} reached Lv.${lu.level}! +${lu.boost} all stats`, 'success');
                            });
                        }

                        if (rewards.leveledUp) {
                            this.toast(`🎉 Level Up! Now Lv.${GameState.player.level}`, 'success');
                            if (typeof Sound !== 'undefined') Sound.levelUp();

                            // Show unlock notification
                            if (rewards.unlock) {
                                setTimeout(() => this.showUnlockPopup(rewards.unlock), 800);
                            }
                        }
                    }
                } else {
                    GameState.stats.battlesLost++;
                    // Show defeat modal
                    setTimeout(() => this.showDefeatModal(), 800);
                }

                GameState.save();
                this.updateHeader();
                this.renderBattleScreen();

                // Auto next
                if (GameState.autoNext && result === 'win') {
                    const delay = GameState.player.wave === 1 ? 2500 : 1500;
                    setTimeout(() => this.startBattle(), delay);
                }

                }, 900); // end setTimeout — wait for exit transition
            });
        };

        // Initialize Phaser renderer and wait for scene to be ready before starting battle
        if (typeof BattlePhaser !== 'undefined') {
            BattlePhaser.init('battle-canvas-container');
            BattlePhaser.enter(playerHero, enemyHero, () => {
                // Phaser scene is ready — safe to start battle engine now
                startEngine();
            });
        } else {
            // Fallback: init canvas scene and start immediately
            BattleArenaScene.init('battle-canvas-container');
            startEngine();
        }
    },

    showRewards(rewards) {
        let msg = `Stage ${GameState.player.stage - 1} Complete!\n`;
        msg += `💰 +${rewards.gold} Gold\n`;
        msg += `⭐ +${rewards.exp} EXP\n`;
        if (rewards.cards.length > 0) {
            msg += `🃏 New card: ${rewards.cards.map(c => c.name).join(', ')}\n`;
        }
        if (rewards.items.length > 0) {
            msg += `🎁 Item: ${rewards.items.map(i => i.name).join(', ')}`;
        }
        this.toast(msg, 'success');
    },

    // ===== STAGE CLEAR MODAL =====
    showStageClearModal(rewards, stageNum) {
        const modal = document.createElement('div');
        modal.className = 'battle-result-modal';

        let rewardsHTML = '';
        rewardsHTML += `<div>💰 <strong>+${rewards.gold}</strong> Gold</div>`;
        rewardsHTML += `<div>⭐ <strong>+${rewards.exp}</strong> EXP</div>`;
        if (rewards.cards && rewards.cards.length > 0) {
            rewardsHTML += `<div>🃏 New Card: <strong style="color:${RARITIES[rewards.cards[0].rarity].color}">${rewards.cards.map(c => c.name).join(', ')}</strong></div>`;
        }
        if (rewards.items && rewards.items.length > 0) {
            rewardsHTML += `<div>🎁 Item: <strong>${rewards.items.map(i => i.name).join(', ')}</strong></div>`;
        }
        if (rewards.leveledUp) {
            rewardsHTML += `<div>🎉 <strong style="color:var(--gold)">LEVEL UP!</strong></div>`;
        }

        modal.innerHTML = `
            <div class="battle-result-content">
                <div class="battle-result-title" style="color:var(--gold);">🏆 STAGE ${stageNum} CLEAR!</div>
                <div class="battle-result-rewards">${rewardsHTML}</div>
                <div class="battle-result-buttons">
                    <button class="btn btn-gold" onclick="UI.closeBattleResultModal(this); UI.startBattle();">⚔️ Next Stage</button>
                    <button class="btn btn-secondary" onclick="UI.closeBattleResultModal(this)">OK</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        // Auto-close after 8s if not interacted
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 8000);
    },

    // ===== DEFEAT MODAL =====
    showDefeatModal() {
        const modal = document.createElement('div');
        modal.className = 'battle-result-modal';

        modal.innerHTML = `
            <div class="battle-result-content" style="border-color:#ff4444;">
                <div class="battle-result-title" style="color:#ff4444;">💀 DEFEATED</div>
                <div class="battle-result-rewards" style="color:var(--text-dim);">
                    <div>Your heroes fell in battle...</div>
                    <div>Stage ${GameState.player.stage} — Wave ${GameState.player.wave}/3</div>
                    <div style="margin-top:8px;font-size:8px;">💡 Tip: Upgrade your cards or change formation!</div>
                </div>
                <div class="battle-result-buttons">
                    <button class="btn btn-gold" onclick="UI.closeBattleResultModal(this); UI.startBattle();">🔄 Retry</button>
                    <button class="btn btn-secondary" onclick="UI.closeBattleResultModal(this)">Back</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => { if (modal.parentNode) modal.remove(); }, 10000);
    },

    closeBattleResultModal(btn) {
        const modal = btn.closest('.battle-result-modal');
        if (modal) modal.remove();
    },

    // ===== HEROES SCREEN =====
    renderHeroesScreen() {
        const grid = document.getElementById('hero-list');
        grid.innerHTML = '';
        
        if (GameState.collection.length === 0) {
            grid.innerHTML = '<div style="font-size:8px;color:var(--text-dim);padding:20px;">No cards yet! Open packs in the Shop.</div>';
            return;
        }

        // Sort by rarity then power
        const sorted = [...GameState.collection].sort((a, b) => {
            const rarityOrder = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 };
            const rDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
            return rDiff || getCardPower(b) - getCardPower(a);
        });

        sorted.forEach(card => {
            const el = document.createElement('div');
            el.className = `card ${card.rarity}`;
            el.onclick = () => this.showHeroDetail(card);

            const template = getTemplateByName(card.templateId || card.name);
            let sprite;
            if (template && template.image) {
                sprite = document.createElement('img');
                sprite.className = 'card-sprite';
                sprite.width = 48;
                sprite.height = 48;
                sprite.style.imageRendering = 'pixelated';
                sprite.src = template.image;
                sprite.onerror = function() {
                    // Fallback to canvas procedural art
                    const cvs = document.createElement('canvas');
                    cvs.className = 'card-sprite';
                    cvs.width = 48;
                    cvs.height = 48;
                    CardRenderer.drawCardSprite(cvs, card, 48);
                    sprite.replaceWith(cvs);
                };
            } else {
                sprite = document.createElement('canvas');
                sprite.className = 'card-sprite';
                sprite.width = 48;
                sprite.height = 48;
                CardRenderer.drawCardSprite(sprite, card, 48);
            }

            const name = document.createElement('div');
            name.className = 'card-name';
            name.style.color = RARITIES[card.rarity].color;
            name.textContent = card.name + (card.level > 1 ? ` Lv.${card.level}` : '');

            const cls = document.createElement('div');
            cls.className = 'card-class';
            cls.textContent = CLASSES[card.class].emoji + ' ' + CLASSES[card.class].name;

            const stats = document.createElement('div');
            stats.className = 'card-stats';
            // Calculate max stats for bar scaling (based on highest possible base)
            const maxHP = 140, maxATK = 38, maxDEF = 25, maxSPD = 24;
            const statData = [
                { label: 'HP',  val: card.stats.hp,  max: maxHP,  color: '#44cc44' },
                { label: 'ATK', val: card.stats.atk, max: maxATK, color: '#ff6644' },
                { label: 'DEF', val: card.stats.def, max: maxDEF, color: '#4488ff' },
                { label: 'SPD', val: card.stats.spd, max: maxSPD, color: '#ffaa00' },
            ];
            stats.innerHTML = statData.map(s => `
                <div class="card-stat-row">
                    <span class="card-stat-label">${s.label}</span>
                    <div class="card-stat-bar-bg"><div class="card-stat-bar-fill" style="width:${Math.min(100, (s.val / s.max) * 100)}%;background:${s.color}"></div></div>
                    <span class="card-stat-val" style="color:${s.color}">${s.val}</span>
                </div>
            `).join('') + `<div class="card-power">⚡ ${getCardPower(card)}</div>` +
            (card.level > 1 ? `<div class="card-exp-bar" style="margin-top:3px"><div class="card-exp-fill" style="width:${card.expToNext > 0 ? Math.min(100, (card.exp / card.expToNext) * 100) : 0}%"></div></div>` : '');

            el.append(sprite, name, cls, stats);
            grid.appendChild(el);
        });
    },

    showHeroDetail(card) {
        const detail = document.getElementById('hero-detail');
        const content = document.getElementById('hero-detail-content');
        
        const isEquipped = GameState.deck.includes(card.id);
        const equipBtnText = isEquipped ? '📤 Remove from Deck' : '📥 Add to Deck';
        const template = getTemplateByName(card.templateId || card.name);
        
        content.innerHTML = `
            <div style="text-align:center;margin-bottom:16px;">
                <div id="detail-sprite-container" style="width:96px;height:96px;margin:0 auto;"></div>
                <h3 style="color:${RARITIES[card.rarity].color};font-size:12px;margin-top:8px;">${card.name}</h3>
                <div style="color:${CLASSES[card.class].color};font-size:8px;">${CLASSES[card.class].emoji} ${CLASSES[card.class].name} • ${RARITIES[card.rarity].name}</div>
                ${card.level > 1 ? `<div style="color:#9b59b6;font-size:8px;margin-top:2px;">⭐ Level ${card.level} — EXP: ${card.exp || 0}/${card.expToNext || '?'}</div>` : ''}
            </div>
            <div style="font-size:8px;margin-bottom:12px;">
                ${['HP','ATK','DEF','SPD'].map(s => {
                    const val = card.stats[s.toLowerCase()];
                    const max = {HP:140,ATK:38,DEF:25,SPD:24}[s];
                    const color = {HP:'#44cc44',ATK:'#ff6644',DEF:'#4488ff',SPD:'#ffaa00'}[s];
                    return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border);">
                        <span style="color:#888;width:30px;font-size:7px;">${s}</span>
                        <div style="flex:1;height:6px;background:var(--bg-dark);border-radius:3px;overflow:hidden;"><div style="width:${Math.min(100,(val/max)*100)}%;height:100%;background:${color};border-radius:3px;"></div></div>
                        <span style="color:${color};width:28px;text-align:right;font-size:8px;font-weight:700;">${val}</span>
                    </div>`;
                }).join('')}
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
                    <span style="color:#888">CRIT</span><span style="color:#ff44aa">${card.stats.crit}%</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;">
                    <span style="color:#888">POWER</span><span style="color:var(--gold)">${getCardPower(card)}</span>
                </div>
            </div>
            ${template && template.lore ? `<div style="font-size:7px;color:var(--text-dim);font-style:italic;padding:6px 8px;margin-bottom:10px;background:var(--bg-dark);border-left:2px solid ${RARITIES[card.rarity].color};border-radius:0 4px 4px 0;">"${template.lore}"</div>` : ''}
            <div style="font-size:7px;background:var(--bg-dark);padding:8px;margin-bottom:12px;">
                <div style="color:var(--gem);margin-bottom:4px;">✨ Skill: ${card.skill.name}</div>
                <div style="color:var(--text-dim);">Type: ${card.skill.type} • Chance: ${Math.floor(card.skill.chance * 100)}%</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-primary" onclick="UI.toggleDeck(${card.id})">${equipBtnText}</button>
                <button class="btn btn-secondary" onclick="UI.sellCardConfirm(${card.id})">💰 Sell (${getCardSellPrice(card)}g)</button>
                <button class="btn btn-secondary" onclick="UI.closeHeroDetail()">Close</button>
            </div>
        `;

        detail.classList.remove('hidden');
        
        // Draw sprite — image with canvas fallback
        const container = document.getElementById('detail-sprite-container');
        if (template && template.image) {
            const img = document.createElement('img');
            img.width = 96;
            img.height = 96;
            img.style.imageRendering = 'pixelated';
            img.src = template.image;
            img.onerror = function() {
                const cvs = document.createElement('canvas');
                cvs.width = 96; cvs.height = 96;
                CardRenderer.drawCardSprite(cvs, card, 96);
                container.innerHTML = '';
                container.appendChild(cvs);
            };
            container.innerHTML = '';
            container.appendChild(img);
        } else {
            const cvs = document.createElement('canvas');
            cvs.width = 96; cvs.height = 96;
            CardRenderer.drawCardSprite(cvs, card, 96);
            container.innerHTML = '';
            container.appendChild(cvs);
        }
    },

    toggleDeck(cardId) {
        if (GameState.deck.includes(cardId)) {
            GameState.removeFromDeck(cardId);
            this.toast('Card removed from deck', 'info');
        } else {
            if (GameState.deck.length >= 4) {
                this.toast('Deck is full! Remove a card first.', 'error');
                return;
            }
            GameState.addToDeck(cardId);
            this.toast('Card added to deck!', 'success');
        }
        this.closeHeroDetail();
        this.renderHeroesScreen();
    },

    sellCardConfirm(cardId) {
        const card = GameState.getCardById(cardId);
        if (!card) return;
        const price = getCardSellPrice(card);
        if (confirm(`Sell ${card.name} for ${price} gold?`)) {
            Economy.sellCard(cardId);
            this.toast(`Sold ${card.name} for ${price}g`, 'success');
            this.updateHeader();
            this.closeHeroDetail();
            this.renderHeroesScreen();
        }
    },

    closeHeroDetail() {
        document.getElementById('hero-detail').classList.add('hidden');
    },

    // ===== PLAYER NAME =====
    changePlayerName() {
        const current = GameState.player.name || 'Adventurer';
        const newName = prompt('Enter your name:', current);
        if (newName && newName.trim() && newName.trim() !== current) {
            const name = newName.trim().substring(0, 16);
            GameState.player.name = name;
            document.getElementById('player-name').textContent = name;
            GameState.save();
            this.toast(`Name changed to ${name}!`, 'success');
        }
    },

    // ===== STRATEGY SCREEN (replaces Formation) =====
    _selectedStrategyHero: null,

    renderStrategyScreen() {
        this._renderHeroSelectionGrid();
    },

    /**
     * Section A: Hero Selection Grid — shows all 20 heroes from CARD_TEMPLATES
     * Owned heroes are clickable; unowned are grayed out with lock icon
     */
    _renderHeroSelectionGrid() {
        const container = document.getElementById('strategy-content');
        if (!container) return;

        const selectedDeckHeroId = GameState.deck.length > 0 ? GameState.deck[0] : null;

        let html = `
            <div style="font-family:'Press Start 2P';font-size:8px;color:var(--gold);margin-bottom:8px;">
                🦸 SELECT BATTLE HERO
            </div>
            <div class="strategy-hero-grid">
        `;

        CARD_TEMPLATES.forEach((tmpl, index) => {
            // Check if player owns this hero (match by templateId or name)
            const ownedCard = GameState.collection.find(
                c => (c.templateId === tmpl.name) || (c.name === tmpl.name)
            );
            const isOwned = !!ownedCard;
            const isSelected = isOwned && ownedCard && selectedDeckHeroId === ownedCard.id;
            const cls = CLASSES[tmpl.cls] || {};

            // Determine default rarity for styling
            const totalStats = tmpl.hp + tmpl.atk + tmpl.def + tmpl.spd + tmpl.crit;
            const defaultRarity = totalStats > 200 ? 'epic' : totalStats > 160 ? 'rare' : 'common';

            const opacity = isOwned ? '1' : '0.4';
            const cursor = isOwned ? 'pointer' : 'not-allowed';
            const borderGlow = isSelected ? `box-shadow:0 0 12px var(--gold),0 0 4px var(--gold);border-color:var(--gold);` : '';

            html += `
                <div class="strategy-hero-card" data-hero-index="${index}"
                     style="opacity:${opacity};cursor:${cursor};${borderGlow}"
                     onclick="${isOwned ? `UI._selectStrategyHero(${index})` : ''}">
                    ${!isOwned ? '<div class="strategy-hero-lock">🔒</div>' : ''}
                    <canvas class="strategy-hero-sprite" data-hero-index="${index}" width="48" height="48" style="image-rendering:pixelated;"></canvas>
                    <div class="strategy-hero-name" style="color:${isOwned ? (RARITIES[ownedCard?.rarity]?.color || RARITIES[defaultRarity].color) : RARITIES[defaultRarity].color}">${tmpl.name}</div>
                    <div class="strategy-hero-class">${cls.emoji || ''} ${cls.name || tmpl.cls}</div>
                    <div class="strategy-hero-stats">
                        <span style="color:#44cc44">HP:${tmpl.hp}</span>
                        <span style="color:#ff6644">ATK:${tmpl.atk}</span>
                        <span style="color:#4488ff">DEF:${tmpl.def}</span>
                        <span style="color:#ffaa00">SPD:${tmpl.spd}</span>
                    </div>
                    ${isSelected ? '<div class="strategy-hero-selected-badge">✅ ACTIVE</div>' : ''}
                </div>
            `;
        });

        html += '</div>';

        // Section B: Skill Card Deck Builder (only when hero is selected)
        if (selectedDeckHeroId) {
            html += this._renderSkillDeckBuilder();
        }

        // Section C: Active Deck Summary
        html += this._renderDeckSummary();

        container.innerHTML = html;

        // Draw hero sprites after DOM is ready
        setTimeout(() => {
            document.querySelectorAll('.strategy-hero-sprite').forEach(canvas => {
                const idx = parseInt(canvas.dataset.heroIndex);
                const tmpl = CARD_TEMPLATES[idx];
                if (!tmpl) return;
                if (tmpl.image) {
                    const img = new Image();
                    img.onload = () => {
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(img, 0, 0, 48, 48);
                    };
                    img.onerror = () => {
                        const card = { name: tmpl.name, class: tmpl.cls, rarity: 'common', stats: {hp:tmpl.hp,atk:tmpl.atk,def:tmpl.def,spd:tmpl.spd,crit:tmpl.crit}, artSeed: Math.floor(Math.random()*999999) };
                        if (typeof CardRenderer !== 'undefined') CardRenderer.drawCardSprite(canvas, card, 48);
                    };
                    img.src = tmpl.image;
                } else {
                    const card = { name: tmpl.name, class: tmpl.cls, rarity: 'common', stats: {hp:tmpl.hp,atk:tmpl.atk,def:tmpl.def,spd:tmpl.spd,crit:tmpl.crit}, artSeed: Math.floor(Math.random()*999999) };
                    if (typeof CardRenderer !== 'undefined') CardRenderer.drawCardSprite(canvas, card, 48);
                }
            });
        }, 50);
    },

    /**
     * Select a hero as the active battle hero
     */
    _selectStrategyHero(templateIndex) {
        const tmpl = CARD_TEMPLATES[templateIndex];
        if (!tmpl) return;

        // Find owned card matching this template
        const ownedCard = GameState.collection.find(
            c => (c.templateId === tmpl.name) || (c.name === tmpl.name)
        );
        if (!ownedCard) {
            this.toast('🔒 Hero not owned yet!', 'error');
            return;
        }

        // Set as deck hero (single hero for 1v1)
        GameState.deck = [ownedCard.id];
        GameState.save();
        this.toast(`${tmpl.name} set as battle hero!`, 'success');

        // Re-render
        this._renderHeroSelectionGrid();
    },

    /**
     * Section B: Skill Card Deck Builder — shows all 20 skill cards
     */
    _renderSkillDeckBuilder() {
        const typeIcons = { attack: '⚔️', defense: '🛡️', buff: '✨', debuff: '💀', special: '⚡' };
        const currentDeck = GameState.skillDeck || [];
        const deckCount = currentDeck.length;

        let html = `
            <div style="font-family:'Press Start 2P';font-size:8px;color:var(--gold);margin:16px 0 8px;">
                🃏 SKILL DECK BUILDER <span style="font-family:'Silkscreen';font-size:8px;color:var(--text-dim);">(${deckCount}/4 cards)</span>
            </div>
            <div class="strategy-skill-grid">
        `;

        SKILL_CARD_TEMPLATES.forEach(card => {
            const inDeck = currentDeck.includes(card.id);
            const typeIcon = typeIcons[card.type] || '🃏';
            const cardType = CARD_TYPES[card.type] || {};
            const rarityColor = RARITIES[card.rarity]?.color || '#aaa';
            const borderStyle = inDeck ? `border-color:${cardType.color || 'var(--gold)'};box-shadow:0 0 6px ${cardType.color || 'var(--gold)'}44;` : '';

            html += `
                <div class="strategy-skill-card ${inDeck ? 'in-deck' : ''}"
                     style="${borderStyle}"
                     onclick="UI._toggleSkillCard('${card.id}')">
                    ${inDeck ? '<div class="strategy-skill-check">✅</div>' : ''}
                    <div class="strategy-skill-header">
                        <span class="strategy-skill-type-icon">${typeIcon}</span>
                        <span class="strategy-skill-name">${card.name}</span>
                    </div>
                    <div class="strategy-skill-meta">
                        <span style="color:${rarityColor}">${RARITIES[card.rarity]?.name || card.rarity}</span>
                        <span style="color:${cardType.color || '#aaa'}">💎 ${card.manaCost}</span>
                    </div>
                    <div class="strategy-skill-desc">${card.description}</div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    },

    /**
     * Toggle a skill card in/out of the deck (max 4)
     */
    _toggleSkillCard(cardId) {
        let deck = GameState.skillDeck || [];
        const idx = deck.indexOf(cardId);

        if (idx >= 0) {
            // Remove from deck
            deck.splice(idx, 1);
            GameState.skillDeck = deck;
        } else {
            // Add to deck (max 4)
            if (deck.length >= 4) {
                this.toast('Skill deck is full! (Max 4 cards)', 'error');
                return;
            }
            deck.push(cardId);
            GameState.skillDeck = deck;
        }

        GameState.save();

        // Re-render strategy screen
        this._renderHeroSelectionGrid();
    },

    /**
     * Section C: Active Deck Summary — mini preview of hero + skill cards
     */
    _renderDeckSummary() {
        const deckCards = GameState.getDeckCards();
        const skillCards = GameState.skillDeck.length > 0
            ? GameState.getSkillDeckCards()
            : SKILL_CARD_TEMPLATES.slice(0, 4);

        let html = `
            <div style="font-family:'Press Start 2P';font-size:8px;color:var(--gold);margin:16px 0 8px;">
                📋 ACTIVE DECK SUMMARY
            </div>
            <div class="strategy-deck-summary">
        `;

        // Hero
        if (deckCards.length > 0) {
            const hero = deckCards[0];
            const cls = CLASSES[hero.class] || {};
            const r = RARITIES[hero.rarity] || {};
            html += `
                <div class="strategy-summary-hero">
                    <span style="font-size:14px">${cls.emoji || '🦸'}</span>
                    <span style="color:${r.color};font-size:8px;font-weight:700;">${hero.name}</span>
                    <span style="color:${cls.color};font-size:7px;">${cls.name}</span>
                </div>
            `;
        } else {
            html += `<div style="font-size:8px;color:var(--text-dim);">No hero selected</div>`;
        }

        // Skill cards
        html += '<div class="strategy-summary-skills">';
        const typeIcons = { attack: '⚔️', defense: '🛡️', buff: '✨', debuff: '💀', special: '⚡' };
        skillCards.forEach(card => {
            const typeIcon = typeIcons[card.type] || '🃏';
            html += `
                <div class="strategy-summary-skill">
                    <span>${typeIcon}</span>
                    <span style="font-size:7px">${card.name}</span>
                    <span style="font-size:7px;color:#888">💎${card.manaCost}</span>
                </div>
            `;
        });
        html += '</div>';

        // Synergy info (simplified for 1v1: check hero class + skill types)
        if (deckCards.length > 0) {
            const hero = deckCards[0];
            const heroClass = hero.class;
            const matchingSkills = skillCards.filter(s => {
                // Simple synergy: attack skills match warrior/assassin, buff match mage, etc.
                return true; // show general info
            });
            const cls = CLASSES[heroClass];
            if (cls) {
                html += `
                    <div class="strategy-synergy-info">
                        <span style="color:${cls.color};font-size:7px;">${cls.emoji} ${cls.name} — ${skillCards.length} skills equipped</span>
                    </div>
                `;
            }
        }

        html += '</div>';
        return html;
    },


    // ===== INVENTORY SCREEN =====
    bindInventoryTabs() {
        document.querySelectorAll('.inv-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderInventoryItems(tab.dataset.tab);
            });
        });
    },

    renderInventoryScreen() {
        this.renderInventoryItems('equipment');
    },

    renderInventoryItems(tab) {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';

        const items = tab === 'equipment' 
            ? GameState.inventory.filter(i => i.type !== 'potion')
            : GameState.inventory.filter(i => i.type === 'potion');

        if (items.length === 0) {
            grid.innerHTML = '<div style="font-size:8px;color:var(--text-dim);padding:20px;">No items yet!</div>';
            return;
        }

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = `card ${item.rarity}`;
            el.innerHTML = `
                <div style="text-align:center;font-size:16px;margin-bottom:8px;">${ITEM_TYPES[item.type].emoji}</div>
                <div class="card-name" style="color:${RARITIES[item.rarity].color}">${item.name}</div>
                <div class="card-class">${RARITIES[item.rarity].name}</div>
                <div class="card-stats">
                    <span><span style="color:#888">${item.stat.toUpperCase()}</span> <span style="color:var(--gold)">+${item.val}</span></span>
                </div>
                <div style="font-size:6px;color:var(--text-dim);margin-top:4px;">
                    ${item.equippedTo ? `Equipped to card #${item.equippedTo}` : 'Not equipped'}
                </div>
                <div style="margin-top:8px;display:flex;gap:4px;">
                    <button class="btn btn-secondary" style="font-size:6px;padding:4px 6px;" onclick="UI.equipItemToCard(${item.id})">Equip</button>
                    <button class="btn btn-secondary" style="font-size:6px;padding:4px 6px;" onclick="UI.sellItemConfirm(${item.id})">Sell</button>
                </div>
            `;
            grid.appendChild(el);
        });
    },

    equipItemToCard(itemId) {
        const deckCards = GameState.getDeckCards();
        if (deckCards.length === 0) {
            this.toast('Add cards to your deck first!', 'error');
            return;
        }
        // Equip to first deck card for simplicity (TODO: card selector)
        const card = deckCards[0];
        if (GameState.equipItem(itemId, card.id)) {
            this.toast(`Equipped to ${card.name}!`, 'success');
            this.renderInventoryItems(document.querySelector('.inv-tab.active').dataset.tab);
        } else {
            this.toast('Cannot equip this item!', 'error');
        }
    },

    sellItemConfirm(itemId) {
        const item = GameState.inventory.find(i => i.id === itemId);
        if (!item) return;
        const price = Math.floor(item.price * 0.5);
        if (confirm(`Sell ${item.name} for ${price} gold?`)) {
            Economy.sellItem(itemId);
            this.toast(`Sold for ${price}g`, 'success');
            this.updateHeader();
            this.renderInventoryItems(document.querySelector('.inv-tab.active').dataset.tab);
        }
    },

    // ===== SHOP SCREEN =====
    bindShopTabs() {
        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderShopContent(tab.dataset.tab);
            });
        });
    },

    renderShopScreen() {
        this.renderShopContent('tiers');
    },

    renderShopContent(tab) {
        const content = document.getElementById('shop-content');
        if (tab === 'tiers') this.renderTierPacks(content);
        else if (tab === 'classes') this.renderClassPacks(content);
        else if (tab === 'catalog') this.renderHeroCatalog(content);
        else if (tab === 'marketplace') this.renderMarketplace(content);
    },

    // ===== TIER-BASED PACKS =====
    renderTierPacks(content) {
        const tierKeys = Object.keys(Economy.TIER_PACKS);
        content.innerHTML = `
            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:32px;">🏆</div>
                <h3 style="font-size:11px;margin:8px 0;">Tier Card Packs</h3>
                <p style="font-size:7px;color:var(--text-dim);">Higher tier = better rarity odds + guarantees!</p>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;">
                ${tierKeys.map(key => {
                    const pack = Economy.TIER_PACKS[key];
                    const affordable = Economy.canAfford({gold:pack.gold,gems:pack.gems});
                    const rarityClass = pack.tier >= 5 ? 'mythic' : pack.tier >= 4 ? 'legendary' : pack.tier >= 3 ? 'epic' : pack.tier >= 2 ? 'rare' : 'common';
                    return `
                        <div class="card ${rarityClass}" onclick="UI.buyTierPack('${key}')" style="${!affordable ? 'opacity:0.5;cursor:not-allowed;' : ''}">
                            <div style="text-align:center;font-size:20px;margin-bottom:6px;">
                                ${pack.tier === 1 ? '🥉' : pack.tier === 2 ? '🥈' : pack.tier === 3 ? '🥇' : pack.tier === 4 ? '💎' : '🔥'}
                            </div>
                            <div class="card-name" style="color:${pack.color};font-size:9px;">${pack.name}</div>
                            <div class="card-class" style="font-size:7px;">${pack.desc}</div>
                            ${pack.guarantee ? `<div style="font-size:7px;color:#44ff88;margin-top:4px;">✅ Guaranteed ${pack.guarantee}+</div>` : ''}
                            <div style="font-size:8px;margin-top:8px;color:var(--gold);font-weight:700;">
                                ${pack.gold ? `💰 ${pack.gold}` : ''}${pack.gold && pack.gems ? ' + ' : ''}${pack.gems ? `💎 ${pack.gems}` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    // ===== CLASS PACKS =====
    renderClassPacks(content) {
        const classKeys = Object.keys(Economy.CLASS_PACKS);
        content.innerHTML = `
            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:32px;">⚔️</div>
                <h3 style="font-size:11px;margin:8px 0;">Class-Focused Packs</h3>
                <p style="font-size:7px;color:var(--text-dim);">Target specific hero classes for your strategy!</p>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;">
                ${classKeys.map(key => {
                    const pack = Economy.CLASS_PACKS[key];
                    const affordable = Economy.canAfford({gold:pack.gold,gems:pack.gems});
                    const rarityClass = key === 'rainbow' ? 'legendary' : 'rare';
                    return `
                        <div class="card ${rarityClass}" onclick="UI.buyClassPack('${key}')" style="${!affordable ? 'opacity:0.5;cursor:not-allowed;' : ''}">
                            <div style="text-align:center;font-size:20px;margin-bottom:6px;">${pack.name.split(' ')[0]}</div>
                            <div class="card-name" style="color:${pack.color};font-size:9px;">${pack.name}</div>
                            <div class="card-class" style="font-size:7px;">${pack.desc}</div>
                            ${pack.guarantee ? `<div style="font-size:7px;color:#44ff88;margin-top:4px;">✅ Guaranteed ${pack.guarantee}+</div>` : ''}
                            <div style="font-size:8px;margin-top:8px;color:var(--gold);font-weight:700;">
                                ${pack.gold ? `💰 ${pack.gold}` : ''}${pack.gold && pack.gems ? ' + ' : ''}${pack.gems ? `💎 ${pack.gems}` : ''}
                            </div>
                            <div style="font-size:7px;color:var(--text-dim);margin-top:4px;">
                                ${key === 'rainbow' ? '🌈 1 of each class' : `${pack.count}x ${CLASSES[pack.classes[0]].name} cards`}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    // ===== HERO CATALOG (all 20 heroes) =====
    renderHeroCatalog(content) {
        const classOrder = ['warrior', 'mage', 'archer', 'healer', 'assassin'];
        const grouped = {};
        classOrder.forEach(cls => grouped[cls] = []);
        CARD_TEMPLATES.forEach(t => { if (grouped[t.cls]) grouped[t.cls].push(t); });

        content.innerHTML = `
            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:32px;">📖</div>
                <h3 style="font-size:11px;margin:8px 0;">Hero Catalog — ${CARD_TEMPLATES.length} Heroes</h3>
                <p style="font-size:7px;color:var(--text-dim);">All heroes obtainable from card packs!</p>
            </div>
            ${classOrder.map(cls => {
                const heroes = grouped[cls];
                const clsInfo = CLASSES[cls];
                return `
                    <div style="margin-bottom:16px;">
                        <div style="font-size:10px;color:${clsInfo.color};margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid ${clsInfo.color}33;">
                            ${clsInfo.emoji} ${clsInfo.name}s (${heroes.length})
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;">
                            ${heroes.map(hero => {
                                const totalStats = hero.hp + hero.atk + hero.def + hero.spd + hero.crit;
                                const defaultRarity = totalStats > 200 ? 'epic' : totalStats > 160 ? 'rare' : 'common';
                                const owned = GameState.collection.filter(c => c.templateId === hero.name || c.name === hero.name).length;
                                return `
                                    <div class="card ${defaultRarity}" style="cursor:default;">
                                        <div style="text-align:center;">
                                            <canvas class="catalog-sprite" data-hero="${hero.name}" width="48" height="48" style="image-rendering:pixelated;"></canvas>
                                        </div>
                                        <div class="card-name" style="color:${RARITIES[defaultRarity].color};font-size:8px;">${hero.name}</div>
                                        <div class="card-class" style="font-size:7px;">${clsInfo.emoji} ${clsInfo.name}</div>
                                        <div style="font-size:7px;display:flex;gap:4px;justify-content:center;margin-top:4px;">
                                            <span style="color:#44cc44">HP:${hero.hp}</span>
                                            <span style="color:#ff6644">ATK:${hero.atk}</span>
                                            <span style="color:#4488ff">DEF:${hero.def}</span>
                                            <span style="color:#ffaa00">SPD:${hero.spd}</span>
                                        </div>
                                        <div style="font-size:7px;color:var(--gem);margin-top:4px;">✨ ${hero.skill.name}</div>
                                        ${owned > 0 ? `<div style="font-size:7px;color:#44ff88;margin-top:2px;">✅ Owned: ${owned}</div>` : `<div style="font-size:6px;color:var(--text-dim);margin-top:2px;">Not owned</div>`}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        `;

        setTimeout(() => {
            document.querySelectorAll('.catalog-sprite').forEach(canvas => {
                const heroName = canvas.dataset.hero;
                const tmpl = CARD_TEMPLATES.find(t => t.name === heroName);
                if (tmpl && tmpl.image) {
                    const img = new Image();
                    img.onload = () => {
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingEnabled = false;
                        ctx.drawImage(img, 0, 0, 48, 48);
                    };
                    img.onerror = () => {
                        const card = { name: tmpl.name, class: tmpl.cls, rarity: 'common', stats: {hp:tmpl.hp,atk:tmpl.atk,def:tmpl.def,spd:tmpl.spd,crit:tmpl.crit}, artSeed: Math.floor(Math.random()*999999) };
                        if (typeof CardRenderer !== 'undefined') CardRenderer.drawCardSprite(canvas, card, 48);
                    };
                    img.src = tmpl.image;
                } else {
                    const card = { name: tmpl.name, class: tmpl.cls, rarity: 'common', stats: {hp:tmpl.hp,atk:tmpl.atk,def:tmpl.def,spd:tmpl.spd,crit:tmpl.crit}, artSeed: Math.floor(Math.random()*999999) };
                    if (typeof CardRenderer !== 'undefined') CardRenderer.drawCardSprite(canvas, card, 48);
                }
            });
        }, 50);
    },

    // ===== MARKETPLACE =====
    renderMarketplace(content) {
        this.marketListings = Economy.generateMarketListings(6);
        content.innerHTML = `
            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:32px;">🏪</div>
                <h3 style="font-size:11px;margin:8px 0;">Marketplace</h3>
                <p style="font-size:7px;color:var(--text-dim);">Buy cards from other collectors!</p>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;">
                ${this.marketListings.map((listing, i) => `
                    <div class="card ${listing.card.rarity}" onclick="UI.buyMarketItem(${i})">
                        <div style="text-align:center;">
                            <canvas id="market-card-${i}" width="48" height="48" style="image-rendering:pixelated;"></canvas>
                        </div>
                        <div class="card-name" style="color:${RARITIES[listing.card.rarity].color};font-size:8px;">${listing.card.name}</div>
                        <div class="card-class" style="font-size:7px;">${CLASSES[listing.card.class].emoji} ${CLASSES[listing.card.class].name}</div>
                        <div class="card-stats" style="font-size:7px;">
                            <span><span style="color:#888">PWR</span> <span style="color:var(--gold)">${getCardPower(listing.card)}</span></span>
                        </div>
                        <div style="font-size:7px;color:var(--text-dim);margin-top:4px;">Seller: ${listing.seller}</div>
                        <div style="text-align:center;margin-top:6px;">
                            <button class="btn btn-gold" style="font-size:7px;padding:4px 10px;">💰 ${listing.price}g</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        setTimeout(() => {
            this.marketListings.forEach((listing, i) => {
                const canvas = document.getElementById(`market-card-${i}`);
                if (canvas) CardRenderer.drawCardSprite(canvas, listing.card, 48);
            });
        }, 50);
    },

    // ===== BUY HANDLERS =====
    buyTierPack(tierKey) {
        const pack = Economy.TIER_PACKS[tierKey];
        if (!pack) return;
        if (!Economy.canAfford({gold:pack.gold,gems:pack.gems})) {
            this.toast('Not enough currency!', 'error');
            return;
        }
        const cards = Economy.buyTierPack(tierKey);
        if (!cards) return;
        this.updateHeader();
        PackAnimation.show(pack.name, cards);
    },

    buyClassPack(classKey) {
        const pack = Economy.CLASS_PACKS[classKey];
        if (!pack) return;
        if (!Economy.canAfford({gold:pack.gold,gems:pack.gems})) {
            this.toast('Not enough currency!', 'error');
            return;
        }
        const cards = Economy.buyClassPack(classKey);
        if (!cards) return;
        this.updateHeader();
        PackAnimation.show(pack.name, cards);
    },

    openPack(packType) {
        const cost = Economy.PACK_COSTS[packType];
        if (!Economy.canAfford(cost)) {
            this.toast('Not enough currency!', 'error');
            return;
        }

        const cards = Economy.buyPack(packType);
        if (!cards) return;

        this.updateHeader();
        PackAnimation.show(cost.name, cards);
    },

    buyMarketItem(index) {
        const listing = this.marketListings[index];
        if (!listing) return;
        if (GameState.player.gold < listing.price) {
            this.toast('Not enough gold!', 'error');
            return;
        }
        
        GameState.player.gold -= listing.price;
        GameState.addToCollection(listing.card);
        this.marketListings.splice(index, 1);
        
        this.toast(`Bought ${listing.card.name}!`, 'success');
        this.updateHeader();
        this.renderShopContent('marketplace');
    },

    buyDailyDeal(index) {
        const result = Economy.buyDailyDeal(index);
        if (result) {
            this.toast('Daily deal purchased!', 'success');
            this.updateHeader();
            this.renderShopContent('tiers');
        } else {
            this.toast('Not enough currency!', 'error');
        }
    },

    // ===== UNLOCK POPUP =====
    showUnlockPopup(unlock) {
        const overlay = document.createElement('div');
        overlay.className = 'unlock-overlay';
        
        let cardHTML = '';
        if (unlock.cards.length > 0) {
            const card = unlock.cards[0];
            const r = RARITIES[card.rarity];
            const cls = CLASSES[card.class];
            cardHTML = `
                <div class="unlock-card" style="border-color: ${r.color}; box-shadow: 0 0 30px ${r.color}44">
                    <div class="unlock-rarity" style="color: ${r.color}">${r.name}</div>
                    <div class="unlock-art">${cls.emoji}</div>
                    <div class="unlock-name">${card.name}</div>
                    <div class="unlock-class">${cls.emoji} ${cls.name}</div>
                    <div class="unlock-stats">HP:${card.stats.hp} ATK:${card.stats.atk} DEF:${card.stats.def}</div>
                    <div class="unlock-skill">✨ ${card.skill.name}</div>
                </div>
            `;
        }
        
        let rewardHTML = '';
        if (unlock.rewards.gold) rewardHTML += `<span class="unlock-reward">💰 ${unlock.rewards.gold} Gold</span>`;
        if (unlock.rewards.gems) rewardHTML += `<span class="unlock-reward">💎 ${unlock.rewards.gems} Gems</span>`;
        
        overlay.innerHTML = `
            <div class="unlock-modal">
                <div class="unlock-title">🎊 LEVEL ${GameState.player.level} UNLOCK!</div>
                <div class="unlock-desc">${unlock.desc}</div>
                ${cardHTML}
                ${rewardHTML ? `<div class="unlock-rewards">${rewardHTML}</div>` : ''}
                <button class="btn btn-gold unlock-btn" onclick="this.closest('.unlock-overlay').remove()">✨ AWESOME!</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Auto-close after 8s
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 8000);
    },

    // ===== TURN ORDER DISPLAY =====
    renderTurnOrder() {
        const container = document.getElementById('turn-order-display');
        if (!container) return; // element removed from DOM — no-op
        const turnOrder = BattleEngine.getNextTurnOrder(5);
        if (turnOrder.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = turnOrder.map((u, i) => {
            const arrow = i === 0 ? '👉 ' : '';
            const opacity = u.alive ? '1' : '0.3';
            const side = u.isAlly ? '#44cc44' : '#ff4444';
            return `<span class="turn-order-unit" style="opacity:${opacity}; color:${side}" title="${u.isAlly ? 'Ally' : 'Enemy'}">${arrow}${u.name}</span>`;
        }).join('');
    },

    // ===== ENEMY INFO PANEL =====
    showEnemyInfo(unit) {
        // Remove existing
        const old = document.querySelector('.enemy-info-popup');
        if (old) old.remove();

        const popup = document.createElement('div');
        popup.className = 'enemy-info-popup';
        const cls = CLASSES[unit.class] || {};
        popup.innerHTML = `
            <div class="enemy-info-header">${cls.emoji || '⚔️'} ${unit.name}</div>
            <div class="enemy-info-stats">
                <div>❤️ HP: ${unit.stats.hp}/${unit.stats.maxHp}</div>
                <div>⚔️ ATK: ${unit.stats.atk}</div>
                <div>🛡️ DEF: ${unit.stats.def}</div>
                <div>💨 SPD: ${unit.stats.spd}</div>
            </div>
            ${unit.skill ? `<div class="enemy-info-skill">✨ ${unit.skill.name}</div>` : ''}
            <div class="enemy-info-close">✕</div>
        `;
        document.body.appendChild(popup);
        popup.querySelector('.enemy-info-close').addEventListener('click', () => popup.remove());
        popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });
        setTimeout(() => { if (popup.parentNode) popup.remove(); }, 5000);
    },

    // ===== TOAST =====
    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.whiteSpace = 'pre-line';
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },
};
