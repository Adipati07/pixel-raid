/* ========================================
 * PIXEL RAID — Economy System
 * Tokens, packs, marketplace
 * ======================================== */

const Economy = {
    PACK_COSTS: {
        basic:    { gold: 50,  gems: 0, count: 3, name: 'Basic Pack',    desc: '3 cards, mostly Common' },
        premium:  { gold: 150, gems: 0, count: 5, name: 'Premium Pack',  desc: '5 cards, guaranteed Rare+' },
        elite:    { gold: 0,   gems: 3, count: 5, name: 'Elite Pack',    desc: '5 cards, higher Epic chance' },
        legendary:{ gold: 0,   gems: 10, count: 5, name: 'Legendary Pack', desc: '5 cards, guaranteed Epic+' },
    },

    STAGE_REWARDS: {
        gold: (stage) => 20 + stage * 10 + Math.floor(Math.random() * stage * 5),
        exp:  (stage) => 10 + stage * 5,
        packChance: (stage) => Math.min(0.5, 0.1 + stage * 0.03),
        itemChance: (stage) => Math.min(0.3, 0.05 + stage * 0.02),
    },

    canAfford(cost) {
        if (cost.gold && GameState.player.gold < cost.gold) return false;
        if (cost.gems && GameState.player.gems < cost.gems) return false;
        return true;
    },

    spend(cost) {
        if (!this.canAfford(cost)) return false;
        if (cost.gold) GameState.player.gold -= cost.gold;
        if (cost.gems) GameState.player.gems -= cost.gems;
        GameState.save();
        return true;
    },

    addGold(amount) {
        GameState.player.gold += amount;
        GameState.save();
    },

    addGems(amount) {
        GameState.player.gems += amount;
        GameState.save();
    },

    buyPack(packType) {
        const cost = this.PACK_COSTS[packType];
        if (!cost) return null;
        if (!this.canAfford(cost)) return null;
        
        this.spend(cost);
        
        let cards;
        if (packType === 'premium') {
            cards = openPack(cost.count);
            // Guarantee at least 1 rare
            if (!cards.some(c => c.rarity !== 'common')) {
                const idx = Math.floor(Math.random() * cards.length);
                const tmpl = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
                cards[idx] = generateCard(tmpl, 'rare');
            }
        } else if (packType === 'elite') {
            cards = openPack(cost.count);
            // Boost rarity chances
            cards.forEach(c => {
                if (c.rarity === 'common' && Math.random() < 0.3) {
                    const tmpl = CARD_TEMPLATES.find(t => t.name === c.templateId);
                    Object.assign(c, generateCard(tmpl, 'rare'));
                }
            });
        } else if (packType === 'legendary') {
            cards = [];
            for (let i = 0; i < cost.count; i++) {
                const tmpl = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
                const rarity = Math.random() < 0.2 ? 'legendary' : Math.random() < 0.5 ? 'epic' : 'rare';
                cards.push(generateCard(tmpl, rarity));
            }
        } else {
            cards = openPack(cost.count);
        }

        cards.forEach(c => GameState.addToCollection(c));
        GameState.stats.packsOpened++;
        GameState.save();
        return cards;
    },

    processStageReward(stage) {
        const rewards = { gold: 0, exp: 0, cards: [], items: [] };
        
        rewards.gold = this.STAGE_REWARDS.gold(stage);
        rewards.exp = this.STAGE_REWARDS.exp(stage);
        
        this.addGold(rewards.gold);
        GameState.player.exp += rewards.exp;
        
        // Level up check
        const expNeeded = GameState.player.level * 100;
        if (GameState.player.exp >= expNeeded) {
            GameState.player.exp -= expNeeded;
            GameState.player.level++;
            rewards.leveledUp = true;
            
            // Process level unlock — new hero + rewards
            const unlockResult = processLevelUnlock(GameState.player.level);
            if (unlockResult) {
                rewards.unlock = unlockResult;
            }
        }

        // Random pack drop
        if (Math.random() < this.STAGE_REWARDS.packChance(stage)) {
            const cards = openPack(1);
            cards.forEach(c => GameState.addToCollection(c));
            rewards.cards = cards;
        }

        // Random item drop
        if (Math.random() < this.STAGE_REWARDS.itemChance(stage)) {
            const item = generateRandomItem(stage >= 8 ? 'legendary' : stage >= 5 ? 'epic' : 'rare');
            GameState.addItem(item);
            rewards.items.push(item);
        }

        GameState.save();
        return rewards;
    },

    sellCard(cardId) {
        const card = GameState.getCardById(cardId);
        if (!card) return 0;
        const price = getCardSellPrice(card);
        this.addGold(price);
        GameState.removeFromCollection(cardId);
        return price;
    },

    sellItem(itemId) {
        const item = GameState.inventory.find(i => i.id === itemId);
        if (!item) return 0;
        const price = Math.floor(item.price * 0.5);
        this.addGold(price);
        GameState.inventory = GameState.inventory.filter(i => i.id !== itemId);
        GameState.save();
        return price;
    },

    // Marketplace — simulated for MVP (real prices based on rarity + power)
    getMarketPrice(card) {
        const base = { common: 20, rare: 60, epic: 200, legendary: 600, mythic: 2000 };
        const power = getCardPower(card);
        return Math.floor((base[card.rarity] || 20) * (1 + power / 500));
    },

    // Generate AI marketplace listings
    generateMarketListings(count = 6) {
        const listings = [];
        for (let i = 0; i < count; i++) {
            const tmpl = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
            const rarity = rollRarity();
            const card = generateCard(tmpl, rarity);
            listings.push({
                card: card,
                price: this.getMarketPrice(card),
                seller: ['PixelLord', 'CardMaster', 'RaidKing', 'CollectorX', 'ByteHunter', 'GridGamer'][Math.floor(Math.random() * 6)],
            });
        }
        return listings;
    },
};
