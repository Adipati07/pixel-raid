/* ========================================
 * PIXEL RAID — Economy System
 * Tokens, packs, marketplace
 * ======================================== */

const Economy = {
    // ===== TIER-BASED PACKS =====
    TIER_PACKS: {
        t1_recruit: {
            name: '🥉 Recruit Pack', tier: 1, gold: 80, gems: 0, count: 3,
            desc: 'T1 — 3 cards, Common tier',
            color: '#aaaaaa', guarantee: null,
            rarityWeights: { common: 85, rare: 12, epic: 2, legendary: 1, mythic: 0 },
        },
        t2_soldier: {
            name: '🥈 Soldier Pack', tier: 2, gold: 250, gems: 0, count: 5,
            desc: 'T2 — 5 cards, guaranteed 1 Rare+',
            color: '#4488ff', guarantee: 'rare',
            rarityWeights: { common: 55, rare: 30, epic: 10, legendary: 4, mythic: 1 },
        },
        t3_elite: {
            name: '🥇 Elite Pack', tier: 3, gold: 600, gems: 0, count: 5,
            desc: 'T3 — 5 cards, guaranteed 1 Epic+',
            color: '#9b59b6', guarantee: 'epic',
            rarityWeights: { common: 25, rare: 35, epic: 25, legendary: 12, mythic: 3 },
        },
        t4_champion: {
            name: '💎 Champion Pack', tier: 4, gold: 0, gems: 5, count: 5,
            desc: 'T4 — 5 cards, guaranteed 1 Epic+',
            color: '#ff8800', guarantee: 'epic',
            rarityWeights: { common: 10, rare: 25, epic: 35, legendary: 22, mythic: 8 },
        },
        t5_mythic: {
            name: '🔥 Mythic Pack', tier: 5, gold: 0, gems: 15, count: 5,
            desc: 'T5 — 5 cards, guaranteed 1 Legendary+',
            color: '#ff2266', guarantee: 'legendary',
            rarityWeights: { common: 0, rare: 10, epic: 30, legendary: 40, mythic: 20 },
        },
    },

    // ===== CLASS-FOCUSED PACKS =====
    CLASS_PACKS: {
        warriors: {
            name: '⚔️ Warriors Pack', classes: ['warrior'], gold: 350, gems: 0, count: 4,
            desc: '4 Warrior cards — tanks & bruisers',
            color: '#ff6644', guarantee: null,
        },
        mages: {
            name: '🔮 Mages Pack', classes: ['mage'], gold: 350, gems: 0, count: 4,
            desc: '4 Mage cards — glass cannons',
            color: '#8844ff', guarantee: null,
        },
        archers: {
            name: '🏹 Archers Pack', classes: ['archer'], gold: 350, gems: 0, count: 4,
            desc: '4 Archer cards — speed & crit',
            color: '#44cc88', guarantee: null,
        },
        healers: {
            name: '💚 Healers Pack', classes: ['healer'], gold: 350, gems: 0, count: 4,
            desc: '4 Healer cards — sustain & shields',
            color: '#44ffaa', guarantee: null,
        },
        assassins: {
            name: '🗡️ Assassins Pack', classes: ['assassin'], gold: 350, gems: 0, count: 4,
            desc: '4 Assassin cards — burst & debuffs',
            color: '#ff4488', guarantee: null,
        },
        rainbow: {
            name: '🌈 Rainbow Pack', classes: ['warrior','mage','archer','healer','assassin'],
            gold: 800, gems: 0, count: 5,
            desc: '1 of each class — full roster!',
            color: '#ffd700', guarantee: 'rare',
        },
    },

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
        // Legacy pack support — redirect to tier system
        const legacyMap = { basic: 't1_recruit', premium: 't2_soldier', elite: 't4_champion', legendary: 't5_mythic' };
        const tierKey = legacyMap[packType] || packType;
        return this.buyTierPack(tierKey);
    },

    /**
     * Buy a tier-based pack with custom rarity weights
     */
    buyTierPack(tierKey) {
        const pack = this.TIER_PACKS[tierKey];
        if (!pack) return null;
        const cost = { gold: pack.gold, gems: pack.gems };
        if (!this.canAfford(cost)) return null;

        this.spend(cost);

        const cards = [];
        const weights = pack.rarityWeights;
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

        for (let i = 0; i < pack.count; i++) {
            const tmpl = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
            // Roll rarity based on pack weights
            let roll = Math.random() * totalWeight;
            let rarity = 'common';
            for (const [r, w] of Object.entries(weights)) {
                roll -= w;
                if (roll <= 0) { rarity = r; break; }
            }
            cards.push(generateCard(tmpl, rarity));
        }

        // Apply guarantee — upgrade worst card if needed
        if (pack.guarantee) {
            const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
            const guaranteeLevel = rarityOrder[pack.guarantee];
            const hasGuaranteed = cards.some(c => rarityOrder[c.rarity] >= guaranteeLevel);
            if (!hasGuaranteed) {
                // Upgrade last card to guarantee level
                const idx = Math.floor(Math.random() * cards.length);
                const tmpl = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
                cards[idx] = generateCard(tmpl, pack.guarantee);
            }
        }

        cards.forEach(c => GameState.addToCollection(c));
        GameState.stats.packsOpened++;
        GameState.save();
        return cards;
    },

    /**
     * Buy a class-focused pack
     */
    buyClassPack(classKey) {
        const pack = this.CLASS_PACKS[classKey];
        if (!pack) return null;
        const cost = { gold: pack.gold, gems: pack.gems };
        if (!this.canAfford(cost)) return null;

        this.spend(cost);

        // Filter templates by class
        const classTemplates = CARD_TEMPLATES.filter(t => pack.classes.includes(t.cls));

        let cards;
        if (classKey === 'rainbow') {
            // 1 card per class
            cards = pack.classes.map(cls => {
                const clsTemplates = CARD_TEMPLATES.filter(t => t.cls === cls);
                const tmpl = clsTemplates[Math.floor(Math.random() * clsTemplates.length)];
                return generateCard(tmpl);
            });
        } else {
            cards = [];
            for (let i = 0; i < pack.count; i++) {
                const tmpl = classTemplates[Math.floor(Math.random() * classTemplates.length)];
                cards.push(generateCard(tmpl));
            }
        }

        // Apply guarantee
        if (pack.guarantee) {
            const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
            const guaranteeLevel = rarityOrder[pack.guarantee];
            const hasGuaranteed = cards.some(c => rarityOrder[c.rarity] >= guaranteeLevel);
            if (!hasGuaranteed) {
                const idx = Math.floor(Math.random() * cards.length);
                const tmpl = classTemplates[Math.floor(Math.random() * classTemplates.length)];
                cards[idx] = generateCard(tmpl, pack.guarantee);
            }
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

    // Daily deals — refresh every 24h
    getDailyDeals() {
        const saved = localStorage.getItem('pixelraid_daily_deals');
        const now = Date.now();
        if (saved) {
            const data = JSON.parse(saved);
            if (now - data.timestamp < 24 * 60 * 60 * 1000) {
                return data.deals;
            }
        }
        // Generate new deals
        const deals = [];
        const dealTypes = [
            { type: 'pack', packType: 'premium', discount: 0.3, name: '30% Off Premium Pack' },
            { type: 'pack', packType: 'elite', discount: 0.2, name: '20% Off Elite Pack' },
            { type: 'gold', amount: 500, gems: 3, name: 'Starter Bundle: 500g + 3💎' },
        ];
        // Pick 2-3 random deals
        const shuffled = dealTypes.sort(() => Math.random() - 0.5);
        deals.push(...shuffled.slice(0, 2 + Math.floor(Math.random() * 2)));
        localStorage.setItem('pixelraid_daily_deals', JSON.stringify({ timestamp: now, deals }));
        return deals;
    },

    buyDailyDeal(index) {
        const deals = this.getDailyDeals();
        const deal = deals[index];
        if (!deal) return false;

        if (deal.type === 'pack') {
            const cost = { ...this.PACK_COSTS[deal.packType] };
            cost.gold = Math.floor(cost.gold * (1 - deal.discount));
            cost.gems = Math.floor(cost.gems * (1 - deal.discount));
            if (!this.canAfford(cost)) return false;
            this.spend(cost);
            return this.buyPack(deal.packType);
        } else if (deal.type === 'gold') {
            if (GameState.player.gems < deal.gems) return false;
            GameState.player.gems -= deal.gems;
            this.addGold(deal.amount);
            return true;
        }
        return false;
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
