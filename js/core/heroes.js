/* ========================================
 * PIXEL RAID — Card Data System
 * ======================================== */

const RARITIES = {
    common:    { name: 'Common',    color: '#aaaaaa', weight: 60, statMul: 1.0, packWeight: 60 },
    rare:      { name: 'Rare',      color: '#4488ff', weight: 25, statMul: 1.3, packWeight: 25 },
    epic:      { name: 'Epic',      color: '#9b59b6', weight: 10, statMul: 1.6, packWeight: 10 },
    legendary: { name: 'Legendary', color: '#ff8800', weight: 4,  statMul: 2.0, packWeight: 4  },
    mythic:    { name: 'Mythic',    color: '#ff2266', weight: 1,  statMul: 2.5, packWeight: 1  },
};

const CLASSES = {
    warrior:  { name: 'Warrior',  emoji: '⚔️',  color: '#ff6644', bonusStat: 'def', bonusVal: 1.15 },
    mage:     { name: 'Mage',     emoji: '🔮', color: '#8844ff', bonusStat: 'atk', bonusVal: 1.15 },
    archer:   { name: 'Archer',   emoji: '🏹', color: '#44cc88', bonusStat: 'spd', bonusVal: 1.15 },
    healer:   { name: 'Healer',   emoji: '💚', color: '#44ffaa', bonusStat: 'hp',  bonusVal: 1.20 },
    assassin: { name: 'Assassin', emoji: '🗡️',  color: '#ff4488', bonusStat: 'crit', bonusVal: 1.25 },
    tank:     { name: 'Tank',     emoji: '🛡️',  color: '#6688aa', bonusStat: 'def',  bonusVal: 1.20 },
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
    // ===== WARRIORS =====
    { name: 'Silver Knight',    cls: 'warrior', type: 'tank',
      image: 'assets/heroes/silver_knight.png',  hp: 130, atk: 16, def: 24, spd: 8,  crit: 5,
      lore: 'Clad in gleaming silver armor forged from moonstone, the Silver Knight is the realm\'s unbreakable shield. His legendary Shield Wall has turned the tide of a thousand battles.',
      skill: { name: 'Shield Wall', type: 'buff_def', val: 0.4, chance: 0.3 } },
    { name: 'Forest Warrior',   cls: 'warrior', type: 'warrior',
      image: 'assets/heroes/forest_warrior.png',  hp: 110, atk: 22, def: 18, spd: 12, crit: 10,
      lore: 'Born from the ancient woods, he fights with nature\'s fury. His battle axe is carved from the Heartwood Tree, and the forest itself heals his wounds.',
      skill: { name: 'Nature\'s Wrath', type: 'buff_atk', val: 0.35, chance: 0.25 } },
    { name: 'Dark Knight',      cls: 'warrior', type: 'warrior',
      image: 'assets/heroes/dark_knight.png',  hp: 115, atk: 26, def: 19, spd: 9,  crit: 12,
      lore: 'A fallen paladin who embraced shadow to gain forbidden power. Every strike drains life from his enemies, feeding his cursed existence.',
      skill: { name: 'Drain Strike', type: 'lifesteal', val: 0.3, chance: 0.25 } },
    { name: "Queen's Guard",    cls: 'warrior', type: 'tank',
      image: 'assets/heroes/queens_guard.png',  hp: 140, atk: 14, def: 26, spd: 7,  crit: 5,
      lore: 'Sworn to protect the crown with his life, the Queen\'s Guard stands as an immovable wall. His spear has never failed to hold the line.',
      skill: { name: 'Royal Guard', type: 'shield', val: 35, chance: 0.3 } },

    // ===== MAGES =====
    { name: 'Arch Mage',        cls: 'mage', type: 'mage',
      image: 'assets/heroes/arch_mage.png',  hp: 75,  atk: 34, def: 8,  spd: 12, crit: 10,
      lore: 'Grand master of the Arcane Academy, the Arch Mage commands elements with a wave of his staff. His crystal orb holds the power of a thousand storms.',
      skill: { name: 'Arcane Surge', type: 'aoe', val: 0.7, chance: 0.3 } },
    { name: "King's Mage",      cls: 'mage', type: 'mage',
      image: 'assets/heroes/kings_mage.png',  hp: 80,  atk: 30, def: 10, spd: 11, crit: 8,
      lore: 'Personal advisor to the crown, the King\'s Mage weaves arcane protections around the throne. His golden staff amplifies magic tenfold.',
      skill: { name: 'Royal Decree', type: 'buff_atk', val: 0.4, chance: 0.25 } },
    { name: 'Dark Sorcerer',    cls: 'mage', type: 'mage',
      image: 'assets/heroes/dark_sorcerer.png',  hp: 70,  atk: 36, def: 7,  spd: 13, crit: 12,
      lore: 'Peer into the abyss and the abyss peers back. The Dark Sorcerer wields void magic that tears reality apart, dealing damage no armor can block.',
      skill: { name: 'Void Rift', type: 'true_dmg', val: 25, chance: 0.25 } },
    { name: 'Fire Wielder',     cls: 'mage', type: 'mage',
      image: 'assets/heroes/fire_wielder.png',  hp: 72,  atk: 33, def: 9,  spd: 14, crit: 10,
      lore: 'His blade burns with eternal flame. The Fire Wielder merges swordplay with pyromancy, leaving a trail of ash wherever he fights.',
      skill: { name: 'Flame Slash', type: 'aoe', val: 0.6, chance: 0.3 } },

    // ===== ARCHERS =====
    { name: 'Shadow Stalker',   cls: 'archer', type: 'archer',
      image: 'assets/heroes/shadow_stalker.png',  hp: 70,  atk: 28, def: 8,  spd: 20, crit: 18,
      lore: 'A phantom who strikes from the darkness. The Shadow Stalker\'s twin daggers find vital points with surgical precision. By the time you see him, it\'s too late.',
      skill: { name: 'Shadow Strike', type: 'crit_boost', val: 2.0, chance: 0.25 } },
    { name: 'Demon Hunter',     cls: 'archer', type: 'archer',
      image: 'assets/heroes/demon_hunter.png',  hp: 80,  atk: 26, def: 12, spd: 16, crit: 15,
      lore: 'Marked by demon blood, she hunts the creatures of the night with her enchanted crossbow. Every bolt is tipped with holy water.',
      skill: { name: 'Demon Bane', type: 'ignore_def', val: 0.5, chance: 0.25 } },
    { name: 'Ice Witch',        cls: 'archer', type: 'archer',
      image: 'assets/heroes/ice_witch.png',  hp: 75,  atk: 28, def: 10, spd: 15, crit: 10,
      lore: 'The eternal winter that grips the northern forests is her doing. She freezes enemies in place, leaving them helpless before her frost constructs.',
      skill: { name: 'Frost Nova', type: 'debuff_spd', val: 0.35, chance: 0.3 } },
    { name: 'Frost Giant',      cls: 'archer', type: 'archer',
      image: 'assets/heroes/frost_giant.png',  hp: 95,  atk: 22, def: 16, spd: 8,  crit: 8,
      lore: 'A towering colossus of living ice from the Frozen Peaks. His frost breath can freeze an entire battalion solid in seconds.',
      skill: { name: 'Frozen Slam', type: 'stun', val: 1, chance: 0.2 } },

    // ===== HEALERS =====
    { name: 'Golden Paladin',   cls: 'healer', type: 'healer',
      image: 'assets/heroes/golden_paladin.png',  hp: 120, atk: 16, def: 20, spd: 8,  crit: 5,
      lore: 'Blessed by the Sun God, the Golden Paladin radiates healing light. His golden armor channels divine energy that mends wounds and smites evil.',
      skill: { name: 'Holy Light', type: 'heal', val: 0.25, chance: 0.35 } },
    { name: 'Princess',         cls: 'healer', type: 'healer',
      image: 'assets/heroes/princess.png',  hp: 85,  atk: 12, def: 14, spd: 12, crit: 5,
      lore: 'Don\'t let her gentle appearance fool you. The Princess carries ancient healing magic in her bloodline, mending allies with a wave of her hand.',
      skill: { name: 'Royal Blessing', type: 'heal', val: 0.30, chance: 0.4 } },
    { name: 'Golem',            cls: 'healer', type: 'tank',
      image: 'assets/heroes/golem.png',  hp: 130, atk: 14, def: 22, spd: 6,  crit: 5,
      lore: 'An ancient construct powered by a life crystal. The Golem absorbs damage meant for allies, channeling stored energy into protective shields.',
      skill: { name: 'Stone Guard', type: 'shield', val: 30, chance: 0.3 } },
    { name: 'Stone Golem',      cls: 'healer', type: 'tank',
      image: 'assets/heroes/stone_golem.png',  hp: 140, atk: 12, def: 24, spd: 5,  crit: 5,
      lore: 'A massive guardian carved from enchanted bedrock. Its runic core pulses with ancient protective magic, shielding all who stand behind it.',
      skill: { name: 'Runic Shield', type: 'shield', val: 40, chance: 0.25 } },

    // ===== ASSASSINS =====
    { name: 'Slime Lord',       cls: 'assassin', type: 'assassin',
      image: 'assets/heroes/slime_lord.png',  hp: 90,  atk: 24, def: 14, spd: 16, crit: 14,
      lore: 'The crowned king of the Slime Kingdom. Don\'t let his goofy face fool you — his acidic body dissolves armor on contact, and he reforms after every hit.',
      skill: { name: 'Acid Touch', type: 'dot', val: 12, chance: 0.3 } },
    { name: 'Dark Spirit',      cls: 'assassin', type: 'assassin',
      image: 'assets/heroes/dark_spirit.png',  hp: 65,  atk: 32, def: 6,  spd: 22, crit: 22,
      lore: 'A wraith torn from the void between worlds. The Dark Spirit phases through solid matter, striking from angles no mortal can predict or defend.',
      skill: { name: 'Phase Strike', type: 'dodge_buff', val: 0.35, chance: 0.25 } },
    { name: 'Dark Warlock',     cls: 'assassin', type: 'assassin',
      image: 'assets/heroes/dark_warlock.png',  hp: 72,  atk: 30, def: 8,  spd: 18, crit: 16,
      lore: 'Cursed by forbidden rituals, the Dark Warlock channels shadow flames that burn the soul. His grimoire contains spells that drive enemies mad.',
      skill: { name: 'Shadow Hex', type: 'debuff_spd', val: 0.3, chance: 0.3 } },
    { name: 'King',             cls: 'assassin', type: 'assassin',
      image: 'assets/heroes/king.png',  hp: 95,  atk: 26, def: 16, spd: 14, crit: 12,
      lore: 'The King fights not from a throne, but from the front lines. His golden scepter channels royal authority into devastating critical strikes.',
      skill: { name: 'Royal Execution', type: 'crit_boost', val: 1.8, chance: 0.2 } },
];

// ===== STARTER PACK — 3 heroes untuk onboarding =====
const STARTER_HEROES = ['Silver Knight', 'Fire Wielder', 'Princess'];

// ===== CLASS-BASED STARTER TEAMS =====
// Each class choice gives 3 starter heroes
const CLASS_STARTER_MAP = {
    warrior: { heroes: ['Silver Knight', 'Forest Warrior', 'Princess'],   desc: 'Tanky defensive team' },
    mage:    { heroes: ['Fire Wielder', 'Ice Witch', 'Princess'],         desc: 'Devastating magic damage' },
    archer:  { heroes: ['Shadow Stalker', 'Demon Hunter', 'Princess'],    desc: 'Swift ranged DPS' },
};

// ===== LEVEL UNLOCK SYSTEM =====
// Setiap level unlock hero baru (rarity common)
const LEVEL_UNLOCKS = {
    1:  { hero: null,                    reward: null,              desc: 'Welcome to Pixel Raid!' },
    2:  { hero: 'Forest Warrior',       reward: null,              desc: '⚔️ Forest Warrior unlocked!' },
    3:  { hero: null,                    reward: { gold: 200 },    desc: '💰 200 Gold bonus!' },
    4:  { hero: 'Shadow Stalker',       reward: null,              desc: '🏹 Shadow Stalker unlocked!' },
    5:  { hero: 'Golem',                reward: { gems: 3 },      desc: '💚 Golem + 3 Gems!' },
    6:  { hero: 'Demon Hunter',         reward: null,              desc: '🏹 Demon Hunter unlocked!' },
    7:  { hero: 'Ice Witch',            reward: null,              desc: '🔮 Ice Witch unlocked!' },
    8:  { hero: 'Dark Spirit',          reward: { gold: 500 },    desc: '🗡️ Dark Spirit + 500 Gold!' },
    9:  { hero: 'Queen\'s Guard',       reward: null,              desc: '⚔️ Queen\'s Guard unlocked!' },
    10: { hero: 'Frost Giant',          reward: { gems: 5 },      desc: '🏹 Frost Giant + 5 Gems!' },
    11: { hero: 'Golden Paladin',       reward: null,              desc: '💚 Golden Paladin unlocked!' },
    12: { hero: 'Arch Mage',            reward: null,              desc: '🔮 Arch Mage unlocked!' },
    13: { hero: 'Slime Lord',           reward: { gold: 800 },    desc: '🗡️ Slime Lord + 800 Gold!' },
    14: { hero: 'Dark Knight',          reward: null,              desc: '⚔️ Dark Knight unlocked!' },
    15: { hero: 'Stone Golem',          reward: { gems: 8 },      desc: '💚 Stone Golem + 8 Gems!' },
    16: { hero: 'King\'s Mage',         reward: null,              desc: '🔮 King\'s Mage unlocked!' },
    17: { hero: 'Dark Sorcerer',        reward: null,              desc: '🔮 Dark Sorcerer unlocked!' },
    18: { hero: 'Dark Warlock',         reward: { gold: 1200 },   desc: '🗡️ Dark Warlock + 1200 Gold!' },
    19: { hero: 'King',                 reward: { gems: 10 },     desc: '🗡️ King (Rare!) + 10 Gems!' },
    20: { hero: 'Golden Paladin',       reward: { gold: 2000, gems: 15 }, desc: '💚 GOLDEN PALADIN UNLOCKED! + 2000 Gold + 15 Gems!' },
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
            mana: 0,    // starts at 0, gains +1 per turn in battle (max 10)
            maxMana: 0, // tracks max mana cap per turn
        },
        skill: { ...template.skill },
        level: 1,
        exp: 0,
        equipped: false,
        inDeck: false,
        artSeed: Math.floor(Math.random() * 999999), // for procedural pixel art fallback
    };
    card.stats.maxHp = card.stats.hp;
    card.type = template.type || template.cls; // hero type for synergy (warrior/mage/archer/tank/healer/assassin)
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
