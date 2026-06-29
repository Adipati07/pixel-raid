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
    collection: [],     // all owned cards
    deck: [],           // 5 cards in active deck (card ids)
    inventory: [],      // all owned items
    equippedItems: {},  // { cardId: { weapon: itemId, armor: itemId, accessory: itemId } }
    
    // Battle state
    battleActive: false,
    battleSpeed: 1,
    autoNext: false,
    
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
            inventory: this.inventory,
            equippedItems: this.equippedItems,
            stats: this.stats,
            nextCardId: _nextCardId,
            nextItemId: _nextItemId,
        };
        localStorage.setItem('pixelraid_save', JSON.stringify(data));
    },

    load() {
        const raw = localStorage.getItem('pixelraid_save');
        if (!raw) return false;
        try {
            const data = JSON.parse(raw);
            Object.assign(this.player, data.player);
            this.collection = data.collection || [];
            this.deck = data.deck || [];
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
        if (this.deck.length >= 5) return false;
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

    generateEnemyDeck(stage) {
        const enemies = [];
        const count = Math.min(5, Math.ceil(stage / 2) + 1);
        const difficultyMul = 1 + (stage - 1) * 0.15;
        
        for (let i = 0; i < count; i++) {
            const tmpl = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
            const rarityRoll = Math.random();
            let rarity = 'common';
            if (stage >= 3 && rarityRoll < 0.3) rarity = 'rare';
            if (stage >= 6 && rarityRoll < 0.15) rarity = 'epic';
            if (stage >= 10 && rarityRoll < 0.05) rarity = 'legendary';
            
            const card = generateCard(tmpl, rarity);
            // Scale enemy stats with stage
            for (const stat of ['hp', 'maxHp', 'atk', 'def', 'spd']) {
                card.stats[stat] = Math.floor(card.stats[stat] * difficultyMul);
            }
            enemies.push(card);
        }
        return enemies;
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
