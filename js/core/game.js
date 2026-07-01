/* ========================================
 * PIXEL RAID — Game State Manager
 * ======================================== */

const GameState = {
    player: {
        name: 'Adventurer',
        gold: 100,
        gems: 5,
        level: 1,
        exp: 0,
        stage: 1,
        wave: 1,
        maxWave: 3,
    },
    collection: [],     // all owned hero cards
    deck: [],           // 1 hero in active deck (card id) — for 1v1 battles
    skillDeck: [],      // up to 4 skill card ids in active skill deck
    inventory: [],      // all owned items
    equippedItems: {},  // { cardId: { weapon: itemId, armor: itemId, accessory: itemId } }
    
    // Battle state
    battleActive: false,
    battleSpeed: 1,
    
    // Stats tracking
    stats: {
        battlesWon: 0,
        battlesLost: 0,
        packsOpened: 0,
        cardsCollected: 0,
        highestStage: 1,
    },

    save() {
        const data = {
            player: this.player,
            collection: this.collection,
            deck: this.deck,
            skillDeck: this.skillDeck,
            inventory: this.inventory,
            equippedItems: this.equippedItems,
            stats: this.stats,
            nextCardId: _nextCardId,
            nextItemId: _nextItemId,
        };
        localStorage.setItem('pixelraid_save', JSON.stringify(data));

        // Cloud sync (fire-and-forget, debounced)
        if (typeof Backend !== 'undefined' && Backend.connected) {
            clearTimeout(this._cloudSaveTimer);
            this._cloudSaveTimer = setTimeout(() => Backend.saveToCloud(this), 2000);
        }
    },

    load() {
        const raw = localStorage.getItem('pixelraid_save');
        if (!raw) return false;
        try {
            const data = JSON.parse(raw);
            Object.assign(this.player, data.player);
            this.collection = data.collection || [];
            this.deck = data.deck || [];
            this.skillDeck = data.skillDeck || [];
            this.inventory = data.inventory || [];
            this.equippedItems = data.equippedItems || {};
            Object.assign(this.stats, data.stats || {});
            _nextCardId = data.nextCardId || 1;
            _nextItemId = data.nextItemId || 1;
            return true;
        } catch (e) {
            console.error('Failed to load save:', e);
            return false;
        }
    },

    getCardById(id) {
        return this.collection.find(c => c.id === id);
    },

    getDeckCards() {
        return this.deck.map(id => this.getCardById(id)).filter(Boolean);
    },

    getSkillDeckCards() {
        return this.skillDeck.map(id => getSkillCardById(id)).filter(Boolean);
    },

    generateEnemySkillDeck(stage, playerHero) {
        // Generate enemy skill cards — difficulty scales with player power
        const count = 4;
        const ids = [];

        // Calculate player power to decide enemy card quality
        const playerPower = playerHero
            ? ((playerHero.stats?.hp || 100) * 0.5 + (playerHero.stats?.atk || 10) * 2 +
               (playerHero.stats?.def || 10) * 1.5 + (playerHero.stats?.spd || 10) * 1.2)
            : 100;

        // Low power player → mostly common/rare cards; high power → epic/legendary
        const powerTier = playerPower < 150 ? 0 : playerPower < 250 ? 1 : playerPower < 400 ? 2 : 3;
        const rarityChance = [0.1, 0.3, 0.55, 0.75][powerTier]; // chance of picking rare+

        // Tier preference: prefer damage-heavy or utility based on stage
        const pool = SKILL_CARD_TEMPLATES.slice();
        // Sort by damage value (prefer stronger cards at higher difficulty)
        const sortedPool = pool.sort((a, b) => {
            const aVal = a.effect?.value || 0;
            const bVal = b.effect?.value || 0;
            return bVal - aVal;
        });

        for (let i = 0; i < count; i++) {
            if (Math.random() < rarityChance && stage >= 2) {
                // Pick from top half (stronger cards)
                const topHalf = sortedPool.slice(0, Math.ceil(sortedPool.length / 2));
                ids.push(topHalf[Math.floor(Math.random() * topHalf.length)].id);
            } else {
                // Pick randomly
                ids.push(pool[Math.floor(Math.random() * pool.length)].id);
            }
        }
        return ids;
    },

    addToCollection(card) {
        this.collection.push(card);
        this.stats.cardsCollected++;
        this.save();
    },

    removeFromCollection(cardId) {
        this.collection = this.collection.filter(c => c.id !== cardId);
        this.deck = this.deck.filter(id => id !== cardId);
        delete this.equippedItems[cardId];
        this.save();
    },

    addToDeck(cardId) {
        if (this.deck.length >= 4) return false;
        if (this.deck.includes(cardId)) return false;
        const card = this.getCardById(cardId);
        if (!card) return false;
        this.deck.push(cardId);
        card.inDeck = true;
        this.save();
        return true;
    },

    removeFromDeck(cardId) {
        this.deck = this.deck.filter(id => id !== cardId);
        const card = this.getCardById(cardId);
        if (card) card.inDeck = false;
        this.save();
    },

    addItem(item) {
        this.inventory.push(item);
        this.save();
    },

    equipItem(itemId, cardId) {
        const item = this.inventory.find(i => i.id === itemId);
        const card = this.getCardById(cardId);
        if (!item || !card) return false;
        
        if (!this.equippedItems[cardId]) {
            this.equippedItems[cardId] = {};
        }
        
        // Unequip old item in same slot
        const slot = ITEM_TYPES[item.type].slot;
        if (slot === 'consumable') return false;
        const oldItemId = this.equippedItems[cardId][slot];
        if (oldItemId) {
            const oldItem = this.inventory.find(i => i.id === oldItemId);
            if (oldItem) oldItem.equippedTo = null;
        }
        
        this.equippedItems[cardId][slot] = itemId;
        item.equippedTo = cardId;
        this.save();
        return true;
    },

    getCardWithEquipment(cardId) {
        const card = this.getCardById(cardId);
        if (!card) return null;
        
        const equipped = { ...card.stats };
        const items = this.equippedItems[cardId];
        if (items) {
            for (const [slot, itemId] of Object.entries(items)) {
                const item = this.inventory.find(i => i.id === itemId);
                if (item && equipped[item.stat] !== undefined) {
                    equipped[item.stat] += item.val;
                }
            }
        }
        return { ...card, stats: equipped };
    },

    generateEnemyDeck(stage, playerHero) {
        // Generate a single enemy hero that scales with BOTH stage AND player power
        const stageScale = 1 + (stage - 1) * 0.18;

        // Calculate player power from hero stats
        const pStats = playerHero?.stats || {};
        const playerPower = (pStats.hp || 100) * 0.5 + (pStats.atk || 10) * 2 +
                            (pStats.def || 10) * 1.5 + (pStats.spd || 10) * 1.2;
        // Player power ratio: how much stronger/weaker than baseline (baseline ~150)
        const powerRatio = Math.max(0.6, Math.min(2.0, playerPower / 150));

        // Higher stages unlock rarer enemy heroes
        const rarityRoll = Math.random();
        let rarity = 'common';
        if (stage >= 3 && rarityRoll < 0.35) rarity = 'rare';
        if (stage >= 6 && rarityRoll < 0.20) rarity = 'epic';
        if (stage >= 10 && rarityRoll < 0.08) rarity = 'legendary';
        if (stage >= 15 && rarityRoll < 0.03) rarity = 'mythic';

        // If player is very strong, boost minimum rarity
        if (powerRatio >= 1.5 && rarity === 'common' && stage >= 2) rarity = 'rare';
        if (powerRatio >= 2.0 && rarity === 'rare' && stage >= 4) rarity = 'epic';

        // Pick a random hero template
        const tmpl = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
        const card = generateCard(tmpl, rarity);

        // Scale enemy hero stats with stage AND player power
        const combinedScale = stageScale * powerRatio;
        for (const stat of ['hp', 'maxHp', 'atk', 'def', 'spd']) {
            card.stats[stat] = Math.floor(card.stats[stat] * combinedScale);
        }

        return [card]; // Return single hero in array for compatibility
    },
    // ===== BLOCKCHAIN INTEGRATION =====

    /**
     * Mint a card as NFT on BNB Chain
     * @param {Object} card - The card object to mint
     * @returns {Promise<number|null>} Token ID if successful, null if failed
     */
    async mintCardToChain(card) {
        if (typeof BlockchainBridge === 'undefined' || !BlockchainBridge.isConnected) {
            console.warn('⚠️ Wallet not connected');
            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast('Connect wallet first!', 'warning');
            }
            return null;
        }

        try {
            const tokenId = typeof BlockchainBridge !== 'undefined' ? await BlockchainBridge.syncCardToChain(card) : null;
            if (tokenId) {
                this.save(); // Save with tokenId
                if (typeof UI !== 'undefined' && UI.toast) {
                    UI.toast(`✅ Card minted as NFT #${tokenId}!`, 'success');
                }
            }
            return tokenId;
        } catch (error) {
            console.error('❌ Mint failed:', error);
            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast('Mint failed: ' + error.message, 'error');
            }
            return null;
        }
    },

    /**
     * Sync an existing card to blockchain
     * @param {number} cardId - The local card ID
     * @returns {Promise<number|null>} Token ID if successful
     */
    async syncCardToChain(cardId) {
        const card = this.getCardById(cardId);
        if (!card) {
            console.error('Card not found:', cardId);
            return null;
        }

        if (card.onChain) {
            console.log('Card already on chain:', card.tokenId);
            return card.tokenId;
        }

        return await this.mintCardToChain(card);
    },

    /**
     * Level up a card on-chain (after local level up)
     * @param {number} cardId - The local card ID
     * @returns {Promise<boolean>} Success status
     */
    async levelUpCardOnChain(cardId) {
        const card = this.getCardById(cardId);
        if (!card || !card.onChain || !card.tokenId) {
            return false;
        }

        if (typeof BlockchainBridge === 'undefined' || !BlockchainBridge.isConnected) {
            return false;
        }

        try {
            await BlockchainBridge.levelUpCard(card.tokenId);
            return true;
        } catch (error) {
            console.error('On-chain level up failed:', error);
            return false;
        }
    },

    /**
     * List a card for sale on the marketplace
     * @param {number} cardId - The local card ID
     * @param {number} priceInBnb - Price in BNB
     * @returns {Promise<boolean>} Success status
     */
    async listCardOnMarketplace(cardId, priceInBnb) {
        const card = this.getCardById(cardId);
        if (!card || !card.onChain || !card.tokenId) {
            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast('Card must be minted first!', 'warning');
            }
            return false;
        }

        if (typeof BlockchainBridge === 'undefined' || !BlockchainBridge.isConnected) {
            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast('Connect wallet first!', 'warning');
            }
            return false;
        }

        try {
            await BlockchainBridge.listCard(card.tokenId, priceInBnb);
            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast(`Card listed for ${priceInBnb} BNB!`, 'success');
            }
            return true;
        } catch (error) {
            console.error('List failed:', error);
            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast('List failed: ' + error.message, 'error');
            }
            return false;
        }
    },

    /**
     * Get count of on-chain cards
     * @returns {number} Number of minted cards
     */
    getOnChainCardCount() {
        return this.collection.filter(c => c.onChain).length;
    },
};
