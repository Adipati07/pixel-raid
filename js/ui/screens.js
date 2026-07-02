/* ========================================
 * PIXEL RAID — UI Screens & Interactions
 * ======================================== */

const UI = {
    currentScreen: 'battle',
    selectedCard: null,
    marketListings: [],
    _arrangeDragState: null,

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
        // Always re-enable start button when rendering battle screen
        const startBtn = document.getElementById('btn-start-battle');
        if (startBtn) startBtn.disabled = false;

        // Show deck preview when battle is not active
        this.renderBattleDeckPreview();

        // Update header stats
        const stageEl = document.getElementById('stage-number');
        if (stageEl) stageEl.textContent = GameState.player.stage;
        const waveEl = document.getElementById('wave-number');
        if (waveEl) waveEl.textContent = GameState.player.wave;
        const progressEl = document.getElementById('progress-fill');
        if (progressEl) {
            const progress = ((GameState.player.wave - 1) / GameState.player.maxWave) * 100;
            progressEl.style.width = progress + '%';
        }

        // Hide canvas when battle is not active
        const canvasContainer = document.getElementById('battle-canvas-container');
        if (canvasContainer) {
            if (typeof BattleEngine !== 'undefined' && BattleEngine.isRunning) {
                canvasContainer.style.display = '';
            } else {
                canvasContainer.style.display = 'none';
            }
        }

        // Hide card hand area when battle is not active
        const cardHandArea = document.getElementById('card-hand-area');
        if (cardHandArea) {
            if (typeof BattleEngine !== 'undefined' && BattleEngine.isRunning) {
                cardHandArea.style.display = '';
            } else {
                cardHandArea.style.display = 'none';
            }
        }
    },

    renderBattleDeckPreview() {
        const preview = document.getElementById('battle-deck-preview');
        if (!preview) return;

        if (typeof BattleEngine !== 'undefined' && BattleEngine.isRunning) {
            preview.style.display = 'none';
            return;
        }
        preview.style.display = '';

        const deckCards = GameState.getDeckCards();
        const skillCards = GameState.skillDeck.length > 0
            ? GameState.getSkillDeckCards()
            : SKILL_CARD_TEMPLATES.slice(0, 4).map(t => ({ ...t }));

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

        // Draw hero sprite
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

        // Default battle speed = 2x (fast)
        GameState.battleSpeed = 2;
    },

    startBattle() {
        const stage = GameState.player.stage;

        // Generate unit decks (10 cards each)
        const playerDeck = typeof generateUnitDeck === 'function' ? generateUnitDeck(10) : [];
        const enemyDeck = typeof generateEnemyUnitDeck === 'function' ? generateEnemyUnitDeck(stage) : [];

        if (playerDeck.length === 0) {
            this.toast('Error: Unit data not loaded!', 'error');
            return;
        }

        // Stop any previous battle
        BattleEngine.stop();

        // Show battle canvas container
        const battleContainer = document.getElementById('battle-canvas-container');
        if (battleContainer) battleContainer.style.display = 'block';

        // Go fullscreen for battle
        document.getElementById('screen-battle').classList.add('battle-active');

        // Init Phaser renderer and activate bridge
        BattlePhaser.init('battle-canvas-container');

        // Init card hand renderer
        if (typeof CardHand !== 'undefined') {
            CardHand.init('card-hand-area');
            // Wire up card click → play card to first empty board slot
            CardHand.onCardPlay = (handIndex, card) => {
                if (BattleEngine.currentPhase !== 'play') return;
                // Find first empty slot
                const board = BattleEngine.player.board;
                let emptySlot = -1;
                for (let i = 0; i < board.length; i++) {
                    if (board[i] === null) { emptySlot = i; break; }
                }
                if (emptySlot < 0) return; // board full
                const success = BattleEngine.playCard(handIndex, emptySlot);
                if (success) {
                    // Animate card out, then re-render
                    CardHand.animateCardPlay(handIndex, () => {
                        CardHand.renderHand(BattleEngine.player.hand, BattleEngine.player.energy);
                    });
                } else {
                    CardHand.shakeCard(handIndex);
                }
            };
        }

        // Create or update the action row for phase buttons
        this._ensureActionRow();

        // Create or update the phase bar
        this._ensurePhaseBar();

        // Wire up BattleEngine event handlers
        BattleEngine.onPhaseChange = (phase) => {
            this._updatePhaseBar(phase);
            this._updateActionButtons(phase);

            // Show phase banner in Phaser
            const phaseNames = {
                draw: 'DRAW', energy: 'ENERGY', play: 'PLAY',
                arrange: 'ARRANGE', battle: 'BATTLE', result: 'RESULT'
            };
            BattlePhaser.showPhaseBanner(phaseNames[phase] || phase.toUpperCase(), true);

            // Update Phaser hero panels
            if (BattleEngine.player && BattleEngine.enemy) {
                BattlePhaser.renderField(BattleEngine.player, BattleEngine.enemy);
            }
        };

        BattleEngine.onFieldUpdate = () => {
            BattlePhaser.renderField(BattleEngine.player, BattleEngine.enemy);

            // Re-render card hand if in play phase
            if (BattleEngine.currentPhase === 'play' && typeof CardHand !== 'undefined') {
                CardHand.renderHand(BattleEngine.player.hand, BattleEngine.player.energy);
            }

            // Update arrange UI if in arrange phase
            if (BattleEngine.currentPhase === 'arrange') {
                this._renderArrangeOverlay();
            }
        };

        BattleEngine.onAttack = (data) => {
            const attacker = data.attacker;
            const isPlayer = attacker.side === 'player';

            BattlePhaser.playAttack(0, 0, isPlayer, data.damage, false);

            // Update hero HP display
            if (data.targetIsHero) {
                const targetSide = data.targetSide;
                const combatant = targetSide === 'player' ? BattleEngine.player : BattleEngine.enemy;
                BattlePhaser.updateHeroHP(targetSide === 'player', combatant.heroHp, combatant.heroMaxHp);
            }
        };

        BattleEngine.onDraw = (card) => {
            if (typeof CardHand !== 'undefined') {
                CardHand.renderHand(BattleEngine.player.hand, BattleEngine.player.energy);
            }
        };

        // Start the battle engine FIRST so player/enemy objects exist
        BattleEngine.startBattle(playerDeck, enemyDeck, {
            playerName: 'You',
            enemyName: `Stage ${stage} Enemy`,
        });

        // NOW activate Phaser bridge with player/enemy data
        BattlePhaser.enter(BattleEngine.player, BattleEngine.enemy, null);

        // Handle battle completion (from result phase)
        BattleEngine.onComplete = (result) => {
            // Don't immediately exit — the result phase handles display
            // onComplete is called when user clicks "Continue"
        };
    },

    // ===== PHASE BAR =====
    _ensurePhaseBar() {
        let bar = document.getElementById('battle-phase-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'battle-phase-bar';
            bar.style.cssText = 'display:flex;justify-content:center;gap:4px;padding:6px 8px;background:rgba(10,10,26,0.95);border-bottom:1px solid rgba(255,215,0,0.2);';
            const container = document.getElementById('battle-canvas-container');
            if (container && container.parentElement) {
                container.parentElement.insertBefore(bar, container);
            }
        }

        const phases = [
            { key: 'draw', label: 'DRAW', icon: '🂠' },
            { key: 'energy', label: 'ENERGY', icon: '⚡' },
            { key: 'play', label: 'PLAY', icon: '🃏' },
            { key: 'arrange', label: 'ARRANGE', icon: '📐' },
            { key: 'battle', label: 'BATTLE', icon: '⚔️' },
            { key: 'result', label: 'RESULT', icon: '🏆' },
        ];

        bar.innerHTML = phases.map((p, i) => `
            <div class="phase-gem" data-phase="${p.key}" style="
                display:flex;flex-direction:column;align-items:center;gap:2px;
                padding:3px 6px;border-radius:4px;
                font-family:'Press Start 2P',monospace;font-size:6px;
                color:rgba(255,255,255,0.3);transition:all 0.3s;
                border:1px solid transparent;
            ">
                <span style="font-size:12px;">${p.icon}</span>
                <span>${p.label}</span>
            </div>
            ${i < phases.length - 1 ? '<div style="color:rgba(255,255,255,0.15);align-self:center;font-size:10px;">›</div>' : ''}
        `).join('');

        // Mark initial phase
        this._updatePhaseBar(BattleEngine.currentPhase);
    },

    _updatePhaseBar(phase) {
        const gems = document.querySelectorAll('#battle-phase-bar .phase-gem');
        const phaseOrder = ['draw', 'energy', 'play', 'arrange', 'battle', 'result'];
        const currentIdx = phaseOrder.indexOf(phase);

        gems.forEach(gem => {
            const gemPhase = gem.dataset.phase;
            const gemIdx = phaseOrder.indexOf(gemPhase);

            if (gemIdx < currentIdx) {
                // Completed
                gem.style.color = 'rgba(255,215,0,0.3)';
                gem.style.borderColor = 'rgba(255,215,0,0.15)';
                gem.style.background = 'transparent';
            } else if (gemIdx === currentIdx) {
                // Active — gold glow
                gem.style.color = '#ffd700';
                gem.style.borderColor = '#ffd700';
                gem.style.background = 'rgba(255,215,0,0.12)';
                gem.style.boxShadow = '0 0 8px rgba(255,215,0,0.4)';
            } else {
                // Upcoming
                gem.style.color = 'rgba(255,255,255,0.3)';
                gem.style.borderColor = 'transparent';
                gem.style.background = 'transparent';
                gem.style.boxShadow = 'none';
            }
        });
    },

    // ===== ACTION BUTTONS =====
    _ensureActionRow() {
        let row = document.querySelector('.battle-action-row');
        if (!row) {
            row = document.createElement('div');
            row.className = 'battle-action-row';
            row.style.cssText = 'display:flex;justify-content:center;gap:8px;padding:4px 0;background:rgba(10,10,26,0.9);';
            const container = document.getElementById('battle-canvas-container');
            if (container && container.parentElement) {
                container.parentElement.appendChild(row);
            }
        }
        this._updateActionButtons('draw');
    },

    _updateActionButtons(phase) {
        const row = document.querySelector('.battle-action-row');
        if (!row) return;

        if (phase === 'play') {
            row.innerHTML = `
                <button class="btn btn-gold" id="btn-done-playing" onclick="BattleEngine.advancePhase(); UI._updateActionButtons(BattleEngine.currentPhase);">
                    ✅ Done Playing
                </button>
            `;
            row.style.display = 'flex';
        } else if (phase === 'arrange') {
            row.innerHTML = `
                <button class="btn btn-gold" id="btn-end-turn" onclick="BattleEngine.advancePhase(); UI._updateActionButtons(BattleEngine.currentPhase);">
                    ⚔️ End Turn
                </button>
            `;
            row.style.display = 'flex';
        } else if (phase === 'result') {
            this._renderResultScreen();
            row.style.display = 'none';
        } else {
            row.innerHTML = '';
            row.style.display = 'none';
        }
    },

    // ===== ARRANGE PHASE OVERLAY =====
    _renderArrangeOverlay() {
        // Show/hide the arrange instruction overlay on Phaser canvas area
        let overlay = document.getElementById('arrange-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'arrange-overlay';
            overlay.style.cssText = `
                position:absolute;top:0;left:0;right:0;bottom:0;
                pointer-events:none;z-index:10001;
                display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
                padding-top:8px;
            `;
            const canvasContainer = document.getElementById('battle-canvas-container');
            if (canvasContainer) {
                canvasContainer.style.position = 'relative';
                canvasContainer.appendChild(overlay);
            }
        }

        if (BattleEngine.currentPhase !== 'arrange') {
            overlay.style.display = 'none';
            return;
        }

        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div style="
                background:rgba(10,10,30,0.85);border:1px solid rgba(255,215,0,0.3);
                padding:6px 16px;border-radius:6px;font-family:'Press Start 2P',monospace;
                font-size:8px;color:#ffd700;text-align:center;
                pointer-events:auto;
            ">
                📐 Drag units to rearrange positions
            </div>
        `;
    },

    // ===== RESULT SCREEN =====
    _renderResultScreen() {
        const result = BattleEngine._checkWinLose();
        const isWin = result === 'player';

        // Create result overlay
        let overlay = document.getElementById('battle-result-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'battle-result-overlay';
            overlay.style.cssText = `
                position:fixed;top:0;left:0;right:0;bottom:0;
                z-index:99999;display:flex;align-items:center;justify-content:center;
                background:rgba(0,0,0,0.7);animation:fadeIn 0.3s ease;
            `;
            document.body.appendChild(overlay);
        }

        overlay.style.display = 'flex';

        const stage = GameState.player.stage;
        let rewardHTML = '';
        if (isWin) {
            const goldReward = 50 + stage * 20;
            rewardHTML = `
                <div style="margin:12px 0;font-size:10px;color:#ffd700;">
                    💰 +${goldReward} Gold
                </div>
            `;
        }

        overlay.innerHTML = `
            <div style="
                background:linear-gradient(135deg,#0a0a2e,#141432);
                border:2px solid ${isWin ? '#ffd700' : '#ff4444'};
                border-radius:12px;padding:24px 32px;text-align:center;
                max-width:320px;width:90%;box-shadow:0 0 30px ${isWin ? 'rgba(255,215,0,0.3)' : 'rgba(255,68,68,0.3)'};
            ">
                <div style="font-family:'Press Start 2P',monospace;font-size:18px;color:${isWin ? '#ffd700' : '#ff4444'};margin-bottom:12px;text-shadow:0 0 10px ${isWin ? 'rgba(255,215,0,0.5)' : 'rgba(255,68,68,0.5)'};">
                    ${isWin ? '🎉 Victory!' : '💀 Defeat!'}
                </div>
                <div style="font-size:9px;color:rgba(255,255,255,0.6);margin-bottom:8px;">
                    Turn ${BattleEngine.turnNumber}
                </div>
                ${rewardHTML}
                <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
                    <button class="btn btn-gold" onclick="UI._handleBattleResult('${isWin ? 'win' : 'lose'}')">
                        ${isWin ? '▶ Continue' : '🔄 Retry'}
                    </button>
                    ${isWin ? '' : '<button class="btn btn-secondary" onclick="UI._handleBattleResult(\'back\')">Back</button>'}
                </div>
            </div>
        `;
    },

    _handleBattleResult(type) {
        // Remove overlay
        const overlay = document.getElementById('battle-result-overlay');
        if (overlay) overlay.remove();

        // Remove arrange overlay
        const arrangeOverlay = document.getElementById('arrange-overlay');
        if (arrangeOverlay) arrangeOverlay.remove();

        // Remove phase bar
        const phaseBar = document.getElementById('battle-phase-bar');
        if (phaseBar) phaseBar.remove();

        // Remove action row content
        const actionRow = document.querySelector('.battle-action-row');
        if (actionRow) { actionRow.innerHTML = ''; actionRow.style.display = 'none'; }

        const stage = GameState.player.stage;
        const battleContainer = document.getElementById('battle-canvas-container');

        if (type === 'win') {
            // Generate and apply win rewards using Rewards system
            const rewards = Rewards.generateWinRewards(stage);
            Rewards.applyWinRewards(rewards);

            // Stage progression
            if (GameState.player.wave < GameState.player.maxWave) {
                GameState.player.wave++;
            } else {
                // Also process economy stage reward for packs/items
                const ecoRewards = Economy.processStageReward(stage);
                GameState.player.stage++;
                GameState.player.wave = 1;
                GameState.stats.highestStage = Math.max(GameState.stats.highestStage, GameState.player.stage);
            }

            // Show reward popup with new cards
            Rewards.showRewardPopup(true, rewards, stage);
        } else if (type === 'lose') {
            // Generate and apply loss rewards
            const rewards = Rewards.generateLossRewards(stage);
            Rewards.applyLossRewards(rewards);

            // Show defeat popup with consolation gold
            Rewards.showRewardPopup(false, rewards, stage);
        } else {
            // Back button - just clean up
            BattlePhaser.exit();
            if (battleContainer) battleContainer.style.display = 'none';
            document.getElementById('screen-battle').classList.remove('battle-active');
            BattleEngine.stop();
            UI.updateHeader();
            UI.renderBattleScreen();
        }

        // Update header in all cases
        this.updateHeader();
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
    // ===== SPRINT 3: ENHANCED COLLECTION SCREEN =====
    renderHeroesScreen() {
        const grid = document.getElementById('hero-list');
        grid.innerHTML = '';

        // Build set of owned template IDs for quick lookup
        const ownedTemplates = new Set();
        GameState.collection.forEach(c => {
            ownedTemplates.add(c.templateId || c.name);
        });

        // Count unique owned templates
        const ownedCount = ownedTemplates.size;
        const totalCount = CARD_TEMPLATES.length;

        // Header: owned counter
        const header = document.createElement('div');
        header.style.cssText = 'font-family:"Press Start 2P";font-size:9px;color:var(--gold);margin-bottom:12px;text-align:center;';
        header.innerHTML = `🃏 Collection — <span style="color:#44ff88">${ownedCount}</span>/${totalCount} Heroes`;
        grid.appendChild(header);
        // Show all 20 templates: owned cards full detail, locked as silhouettes
        CARD_TEMPLATES.forEach(tmpl => {
            const ownedCard = GameState.collection.find(c => (c.templateId || c.name) === tmpl.name);
            const isOwned = !!ownedCard;

            const el = document.createElement('div');
            el.style.minHeight = '120px';

            if (isOwned) {
                // Full card with stats
                const card = ownedCard;
                el.className = `card ${card.rarity}`;
                el.onclick = () => this.showHeroDetail(card);

                const template = getTemplateByName(card.templateId || card.name);
                let sprite;
                if (template && template.image) {
                    sprite = document.createElement('img');
                    sprite.className = 'card-sprite';
                    sprite.width = 48; sprite.height = 48;
                    sprite.style.imageRendering = 'pixelated';
                    sprite.src = template.image;
                    sprite.onerror = function() {
                        const cvs = document.createElement('canvas');
                        cvs.className = 'card-sprite'; cvs.width = 48; cvs.height = 48;
                        CardRenderer.drawCardSprite(cvs, card, 48);
                        sprite.replaceWith(cvs);
                    };
                } else {
                    sprite = document.createElement('canvas');
                    sprite.className = 'card-sprite'; sprite.width = 48; sprite.height = 48;
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
                `).join('') + `<div class="card-power">⚡ ${getCardPower(card)}</div>`;

                el.appendChild(sprite);
                el.appendChild(name);
                el.appendChild(cls);
                el.appendChild(stats);
            } else {
                // Locked silhouette
                el.className = 'card common';
                el.style.cssText += 'opacity:0.5;filter:grayscale(0.8);cursor:pointer;';
                el.onclick = () => this.toast('🔒 Unlock from battle rewards or packs!', 'info');

                const lockIcon = document.createElement('div');
                lockIcon.style.cssText = 'text-align:center;font-size:28px;margin-bottom:4px;';
                lockIcon.textContent = '🔒';

                const name = document.createElement('div');
                name.className = 'card-name';
                name.style.color = '#666';
                name.textContent = '???';

                const cls = document.createElement('div');
                cls.className = 'card-class';
                cls.textContent = CLASSES[tmpl.cls]?.emoji + ' ' + (CLASSES[tmpl.cls]?.name || tmpl.cls);
                cls.style.color = '#555';

                const stats = document.createElement('div');
                stats.className = 'card-stats';
                stats.style.color = '#444';
                stats.innerHTML = '<span>HP:?</span><span>ATK:?</span><span>DEF:?</span><span>SPD:?</span>';

                el.appendChild(lockIcon);
                el.appendChild(name);
                el.appendChild(cls);
                el.appendChild(stats);
            }
            grid.appendChild(el);
        });
    },

    showHeroDetail(card) {
        // Remove any existing detail modal
        const old = document.getElementById('hero-detail-modal');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'hero-detail-modal';
        overlay.style.cssText = `
            position:fixed;top:0;left:0;right:0;bottom:0;
            z-index:99999;display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,0.75);animation:s3FadeIn 0.2s ease;
        `;
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        const r = RARITIES[card.rarity] || {};
        const cls = CLASSES[card.class] || {};
        const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
        const stars = '★'.repeat((rarityOrder[card.rarity] || 0) + 1);
        const skillDesc = card.skill ? card.skill.name + (card.skill.chance ? ` (${Math.floor(card.skill.chance * 100)}% chance)` : '') : 'None';

        const maxHP = 140, maxATK = 38, maxDEF = 25, maxSPD = 24;
        const statBars = [
            { label: 'HP', val: card.stats.hp, max: maxHP, color: '#44cc44' },
            { label: 'ATK', val: card.stats.atk, max: maxATK, color: '#ff6644' },
            { label: 'DEF', val: card.stats.def, max: maxDEF, color: '#4488ff' },
            { label: 'SPD', val: card.stats.spd, max: maxSPD, color: '#ffaa00' },
        ];

        const spriteContainerId = 'detail-sprite-container';

        overlay.innerHTML = `
            <div style="
                background:linear-gradient(135deg,#0a0a2e,#141432);
                border:2px solid ${r.color || '#888'};
                border-radius:12px;padding:20px 24px;text-align:center;
                max-width:320px;width:90%;box-shadow:0 0 30px ${r.color || '#888'}44;
                max-height:90vh;overflow-y:auto;
            ">
                <div id="${spriteContainerId}" style="width:80px;height:80px;margin:0 auto 8px;"></div>
                <div style="font-family:'Press Start 2P';font-size:10px;color:${r.color};margin-bottom:4px;">
                    ${card.name}${card.level > 1 ? ` Lv.${card.level}` : ''}
                </div>
                <div style="font-size:7px;color:${r.color};margin-bottom:4px;">${stars} ${r.name}</div>
                <div style="font-size:8px;color:${cls.color};margin-bottom:12px;">
                    ${cls.emoji} ${cls.name}
                </div>
                <div style="text-align:left;margin-bottom:12px;">
                    ${statBars.map(s => `
                        <div style="display:flex;align-items:center;gap:6px;margin:3px 0;">
                            <span style="font-size:7px;color:${s.color};width:28px;">${s.label}</span>
                            <div style="flex:1;height:8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);">
                                <div style="width:${Math.min(100, (s.val / s.max) * 100)}%;height:100%;background:${s.color};"></div>
                            </div>
                            <span style="font-size:7px;color:${s.color};width:24px;text-align:right;">${s.val}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="font-size:8px;color:#88ccff;margin-bottom:4px;">
                    ⚡ Power: ${getCardPower(card)}
                </div>
                <div style="font-size:7px;color:#bbddbb;margin-bottom:12px;">
                    ✨ ${skillDesc}
                </div>
                ${card.level > 1 && card.expToNext ? `
                    <div style="margin-bottom:12px;">
                        <div style="font-size:6px;color:var(--text-dim);margin-bottom:2px;">EXP ${card.exp}/${card.expToNext}</div>
                        <div style="height:4px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);">
                            <div style="width:${Math.min(100, (card.exp / card.expToNext) * 100)}%;height:100%;background:#88ccff;"></div>
                        </div>
                    </div>
                ` : ''}
                <button class="btn btn-gold" onclick="document.getElementById('hero-detail-modal').remove()"
                    style="min-height:44px;min-width:100px;">✕ Close</button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Draw sprite
        setTimeout(() => {
            const container = document.getElementById(spriteContainerId);
            if (!container) return;
            const template = getTemplateByName(card.templateId || card.name);
            if (template && template.image) {
                const img = new Image();
                img.width = 80; img.height = 80;
                img.style.imageRendering = 'pixelated';
                img.onload = () => {
                    container.innerHTML = '';
                    container.appendChild(img);
                };
                img.onerror = () => {
                    const cvs = document.createElement('canvas');
                    cvs.width = 80; cvs.height = 80;
                    CardRenderer.drawCardSprite(cvs, card, 80);
                    container.innerHTML = '';
                    container.appendChild(cvs);
                };
                img.src = template.image;
            } else if (typeof CardRenderer !== 'undefined') {
                const cvs = document.createElement('canvas');
                cvs.width = 80; cvs.height = 80;
                CardRenderer.drawCardSprite(cvs, card, 80);
                container.innerHTML = '';
                container.appendChild(cvs);
            }
        }, 50);
    },

    // ===== STRATEGY / FORMATION SCREEN =====
    renderStrategyScreen() {
        const container = document.getElementById('strategy-content');
        if (!container) return;

        let html = '';

        // Section A: Hero Selection
        html += this._renderHeroSelectionGrid();

        // Section B: Skill Deck Builder
        html += this._renderSkillDeckBuilder();

        // Section C: Active Deck Summary
        html += this._renderDeckSummary();

        container.innerHTML = html;

        // Draw sprites after DOM update
        setTimeout(() => {
            container.querySelectorAll('.strategy-hero-sprite').forEach(canvas => {
                const heroName = canvas.dataset.hero;
                const hero = GameState.collection.find(c => c.name === heroName);
                if (hero && typeof CardRenderer !== 'undefined') {
                    CardRenderer.drawCardSprite(canvas, hero, 48);
                }
            });
        }, 50);
    },

    /**
     * Section A: Hero Selection Grid — show all 20, only owned are clickable
     */
    _renderHeroSelectionGrid() {
        const deckCards = GameState.getDeckCards();
        const currentHero = deckCards.length > 0 ? deckCards[0] : null;

        // Count owned
        const ownedTemplates = new Set();
        GameState.collection.forEach(c => ownedTemplates.add(c.templateId || c.name));

        let html = `
            <div style="font-family:'Press Start 2P';font-size:8px;color:var(--gold);margin-bottom:8px;">
                🦸 SELECT BATTLE HERO — <span style="color:#44ff88">${ownedTemplates.size}</span>/${CARD_TEMPLATES.length} owned
            </div>
            <div class="strategy-hero-grid">
        `;

        // Show all 20 templates
        CARD_TEMPLATES.forEach(tmpl => {
            const ownedCard = GameState.collection.find(c => (c.templateId || c.name) === tmpl.name);
            const isOwned = !!ownedCard;
            const isActive = currentHero && ownedCard && currentHero.id === ownedCard.id;
            const cls = CLASSES[tmpl.cls] || {};

            if (isOwned) {
                const card = ownedCard;
                const r = RARITIES[card.rarity] || {};
                html += `
                    <div class="strategy-hero-card ${isActive ? 'active' : ''}" onclick="UI._selectBattleHero(${card.id})">
                        <canvas class="strategy-hero-sprite" data-hero="${card.name}" width="48" height="48" style="image-rendering:pixelated;"></canvas>
                        <div style="font-size:9px;color:${r.color};font-weight:700;">${card.name}</div>
                        <div style="font-size:8px;color:${cls.color};">${cls.emoji} ${cls.name}</div>
                        ${isActive ? '<div style="font-size:8px;color:#44ff88;">✅ Active</div>' : ''}
                    </div>
                `;
            } else {
                html += `
                    <div class="strategy-hero-card" style="opacity:0.4;filter:grayscale(0.7);cursor:not-allowed;">
                        <div style="font-size:24px;text-align:center;line-height:48px;">🔒</div>
                        <div style="font-size:9px;color:#666;font-weight:700;">???</div>
                        <div style="font-size:8px;color:${cls.color};">${cls.emoji} ${cls.name}</div>
                    </div>
                `;
            }
        });

        html += '</div>';
        return html;
    },

    /**
     * Select a hero as the active battle hero
     */
    _selectBattleHero(cardId) {
        GameState.deck = [cardId];
        GameState.collection.forEach(c => c.inDeck = (c.id === cardId));
        GameState.save();
        this.renderStrategyScreen();
        this.toast('Battle hero updated!', 'success');
    },

    /**
     * Section B: Skill Deck Builder — pick up to 4 skill cards
     */
    _renderSkillDeckBuilder() {
        let html = `
            <div style="font-family:'Press Start 2P';font-size:8px;color:var(--gold);margin:16px 0 8px;">
                🃏 SKILL DECK (Max 4)
            </div>
            <div class="strategy-skill-grid">
        `;

        SKILL_CARD_TEMPLATES.forEach(card => {
            const inDeck = (GameState.skillDeck || []).includes(card.id);
            const cardType = CARD_TYPES[card.type] || {};
            const rarityColor = RARITIES[card.rarity]?.color || '#aaa';
            html += `
                <div class="strategy-skill-card ${inDeck ? 'selected' : ''}" onclick="UI._toggleSkillCard('${card.id}')">
                    <div style="font-size:9px;color:${rarityColor};font-weight:700;">${card.name}</div>
                    <div style="display:flex;gap:6px;font-size:8px;align-items:center;margin-top:2px;">
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
            deck.splice(idx, 1);
            GameState.skillDeck = deck;
        } else {
            if (deck.length >= 4) {
                this.toast('Skill deck is full! (Max 4 cards)', 'error');
                return;
            }
            deck.push(cardId);
            GameState.skillDeck = deck;
        }

        GameState.save();
        // Re-render full strategy screen so synergy info updates
        this.renderStrategyScreen();
    },

    /**
     * Section C: Active Deck Summary with synergy info and Ready to Battle button
     */
    _renderDeckSummary() {
        const deckCards = GameState.getDeckCards();
        const skillCards = (GameState.skillDeck && GameState.skillDeck.length > 0)
            ? GameState.getSkillDeckCards()
            : SKILL_CARD_TEMPLATES.slice(0, 4);

        let html = `
            <div style="font-family:'Press Start 2P';font-size:8px;color:var(--gold);margin:16px 0 8px;">
                📋 ACTIVE DECK SUMMARY
            </div>
            <div class="strategy-deck-summary">
        `;

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

        // Synergy info
        if (deckCards.length > 0) {
            const hero = deckCards[0];
            const cls = CLASSES[hero.class];
            if (cls) {
                // Count skill types for synergy
                const typeCounts = {};
                skillCards.forEach(s => {
                    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
                });
                const synergies = [];
                if (hero.class === 'warrior' && typeCounts.defense) synergies.push({ text: '🛡️ Tank Build — bonus DEF from defense skills', color: '#ff6644' });
                if (hero.class === 'mage' && typeCounts.attack) synergies.push({ text: '🔥 Burst Mage — extra damage from attack skills', color: '#8844ff' });
                if (hero.class === 'archer' && typeCounts.special) synergies.push({ text: '🎯 Precision — crit chance from special skills', color: '#44cc88' });
                if (hero.class === 'healer' && typeCounts.buff) synergies.push({ text: '💚 Sustain — enhanced healing from buff skills', color: '#44ffaa' });
                if (hero.class === 'assassin' && typeCounts.attack) synergies.push({ text: '🗡️ Lethal Strike — burst from attack skills', color: '#ff4488' });
                if (typeCounts.special >= 2) synergies.push({ text: '⚡ Special Mastery — bonus with 2+ special skills', color: '#ffd700' });
                if (typeCounts.attack >= 2) synergies.push({ text: '⚔️ Aggressor — 2+ attack skills boost ATK', color: '#ff6644' });

                html += `
                    <div class="strategy-synergy-info">
                        <span style="color:${cls.color};font-size:7px;">${cls.emoji} ${cls.name} — ${skillCards.length} skills equipped</span>
                `;
                if (synergies.length > 0) {
                    synergies.forEach(s => {
                        html += `<div style="font-size:6px;color:${s.color};margin-top:3px;">${s.text}</div>`;
                    });
                } else {
                    html += `<div style="font-size:6px;color:var(--text-dim);margin-top:3px;">Mix skill types for synergies!</div>`;
                }
                html += '</div>';
            }
        }

        html += '</div>';

        // Ready to Battle button
        const hasHero = deckCards.length > 0;
        const hasSkills = skillCards.length > 0;
        if (hasHero && hasSkills) {
            html += `
                <div style="text-align:center;margin-top:16px;">
                    <button class="btn btn-gold" onclick="UI._readyToBattle()" style="min-height:48px;padding:12px 32px;font-size:10px;">
                        ⚔️ Ready to Battle!
                    </button>
                </div>
            `;
        }

        // Battle Deck Preview below
        html += this.renderBattleDeckPreview();

        return html;
    },

    /**
     * Go to battle screen with current deck
     */
    _readyToBattle() {
        const deckCards = GameState.getDeckCards();
        if (deckCards.length === 0) {
            this.toast('Select a hero first!', 'error');
            return;
        }
        this.showScreen('battle');
        this.toast('⚔️ Deck ready! Start the battle!', 'info');
    },

    /**
     * Show current deck hero + skill cards in battle preview
     */
    renderBattleDeckPreview() {
        const deckCards = GameState.getDeckCards();
        const skillCards = (GameState.skillDeck && GameState.skillDeck.length > 0)
            ? GameState.getSkillDeckCards()
            : SKILL_CARD_TEMPLATES.slice(0, 4);

        if (deckCards.length === 0) return '';

        const hero = deckCards[0];
        const cls = CLASSES[hero.class] || {};
        const r = RARITIES[hero.rarity] || {};
        const typeIcons = { attack: '⚔️', defense: '🛡️', buff: '✨', debuff: '💀', special: '⚡' };

        let html = `
            <div style="margin-top:16px;padding:12px;background:rgba(0,0,0,0.3);border:1px solid var(--border-color);border-radius:8px;">
                <div style="font-family:'Press Start 2P';font-size:7px;color:var(--gold);margin-bottom:8px;">
                    📦 BATTLE DECK PREVIEW
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <div style="text-align:center;min-width:60px;">
                        <div style="font-size:20px;">${cls.emoji || '🦸'}</div>
                        <div style="font-size:6px;color:${r.color};font-weight:700;">${hero.name}</div>
                        <div style="font-size:6px;color:${cls.color};">${cls.name}</div>
                    </div>
                    <div style="font-size:16px;color:#555;">→</div>
        `;
        skillCards.forEach(s => {
            const sColor = RARITIES[s.rarity]?.color || '#aaa';
            html += `
                <div style="text-align:center;min-width:48px;padding:4px 6px;background:var(--bg-card);border:1px solid ${sColor};border-radius:4px;">
                    <div style="font-size:12px;">${typeIcons[s.type] || '🃏'}</div>
                    <div style="font-size:5px;color:${sColor};">${s.name}</div>
                </div>
            `;
        });
        html += `
                </div>
            </div>
        `;
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
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 8000);
    },

    renderTurnOrder() {
        const container = document.getElementById('turn-order-display');
        if (!container) return;
        container.innerHTML = '';
    },

    showEnemyInfo(unit) {
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