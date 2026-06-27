/* ========================================
 * PIXEL RAID — Card Data System
 * ======================================== */

const RARITIES = {
    common:    { name: 'Common',    color: '#aaaaaa', weight: 60, statMul: 1.0, packWeight: 60 },
    rare:      { name: 'Rare',      color: '#4488ff', weight: 25, statMul: 1.3, packWeight: 25 },
    epic:      { name: 'Epic',      color: '#aa44ff', weight: 10, statMul: 1.6, packWeight: 10 },
    legendary: { name: 'Legendary', color: '#ff8800', weight: 4,  statMul: 2.0, packWeight: 4  },
    mythic:    { name: 'Mythic',    color: '#ff2266', weight: 1,  statMul: 2.5, packWeight: 1  },
};

const CLASSES = {
    warrior:  { name: 'Warrior',  emoji: '⚔️',  color: '#ff6644', bonusStat: 'def', bonusVal: 1.15 },
    mage:     { name: 'Mage',     emoji: '🔮', color: '#8844ff', bonusStat: 'atk', bonusVal: 1.15 },
    archer:   { name: 'Archer',   emoji: '🏹', color: '#44cc88', bonusStat: 'spd', bonusVal: 1.15 },
    healer:   { name: 'Healer',   emoji: '💚', color: '#44ffaa', bonusStat: 'hp',  bonusVal: 1.20 },
    assassin: { name: 'Assassin', emoji: '🗡️',  color: '#ff4488', bonusStat: 'crit', bonusVal: 1.25 },
};

// Synergy definitions — when N cards of same class are in deck
const SYNERGIES = {
    warrior:  { 2: { stat: 'def', bonus: 0.15, desc: '2x Warrior: DEF +15%' }, 3: { stat: 'def', bonus: 0.30, desc: '3x Warrior: DEF +30%' } },
    mage:     { 2: { stat: 'atk', bonus: 0.20, desc: '2x Mage: ATK +20%' },    3: { stat: 'atk', bonus: 0.40, desc: '3x Mage: ATK +40%' } },
    archer:   { 2: { stat: 'spd', bonus: 0.15, desc: '2x Archer: SPD +15%' },  3: { stat: 'spd', bonus: 0.30, desc: '3x Archer: SPD +30%' } },
    healer:   { 2: { stat: 'hp',  bonus: 0.20, desc: '2x Healer: HP +20%' },    3: { stat: 'hp',  bonus: 0.40, desc: '3x Healer: HP +40%' } },
    assassin: { 2: { stat: 'crit', bonus: 0.15, desc: '2x Assassin: CRIT +15%' }, 3: { stat: 'crit', bonus: 0.30, desc: '3x Assassin: CRIT +30%' } },
};

// Cross-class combo synergies
const COMBO_SYNERGIES = [
    { classes: ['warrior', 'healer'],   desc: '🛡️ Paladin Oath: +10% DEF & HP',  bonus: { def: 0.10, hp: 0.10 } },
    { classes: ['mage', 'assassin'],    desc: '🌑 Shadow Arts: +15% ATK & CRIT', bonus: { atk: 0.15, crit: 0.15 } },
    { classes: ['archer', 'assassin'],  desc: '💨 Swift Strikes: +20% SPD',      bonus: { spd: 0.20 } },
    { classes: ['warrior', 'mage'],     desc: '🔥 Battle Mage: +12% ATK & DEF',  bonus: { atk: 0.12, def: 0.12 } },
];

// Card templates — base stats before rarity multiplier
const CARD_TEMPLATES = [
    // Warriors
    { name: 'Iron Knight',      cls: 'warrior',  hp: 120, atk: 18, def: 22, spd: 8,  crit: 5,  skill: { name: 'Shield Wall', type: 'buff_def', val: 0.3, chance: 0.3 } },
    { name: 'Berserker',        cls: 'warrior',  hp: 100, atk: 28, def: 12, spd: 10, crit: 15, skill: { name: 'Rage', type: 'buff_atk', val: 0.5, chance: 0.25 } },
    { name: 'Paladin',          cls: 'warrior',  hp: 140, atk: 14, def: 25, spd: 6,  crit: 5,  skill: { name: 'Holy Guard', type: 'shield', val: 30, chance: 0.3 } },
    { name: 'Dark Knight',      cls: 'warrior',  hp: 110, atk: 24, def: 18, spd: 9,  crit: 10, skill: { name: 'Drain Strike', type: 'lifesteal', val: 0.3, chance: 0.25 } },
    
    // Mages
    { name: 'Fire Mage',        cls: 'mage',     hp: 70,  atk: 32, def: 8,  spd: 12, crit: 10, skill: { name: 'Fireball', type: 'aoe', val: 0.6, chance: 0.3 } },
    { name: 'Ice Witch',        cls: 'mage',     hp: 75,  atk: 28, def: 10, spd: 11, crit: 8,  skill: { name: 'Frost Nova', type: 'debuff_spd', val: 0.3, chance: 0.3 } },
    { name: 'Lightning Lord',   cls: 'mage',     hp: 65,  atk: 35, def: 7,  spd: 14, crit: 12, skill: { name: 'Chain Lightning', type: 'aoe', val: 0.8, chance: 0.2 } },
    { name: 'Void Sorcerer',    cls: 'mage',     hp: 80,  atk: 30, def: 9,  spd: 10, crit: 15, skill: { name: 'Void Rift', type: 'true_dmg', val: 20, chance: 0.25 } },
    
    // Archers
    { name: 'Wind Ranger',      cls: 'archer',   hp: 80,  atk: 24, def: 10, spd: 18, crit: 12, skill: { name: 'Multi Shot', type: 'multi_hit', val: 2, chance: 0.25 } },
    { name: 'Shadow Sniper',    cls: 'archer',   hp: 70,  atk: 30, def: 8,  spd: 16, crit: 20, skill: { name: 'Headshot', type: 'crit_boost', val: 2.0, chance: 0.2 } },
    { name: 'Beast Tamer',      cls: 'archer',   hp: 90,  atk: 22, def: 12, spd: 14, crit: 10, skill: { name: 'Eagle Strike', type: 'ignore_def', val: 0.5, chance: 0.25 } },
    { name: 'Storm Archer',     cls: 'archer',   hp: 75,  atk: 26, def: 9,  spd: 20, crit: 14, skill: { name: 'Thunder Arrow', type: 'stun', val: 1, chance: 0.2 } },
    
    // Healers
    { name: 'Holy Priest',      cls: 'healer',   hp: 90,  atk: 10, def: 14, spd: 10, crit: 5,  skill: { name: 'Heal', type: 'heal', val: 0.25, chance: 0.4 } },
    { name: 'Druid',            cls: 'healer',   hp: 100, atk: 14, def: 16, spd: 8,  crit: 5,  skill: { name: 'Regrowth', type: 'hot', val: 0.1, chance: 0.35 } },
    { name: 'Battle Medic',     cls: 'healer',   hp: 85,  atk: 16, def: 12, spd: 12, crit: 8,  skill: { name: 'Combat Heal', type: 'heal', val: 0.20, chance: 0.35 } },
    { name: 'Necromancer',      cls: 'healer',   hp: 80,  atk: 18, def: 10, spd: 11, crit: 10, skill: { name: 'Life Drain', type: 'lifesteal', val: 0.25, chance: 0.3 } },
    
    // Assassins
    { name: 'Phantom Blade',    cls: 'assassin', hp: 65,  atk: 34, def: 6,  spd: 22, crit: 25, skill: { name: 'Backstab', type: 'crit_boost', val: 2.5, chance: 0.25 } },
    { name: 'Venom Dancer',     cls: 'assassin', hp: 70,  atk: 28, def: 8,  spd: 20, crit: 18, skill: { name: 'Poison Blade', type: 'dot', val: 10, chance: 0.3 } },
    { name: 'Shadow Monk',      cls: 'assassin', hp: 75,  atk: 26, def: 10, spd: 19, crit: 20, skill: { name: 'Shadow Step', type: 'dodge_buff', val: 0.3, chance: 0.25 } },
    { name: 'Reaper',           cls: 'assassin', hp: 60,  atk: 38, def: 5,  spd: 24, crit: 30, skill: { name: 'Execute', type: 'execute', val: 0.3, chance: 0.15 } },
];

// ===== STARTER PACK — 3 heroes untuk onboarding =====
const STARTER_HEROES = ['Iron Knight', 'Fire Mage', 'Holy Priest'];

// ===== LEVEL UNLOCK SYSTEM =====
// Setiap level unlock hero baru (rarity common)
const LEVEL_UNLOCKS = {
    1:  { hero: null,                    reward: null,              desc: 'Welcome to Pixel Raid!' },
    2:  { hero: 'Berserker',            reward: null,              desc: '⚔️ Berserker unlocked!' },
    3:  { hero: null,                    reward: { gold: 200 },    desc: '💰 200 Gold bonus!' },
    4:  { hero: 'Wind Ranger',          reward: null,              desc: '🏹 Wind Ranger unlocked!' },
    5:  { hero: 'Druid',                reward: { gems: 3 },      desc: '💚 Druid + 3 Gems!' },
    6:  { hero: 'Shadow Sniper',        reward: null,              desc: '🏹 Shadow Sniper unlocked!' },
    7:  { hero: 'Ice Witch',            reward: null,              desc: '🔮 Ice Witch unlocked!' },
    8:  { hero: 'Phantom Blade',        reward: { gold: 500 },    desc: '🗡️ Phantom Blade + 500 Gold!' },
    9:  { hero: 'Paladin',              reward: null,              desc: '⚔️ Paladin unlocked!' },
    10: { hero: 'Beast Tamer',          reward: { gems: 5 },      desc: '🏹 Beast Tamer + 5 Gems!' },
    11: { hero: 'Battle Medic',         reward: null,              desc: '💚 Battle Medic unlocked!' },
    12: { hero: 'Lightning Lord',       reward: null,              desc: '🔮 Lightning Lord unlocked!' },
    13: { hero: 'Venom Dancer',         reward: { gold: 800 },    desc: '🗡️ Venom Dancer + 800 Gold!' },
    14: { hero: 'Dark Knight',          reward: null,              desc: '⚔️ Dark Knight unlocked!' },
    15: { hero: 'Necromancer',          reward: { gems: 8 },      desc: '💚 Necromancer + 8 Gems!' },
    16: { hero: 'Storm Archer',         reward: null,              desc: '🏹 Storm Archer unlocked!' },
    17: { hero: 'Void Sorcerer',        reward: null,              desc: '🔮 Void Sorcerer unlocked!' },
    18: { hero: 'Shadow Monk',          reward: { gold: 1200 },   desc: '🗡️ Shadow Monk + 1200 Gold!' },
    19: { hero: 'Berserker',            reward: { gems: 10 },     desc: '⚔️ Berserker (Rare!) + 10 Gems!' },
    20: { hero: 'Reaper',               reward: { gold: 2000, gems: 15 }, desc: '🗡️ REAPER UNLOCKED! + 2000 Gold + 15 Gems!' },
};

function getTemplateByName(name) {
    return CARD_TEMPLATES.find(t => t.name === name);
}

function processLevelUnlock(level) {
    const unlock = LEVEL_UNLOCKS[level];
    if (!unlock) return null;

    const result = { desc: unlock.desc, cards: [], rewards: {} };

    // Unlock hero card
    if (unlock.hero) {
        const tmpl = getTemplateByName(unlock.hero);
        if (tmpl) {
            const rarity = level >= 19 ? 'rare' : 'common';
            const card = generateCard(tmpl, rarity);
            GameState.addToCollection(card);
            result.cards.push(card);
        }
    }

    // Give rewards
    if (unlock.reward) {
        if (unlock.reward.gold) {
            GameState.player.gold += unlock.reward.gold;
            result.rewards.gold = unlock.reward.gold;
        }
        if (unlock.reward.gems) {
            GameState.player.gems += unlock.reward.gems;
            result.rewards.gems = unlock.reward.gems;
        }
    }

    GameState.save();
    return result;
}

let _nextCardId = 1;

function generateCard(template, rarity) {
    rarity = rarity || rollRarity();
    const r = RARITIES[rarity];
    const cls = CLASSES[template.cls];
    
    const card = {
        id: _nextCardId++,
        templateId: template.name,
        name: template.name,
        class: template.cls,
        rarity: rarity,
        stats: {
            hp:   Math.floor(template.hp   * r.statMul * (cls.bonusStat === 'hp'   ? cls.bonusVal : 1)),
            maxHp: 0, // set below
            atk:  Math.floor(template.atk  * r.statMul * (cls.bonusStat === 'atk'  ? cls.bonusVal : 1)),
            def:  Math.floor(template.def  * r.statMul * (cls.bonusStat === 'def'  ? cls.bonusVal : 1)),
            spd:  Math.floor(template.spd  * r.statMul * (cls.bonusStat === 'spd'  ? cls.bonusVal : 1)),
            crit: Math.floor(template.crit * r.statMul * (cls.bonusStat === 'crit' ? cls.bonusVal : 1)),
        },
        skill: { ...template.skill },
        level: 1,
        exp: 0,
        equipped: false,
        inDeck: false,
        artSeed: Math.floor(Math.random() * 999999), // for procedural pixel art
    };
    card.stats.maxHp = card.stats.hp;
    return card;
}

function rollRarity() {
    const rand = Math.random() * 100;
    let acc = 0;
    for (const [key, r] of Object.entries(RARITIES)) {
        acc += r.packWeight;
        if (rand < acc) return key;
    }
    return 'common';
}

function openPack(count = 5) {
    const cards = [];
    for (let i = 0; i < count; i++) {
        const tmpl = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
        cards.push(generateCard(tmpl));
    }
    // Guarantee at least 1 rare+
    if (!cards.some(c => c.rarity !== 'common')) {
        const idx = Math.floor(Math.random() * cards.length);
        const tmpl = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
        cards[idx] = generateCard(tmpl, 'rare');
    }
    return cards;
}

function getCardPower(card) {
    const s = card.stats;
    return Math.floor((s.hp * 0.5 + s.atk * 2 + s.def * 1.5 + s.spd * 1.2 + s.crit * 1.8) * RARITIES[card.rarity].statMul);
}

function getCardSellPrice(card) {
    const rarityPrices = { common: 5, rare: 15, epic: 50, legendary: 150, mythic: 500 };
    return rarityPrices[card.rarity] || 5;
}
