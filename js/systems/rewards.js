/* ========================================
 * PIXEL RAID — Battle Rewards System (Sprint 3)
 * Handles post-battle rewards: cards, gold, XP
 * ======================================== */

const Rewards = {
    /**
     * Generate rewards after winning a battle
     * @param {number} stage - Current stage number
     * @returns {{ gold: number, cards: Array, heroExp: number }}
     */
    generateWinRewards(stage) {
        const rewards = {
            gold: 20 + (stage * 10),
            cards: [],
            heroExp: 10 + stage * 5,
        };

        // Determine number of cards based on stage
        let cardCount = 1;
        let maxRarity = 'common';

        if (stage >= 6 && stage <= 10) {
            cardCount = Math.random() < 0.5 ? 2 : 1;
            maxRarity = Math.random() < 0.25 ? 'rare' : 'common';
        } else if (stage >= 11) {
            cardCount = Math.floor(Math.random() * 2) + 2; // 2-3 cards
            const roll = Math.random();
            if (roll < 0.15) maxRarity = 'epic';
            else if (roll < 0.45) maxRarity = 'rare';
            else maxRarity = 'common';
        }

        // Generate cards
        for (let i = 0; i < cardCount; i++) {
            let rarity = 'common';
            if (maxRarity === 'epic') {
                const r = Math.random();
                rarity = r < 0.15 ? 'epic' : r < 0.45 ? 'rare' : 'common';
            } else if (maxRarity === 'rare') {
                rarity = Math.random() < 0.35 ? 'rare' : 'common';
            }
            // Pick a random template
            const tmpl = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
            const card = generateCard(tmpl, rarity);
            rewards.cards.push(card);
        }

        // Add random bonus gold (0-20% of base)
        rewards.gold += Math.floor(Math.random() * (rewards.gold * 0.2));

        return rewards;
    },

    /**
     * Generate consolation rewards for losing
     * @param {number} stage - Current stage number
     * @returns {{ gold: number }}
     */
    generateLossRewards(stage) {
        return {
            gold: 5 + stage * 2,
        };
    },

    /**
     * Apply win rewards to game state
     * @param {{ gold: number, cards: Array, heroExp: number }} rewards
     */
    applyWinRewards(rewards) {
        // Add gold
        GameState.player.gold += rewards.gold;

        // Add cards to collection
        rewards.cards.forEach(card => {
            GameState.addToCollection(card);
        });

        // Add XP to the hero card in the active deck
        if (GameState.deck.length > 0) {
            const heroCard = GameState.getCardById(GameState.deck[0]);
            if (heroCard) {
                this._addHeroExp(heroCard, rewards.heroExp);
            }
        }

        GameState.stats.battlesWon++;
        GameState.save();
    },

    /**
     * Apply loss rewards to game state
     * @param {{ gold: number }} rewards
     */
    applyLossRewards(rewards) {
        GameState.player.gold += rewards.gold;
        GameState.stats.battlesLost++;
        GameState.save();
    },

    /**
     * Add XP to a hero card, handle level ups
     * @param {Object} card - Hero card object
     * @param {number} exp - XP to add
     */
    _addHeroExp(card, exp) {
        card.exp = (card.exp || 0) + exp;
        card.expToNext = card.expToNext || (card.level * 50);

        // Level up loop
        while (card.exp >= card.expToNext) {
            card.exp -= card.expToNext;
            card.level = (card.level || 1) + 1;
            card.expToNext = card.level * 50;

            // Stat gains per level
            const rarityMult = { common: 1, rare: 1.2, epic: 1.5, legendary: 2, mythic: 2.5 };
            const mult = rarityMult[card.rarity] || 1;
            card.stats.maxHp += Math.floor(3 * mult);
            card.stats.hp = card.stats.maxHp;
            card.stats.atk += Math.floor(1.5 * mult);
            card.stats.def += Math.floor(1 * mult);
            card.stats.spd += Math.floor(0.5 * mult);
        }
    },

    /**
     * Show the reward popup after a battle
     * @param {boolean} isWin - Whether the player won
     * @param {{ gold: number, cards?: Array, heroExp?: number }} rewards
     * @param {number} stage - Current stage number
     */
    showRewardPopup(isWin, rewards, stage) {
        // Remove any existing overlays
        const oldOverlay = document.getElementById('battle-result-overlay');
        if (oldOverlay) oldOverlay.remove();
        const oldResult = document.getElementById('sprint3-reward-overlay');
        if (oldResult) oldResult.remove();

        const overlay = document.createElement('div');
        overlay.id = 'sprint3-reward-overlay';
        overlay.style.cssText = `
            position:fixed;top:0;left:0;right:0;bottom:0;
            z-index:99999;display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,0.8);animation:s3FadeIn 0.3s ease;
        `;

        const borderColor = isWin ? '#ffd700' : '#ff4444';
        const glowColor = isWin ? 'rgba(255,215,0,0.3)' : 'rgba(255,68,68,0.3)';

        let contentHTML = `
            <div style="
                background:linear-gradient(135deg,#0a0a2e,#141432);
                border:2px solid ${borderColor};
                border-radius:12px;padding:24px 32px;text-align:center;
                max-width:360px;width:92%;box-shadow:0 0 40px ${glowColor};
            ">
                <div style="font-family:'Press Start 2P',monospace;font-size:16px;color:${borderColor};
                    margin-bottom:8px;text-shadow:0 0 10px ${glowColor};">
                    ${isWin ? '🎉 Victory!' : '💀 Defeated!'}
                </div>
                <div style="font-size:8px;color:var(--text-dim);margin-bottom:16px;">
                    Stage ${stage} — Turn ${BattleEngine.turnNumber}
                </div>
        `;

        // Gold reward
        contentHTML += `
            <div style="font-size:11px;color:#ffd700;margin-bottom:8px;
                font-family:'Press Start 2P',monospace;">
                💰 +${rewards.gold} Gold
            </div>
        `;

        // XP reward (win only)
        if (isWin && rewards.heroExp) {
            contentHTML += `
                <div style="font-size:9px;color:#88ccff;margin-bottom:12px;">
                    ⭐ +${rewards.heroExp} Hero EXP
                </div>
            `;
        }

        // Card rewards (win only)
        if (isWin && rewards.cards && rewards.cards.length > 0) {
            contentHTML += `
                <div style="font-size:8px;color:var(--text-dim);margin-bottom:8px;">
                    🃏 New Card${rewards.cards.length > 1 ? 's' : ''}!
                </div>
                <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;">
            `;
            rewards.cards.forEach((card, i) => {
                const rColor = RARITIES[card.rarity]?.color || '#aaa';
                const cls = CLASSES[card.class] || {};
                contentHTML += `
                    <div class="s3-card-reveal" style="
                        background:var(--bg-card);border:2px solid ${rColor};
                        padding:10px 12px;min-width:110px;
                        animation:s3CardReveal 0.6s ease ${0.3 + i * 0.3}s both;
                        box-shadow:0 0 12px ${rColor}44;
                    ">
                        <div style="font-size:14px;">${cls.emoji || '🦸'}</div>
                        <div style="font-family:'Press Start 2P';font-size:6px;color:${rColor};
                            margin-top:4px;">${card.name}</div>
                        <div style="font-size:6px;color:var(--text-dim);">
                            ${cls.name || card.class} • ${RARITIES[card.rarity]?.name || card.rarity}
                        </div>
                        <div style="font-size:6px;margin-top:4px;display:flex;gap:4px;justify-content:center;">
                            <span style="color:#44cc44">HP:${card.stats.hp}</span>
                            <span style="color:#ff6644">ATK:${card.stats.atk}</span>
                        </div>
                    </div>
                `;
            });
            contentHTML += '</div>';
        }

        // Defeat tip
        if (!isWin) {
            contentHTML += `
                <div style="font-size:7px;color:var(--text-dim);margin-bottom:12px;">
                    💡 Try upgrading cards or changing your skill deck!
                </div>
            `;
        }

        // Buttons
        contentHTML += `
                <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;">
                    <button class="btn btn-gold" onclick="RewardPopup.close('${isWin ? 'continue' : 'retry'}')"
                        style="min-width:100px;min-height:44px;">
                        ${isWin ? '▶ Continue' : '🔄 Try Again'}
                    </button>
                    ${!isWin ? `<button class="btn btn-secondary"
                        onclick="RewardPopup.close('back')"
                        style="min-height:44px;">Back</button>` : ''}
                </div>
            </div>
        `;

        overlay.innerHTML = contentHTML;
        document.body.appendChild(overlay);
    },
};

/* ========================================
 * Reward Popup Controller
 * Handles closing the popup and transitioning
 * ======================================== */
const RewardPopup = {
    close(action) {
        const overlay = document.getElementById('sprint3-reward-overlay');
        if (overlay) overlay.remove();

        // Clean up battle UI
        const arrangeOverlay = document.getElementById('arrange-overlay');
        if (arrangeOverlay) arrangeOverlay.remove();
        const phaseBar = document.getElementById('battle-phase-bar');
        if (phaseBar) phaseBar.remove();
        const actionRow = document.querySelector('.battle-action-row');
        if (actionRow) { actionRow.innerHTML = ''; actionRow.style.display = 'none'; }

        const battleContainer = document.getElementById('battle-canvas-container');

        if (action === 'continue') {
            // Exit battle, go to collection
            BattlePhaser.exit();
            if (battleContainer) battleContainer.style.display = 'none';
            document.getElementById('screen-battle').classList.remove('battle-active');
            BattleEngine.stop();
            UI.updateHeader();
            UI.showScreen('battle');
        } else if (action === 'retry') {
            // Exit battle and restart
            BattlePhaser.exit();
            if (battleContainer) battleContainer.style.display = 'none';
            document.getElementById('screen-battle').classList.remove('battle-active');
            BattleEngine.stop();
            UI.updateHeader();
            UI.renderBattleScreen();
        } else if (action === 'back') {
            // Exit battle, go to battle screen
            BattlePhaser.exit();
            if (battleContainer) battleContainer.style.display = 'none';
            document.getElementById('screen-battle').classList.remove('battle-active');
            BattleEngine.stop();
            UI.updateHeader();
            UI.renderBattleScreen();
        }
    },
};
