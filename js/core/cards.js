/* ========================================
 * PIXEL RAID — Skill Card Data System
 * 20 starter cards: Attack, Defense, Buff, Debuff, Special
 * ======================================== */

// Card categories
// RARITIES is already defined in heroes.js — no need to duplicate here

const CARD_TYPES = {
    attack:  { name: 'Attack',  emoji: '⚔️', color: '#ff4444' },
    defense: { name: 'Defense', emoji: '🛡️', color: '#4488ff' },
    buff:    { name: 'Buff',    emoji: '✨', color: '#44ff88' },
    debuff:  { name: 'Debuff',  emoji: '💀', color: '#9b59b6' },
    special: { name: 'Special', emoji: '⚡', color: '#ffaa00' },
};

// Skill card templates — the master list of all cards in the game
const SKILL_CARD_TEMPLATES = [
    // ===== ATTACK CARDS =====
    {
        id: 'fireball',
        name: 'Fireball',
        type: 'attack',
        rarity: 'common',
        manaCost: 2,
        effect: { type: 'damage', value: 25, target: 'enemy' },
        description: 'Deal 25 damage to enemy',
        pixelColor: '#ff4422',
    },
    {
        id: 'power_slash',
        name: 'Power Slash',
        type: 'attack',
        rarity: 'common',
        manaCost: 1,
        effect: { type: 'damage', value: 15, target: 'enemy' },
        description: 'Deal 15 damage to enemy',
        pixelColor: '#ff6644',
    },
    {
        id: 'lightning',
        name: 'Lightning',
        type: 'attack',
        rarity: 'rare',
        manaCost: 3,
        effect: { type: 'damage', value: 40, target: 'enemy' },
        description: 'Deal 40 damage to enemy',
        pixelColor: '#ffff44',
    },
    {
        id: 'shadow_bolt',
        name: 'Shadow Bolt',
        type: 'attack',
        rarity: 'rare',
        manaCost: 2,
        effect: { type: 'damage', value: 30, target: 'enemy', bonus: { type: 'assassin', mult: 1.5 } },
        description: 'Deal 30 dmg. 1.5x if hero is Assassin',
        pixelColor: '#8844aa',
    },
    {
        id: 'meteor',
        name: 'Meteor',
        type: 'attack',
        rarity: 'epic',
        manaCost: 5,
        effect: { type: 'damage', value: 65, target: 'enemy' },
        description: 'Deal 65 massive damage',
        pixelColor: '#ff2200',
    },

    // ===== DEFENSE CARDS =====
    {
        id: 'shield_up',
        name: 'Shield Up',
        type: 'defense',
        rarity: 'common',
        manaCost: 1,
        effect: { type: 'shield', value: 20, target: 'self', duration: 2 },
        description: 'Gain 20 shield for 2 turns',
        pixelColor: '#4488ff',
    },
    {
        id: 'iron_wall',
        name: 'Iron Wall',
        type: 'defense',
        rarity: 'rare',
        manaCost: 3,
        effect: { type: 'shield', value: 50, target: 'self', duration: 2 },
        description: 'Gain 50 shield for 2 turns',
        pixelColor: '#6688cc',
    },
    {
        id: 'mana_shield',
        name: 'Mana Shield',
        type: 'defense',
        rarity: 'rare',
        manaCost: 2,
        effect: { type: 'shield', value: 35, target: 'self', duration: 3 },
        description: 'Gain 35 shield for 3 turns',
        pixelColor: '#4444ff',
    },
    {
        id: 'divine_protection',
        name: 'Divine Guard',
        type: 'defense',
        rarity: 'epic',
        manaCost: 4,
        effect: { type: 'shield', value: 80, target: 'self', duration: 1 },
        description: 'Gain 80 massive shield for 1 turn',
        pixelColor: '#ffdd44',
    },

    // ===== BUFF CARDS =====
    {
        id: 'battle_cry',
        name: 'Battle Cry',
        type: 'buff',
        rarity: 'common',
        manaCost: 1,
        effect: { type: 'buff', stat: 'atk', value: 0.25, target: 'self', duration: 3 },
        description: '+25% ATK for 3 turns',
        pixelColor: '#ff8844',
    },
    {
        id: 'haste',
        name: 'Haste',
        type: 'buff',
        rarity: 'common',
        manaCost: 1,
        effect: { type: 'buff', stat: 'spd', value: 0.30, target: 'self', duration: 2 },
        description: '+30% SPD for 2 turns',
        pixelColor: '#44ddff',
    },
    {
        id: 'focus',
        name: 'Focus',
        type: 'buff',
        rarity: 'rare',
        manaCost: 2,
        effect: { type: 'buff', stat: 'crit', value: 20, target: 'self', duration: 3, flat: true },
        description: '+20 flat CRIT for 3 turns',
        pixelColor: '#44ffaa',
    },
    {
        id: 'berserker_rage',
        name: 'Berserker',
        type: 'buff',
        rarity: 'epic',
        manaCost: 3,
        effect: { type: 'buff', stat: 'atk', value: 0.50, target: 'self', duration: 2 },
        description: '+50% ATK for 2 turns',
        pixelColor: '#ff2244',
    },

    // ===== DEBUFF CARDS =====
    {
        id: 'weaken',
        name: 'Weaken',
        type: 'debuff',
        rarity: 'common',
        manaCost: 1,
        effect: { type: 'debuff', stat: 'atk', value: 0.20, target: 'enemy', duration: 2 },
        description: 'Reduce enemy ATK by 20% for 2 turns',
        pixelColor: '#9b59b6',
    },
    {
        id: 'slow',
        name: 'Slow',
        type: 'debuff',
        rarity: 'common',
        manaCost: 1,
        effect: { type: 'debuff', stat: 'spd', value: 0.30, target: 'enemy', duration: 2 },
        description: 'Reduce enemy SPD by 30% for 2 turns',
        pixelColor: '#8844cc',
    },
    {
        id: 'armor_break',
        name: 'Armor Break',
        type: 'debuff',
        rarity: 'rare',
        manaCost: 2,
        effect: { type: 'debuff', stat: 'def', value: 0.40, target: 'enemy', duration: 2 },
        description: 'Reduce enemy DEF by 40% for 2 turns',
        pixelColor: '#cc4444',
    },
    {
        id: 'curse',
        name: 'Curse',
        type: 'debuff',
        rarity: 'epic',
        manaCost: 3,
        effect: { type: 'debuff', stat: 'all', value: 0.15, target: 'enemy', duration: 3 },
        description: 'Reduce ALL enemy stats by 15% for 3 turns',
        pixelColor: '#6622aa',
    },

    // ===== SPECIAL CARDS =====
    {
        id: 'heal',
        name: 'Heal',
        type: 'special',
        rarity: 'common',
        manaCost: 2,
        effect: { type: 'heal', value: 30, target: 'self' },
        description: 'Restore 30 HP',
        pixelColor: '#44ff88',
    },
    {
        id: 'life_drain',
        name: 'Life Drain',
        type: 'special',
        rarity: 'rare',
        manaCost: 3,
        effect: { type: 'lifesteal', value: 25, target: 'enemy' },
        description: 'Deal 25 dmg and heal for the same amount',
        pixelColor: '#88ff44',
    },
    {
        id: 'mana_burst',
        name: 'Mana Burst',
        type: 'special',
        rarity: 'epic',
        manaCost: 0,
        effect: { type: 'mana_gain', value: 3, target: 'self' },
        description: 'Gain 3 mana immediately (free to cast)',
        pixelColor: '#44aaff',
    },
];

// Get card template by id
function getSkillCardById(id) {
    return SKILL_CARD_TEMPLATES.find(c => c.id === id);
}

// Get all cards of a type
function getCardsByType(type) {
    return SKILL_CARD_TEMPLATES.filter(c => c.type === type);
}

// Get all cards of a rarity
function getCardsByRarity(rarity) {
    return SKILL_CARD_TEMPLATES.filter(c => c.rarity === rarity);
}
