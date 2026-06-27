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
            case 'formation': this.renderFormationScreen(); break;
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
        document.getElementById('stage-number').textContent = GameState.player.stage;
        document.getElementById('wave-number').textContent = GameState.player.wave;
        const progress = ((GameState.player.wave - 1) / GameState.player.maxWave) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';
        
        // Render initial battle canvas
        const canvas = document.getElementById('battle-canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0a0a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffd700';
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('Press Start Battle!', canvas.width / 2, canvas.height / 2);
    },

    bindBattleControls() {
        document.getElementById('btn-start-battle').addEventListener('click', () => this.startBattle());
        document.getElementById('btn-auto-next').addEventListener('click', () => {
            GameState.autoNext = !GameState.autoNext;
            const btn = document.getElementById('btn-auto-next');
            btn.classList.toggle('btn-gold', GameState.autoNext);
            btn.textContent = GameState.autoNext ? '⏹️ Stop Auto' : '🔄 Auto Next Stage';
        });

        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                GameState.battleSpeed = parseInt(btn.dataset.speed);
                localStorage.setItem('pixelraid_speed', GameState.battleSpeed);
            });
        });

        // Restore saved speed
        const savedSpeed = parseInt(localStorage.getItem('pixelraid_speed'));
        if (savedSpeed && [1, 2, 3].includes(savedSpeed)) {
            GameState.battleSpeed = savedSpeed;
            document.querySelectorAll('.speed-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.speed) === savedSpeed);
            });
        }
    },

    startBattle() {
        const deckCards = GameState.getDeckCards();
        if (deckCards.length === 0) {
            this.toast('Build your deck first! Go to Formation.', 'error');
            return;
        }

        // Clear battle log
        document.getElementById('battle-log').innerHTML = '';
        
        const stage = GameState.player.stage;
        const enemies = GameState.generateEnemyDeck(stage);
        
        document.getElementById('btn-start-battle').disabled = true;

        BattleEngine.startBattle(deckCards, enemies, (result, log, turns) => {
            document.getElementById('btn-start-battle').disabled = false;
            
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
                    
                    this.showRewards(rewards);
                    
                    if (rewards.leveledUp) {
                        this.toast(`🎉 Level Up! Now Lv.${GameState.player.level}`, 'success');
                        
                        // Show unlock notification
                        if (rewards.unlock) {
                            setTimeout(() => this.showUnlockPopup(rewards.unlock), 800);
                        }
                    }
                }
            } else {
                GameState.stats.battlesLost++;
            }
            
            GameState.save();
            this.updateHeader();
            this.renderBattleScreen();

            // Auto next
            if (GameState.autoNext && result === 'win') {
                setTimeout(() => this.startBattle(), 1500);
            }
        });
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
            name.textContent = card.name;

            const cls = document.createElement('div');
            cls.className = 'card-class';
            cls.textContent = CLASSES[card.class].emoji + ' ' + CLASSES[card.class].name;

            const stats = document.createElement('div');
            stats.className = 'card-stats';
            stats.innerHTML = `
                <span><span style="color:#888">HP</span> <span style="color:#44cc44">${card.stats.hp}</span></span>
                <span><span style="color:#888">ATK</span> <span style="color:#ff6644">${card.stats.atk}</span></span>
                <span><span style="color:#888">DEF</span> <span style="color:#4488ff">${card.stats.def}</span></span>
                <span><span style="color:#888">SPD</span> <span style="color:#ffaa00">${card.stats.spd}</span></span>
                <span><span style="color:#888">PWR</span> <span style="color:var(--gold)">${getCardPower(card)}</span></span>
            `;

            el.append(sprite, name, cls, stats);
            grid.appendChild(el);
        });
    },

    showHeroDetail(card) {
        const detail = document.getElementById('hero-detail');
        const content = document.getElementById('hero-detail-content');
        
        const isEquipped = GameState.deck.includes(card.id);
        const equipBtnText = isEquipped ? '📤 Remove from Deck' : '📥 Add to Deck';
        
        content.innerHTML = `
            <div style="text-align:center;margin-bottom:16px;">
                <div id="detail-sprite-container" style="width:96px;height:96px;margin:0 auto;"></div>
                <h3 style="color:${RARITIES[card.rarity].color};font-size:12px;margin-top:8px;">${card.name}</h3>
                <div style="color:${CLASSES[card.class].color};font-size:8px;">${CLASSES[card.class].emoji} ${CLASSES[card.class].name} • ${RARITIES[card.rarity].name}</div>
            </div>
            <div style="font-size:8px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
                    <span style="color:#888">HP</span><span style="color:#44cc44">${card.stats.hp}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
                    <span style="color:#888">ATK</span><span style="color:#ff6644">${card.stats.atk}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
                    <span style="color:#888">DEF</span><span style="color:#4488ff">${card.stats.def}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
                    <span style="color:#888">SPD</span><span style="color:#ffaa00">${card.stats.spd}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
                    <span style="color:#888">CRIT</span><span style="color:#ff44aa">${card.stats.crit}%</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;">
                    <span style="color:#888">POWER</span><span style="color:var(--gold)">${getCardPower(card)}</span>
                </div>
            </div>
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
        const template = getTemplateByName(card.templateId || card.name);
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
            if (GameState.deck.length >= 5) {
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

    // ===== FORMATION SCREEN =====
    renderFormationScreen() {
        Formation.init();
        Formation.renderGrid();
        Formation.renderBench();
        Formation.renderSynergies();
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
        this.renderShopContent('summon');
    },

    renderShopContent(tab) {
        const content = document.getElementById('shop-content');
        
        if (tab === 'summon') {
            content.innerHTML = `
                <div class="summon-portal">
                    <div style="font-size:40px;margin-bottom:16px;">🎴</div>
                    <h3>Card Pack Shop</h3>
                    <p style="font-size:7px;color:var(--text-dim);margin-bottom:16px;">Open packs to collect powerful battle cards!</p>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;">
                    ${Object.entries(Economy.PACK_COSTS).map(([key, pack]) => `
                        <div class="card ${key === 'legendary' ? 'legendary' : key === 'elite' ? 'epic' : key === 'premium' ? 'rare' : 'common'}" onclick="UI.openPack('${key}')">
                            <div style="text-align:center;font-size:24px;margin-bottom:8px;">📦</div>
                            <div class="card-name" style="font-size:9px;">${pack.name}</div>
                            <div class="card-class">${pack.desc}</div>
                            <div class="summon-cost">
                                ${pack.gold ? `💰 ${pack.gold}` : ''}
                                ${pack.gems ? `💎 ${pack.gems}` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (tab === 'items') {
            this.marketListings = Economy.generateMarketListings(6);
            content.innerHTML = `
                <div style="font-size:9px;margin-bottom:12px;color:var(--gem);">🏪 Marketplace</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;">
                    ${this.marketListings.map((listing, i) => `
                        <div class="card ${listing.card.rarity}" onclick="UI.buyMarketItem(${i})">
                            <div style="text-align:center;">
                                <canvas id="market-card-${i}" width="48" height="48" style="image-rendering:pixelated;"></canvas>
                            </div>
                            <div class="card-name" style="color:${RARITIES[listing.card.rarity].color}">${listing.card.name}</div>
                            <div class="card-class">${CLASSES[listing.card.class].emoji} ${CLASSES[listing.card.class].name}</div>
                            <div class="card-stats">
                                <span><span style="color:#888">PWR</span> <span style="color:var(--gold)">${getCardPower(listing.card)}</span></span>
                            </div>
                            <div style="font-size:7px;color:var(--text-dim);margin-top:4px;">Seller: ${listing.seller}</div>
                            <div style="text-align:center;margin-top:8px;">
                                <button class="btn btn-gold" style="font-size:7px;padding:4px 10px;">💰 ${listing.price}g</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            // Draw market card sprites
            setTimeout(() => {
                this.marketListings.forEach((listing, i) => {
                    const canvas = document.getElementById(`market-card-${i}`);
                    if (canvas) CardRenderer.drawCardSprite(canvas, listing.card, 48);
                });
            }, 50);
        }
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
        
        // Show pack opening animation modal
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
        this.renderShopContent('items');
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
