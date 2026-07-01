/* ========================================
 * PIXEL RAID — Unit Card Data (Phase 1)
 * Tactical Auto Battler — Units become board entities
 * Simple: cost, atk, hp, type, pixelColor
 * ======================================== */

// Unit card templates — cards that become units on the board
const UNIT_TEMPLATES = [
    // ===== COST 1 — Cheap fodder =====
    { id: 'goblin_scout',    name: 'Goblin Scout',    cost: 1, atk: 2,  hp: 2,  type: 'goblin',   pixelColor: '#66aa44', emoji: '👺', desc: 'Quick and cheap' },
    { id: 'slime',           name: 'Slime',           cost: 1, atk: 1,  hp: 3,  type: 'beast',    pixelColor: '#44cc88', emoji: '🟢', desc: 'Sticky and durable' },
    { id: 'skeleton',        name: 'Skeleton',        cost: 1, atk: 2,  hp: 1,  type: 'undead',   pixelColor: '#ccccaa', emoji: '💀', desc: 'Brittle but sharp' },

    // ===== COST 2 — Solid basics =====
    { id: 'goblin_warrior',  name: 'Goblin Warrior',  cost: 2, atk: 3,  hp: 3,  type: 'goblin',   pixelColor: '#55aa33', emoji: '⚔️', desc: 'Reliable fighter' },
    { id: 'forest_archer',   name: 'Forest Archer',   cost: 2, atk: 4,  hp: 2,  type: 'beast',    pixelColor: '#44aa66', emoji: '🏹', desc: 'Strikes from afar' },
    { id: 'skeleton_knight', name: 'Skeleton Knight', cost: 2, atk: 2,  hp: 4,  type: 'undead',   pixelColor: '#aaaaaa', emoji: '🦴', desc: 'Undead tank' },
    { id: 'fire_imp',        name: 'Fire Imp',        cost: 2, atk: 4,  hp: 1,  type: 'machine',  pixelColor: '#ff6644', emoji: '🔥', desc: 'Glass cannon' },
    { id: 'iron_sentinel',   name: 'Iron Sentinel',   cost: 2, atk: 1,  hp: 5,  type: 'machine',  pixelColor: '#8888aa', emoji: '🤖', desc: 'Heavy armor' },

    // ===== COST 3 — Mid-range power =====
    { id: 'goblin_shaman',   name: 'Goblin Shaman',   cost: 3, atk: 3,  hp: 4,  type: 'goblin',   pixelColor: '#88cc44', emoji: '🧙', desc: 'Magic goblin' },
    { id: 'wolf_rider',      name: 'Wolf Rider',      cost: 3, atk: 5,  hp: 3,  type: 'beast',    pixelColor: '#aa8855', emoji: '🐺', desc: 'Fast and fierce' },
    { id: 'dark_knight',     name: 'Dark Knight',     cost: 3, atk: 4,  hp: 4,  type: 'knight',   pixelColor: '#664488', emoji: '🗡️', desc: 'Balanced warrior' },
    { id: 'necromancer',     name: 'Necromancer',     cost: 3, atk: 3,  hp: 3,  type: 'undead',   pixelColor: '#9944aa', emoji: '☠️', desc: 'Raises the dead' },
    { id: 'war_golem',       name: 'War Golem',       cost: 3, atk: 2,  hp: 6,  type: 'machine',  pixelColor: '#777799', emoji: '🗿', desc: 'Near indestructible' },

    // ===== COST 4 — Strong units =====
    { id: 'goblin_chief',    name: 'Goblin Chief',    cost: 4, atk: 5,  hp: 5,  type: 'goblin',   pixelColor: '#44aa22', emoji: '👑', desc: 'Leader of goblinkind' },
    { id: 'dire_wolf',       name: 'Dire Wolf',       cost: 4, atk: 6,  hp: 4,  type: 'beast',    pixelColor: '#886644', emoji: '🐾', desc: 'Apex predator' },
    { id: 'paladin',         name: 'Paladin',         cost: 4, atk: 4,  hp: 6,  type: 'knight',   pixelColor: '#ddaa44', emoji: '🛡️', desc: 'Holy defender' },
    { id: 'vampire_lord',    name: 'Vampire Lord',    cost: 4, atk: 5,  hp: 4,  type: 'undead',   pixelColor: '#cc2244', emoji: '🧛', desc: 'Drains life' },
    { id: 'mech_titan',      name: 'Mech Titan',      cost: 4, atk: 4,  hp: 7,  type: 'machine',  pixelColor: '#5566aa', emoji: '🦾', desc: 'Mechanical colossus' },

    // ===== COST 5 — Premium power =====
    { id: 'dragon_whelp',    name: 'Dragon Whelp',    cost: 5, atk: 7,  hp: 5,  type: 'beast',    pixelColor: '#ff4422', emoji: '🐉', desc: 'Ancient dragon' },
    { id: 'lich_king',       name: 'Lich King',       cost: 5, atk: 6,  hp: 6,  type: 'undead',   pixelColor: '#6622cc', emoji: '👑', desc: 'Supreme undead lord' },
];

// Get a random set of unit cards for a deck
function generateUnitDeck(count = 10) {
    const deck = [];
    // Ensure good cost curve: 3x cost1, 3x cost2, 2x cost3, 1x cost4, 1x cost5
    const costDistribution = [1,1,1, 2,2,2, 3,3, 4, 5];
    const byCost = {};
    for (const t of UNIT_TEMPLATES) {
        if (!byCost[t.cost]) byCost[t.cost] = [];
        byCost[t.cost].push(t);
    }
    for (let i = 0; i < count; i++) {
        const targetCost = costDistribution[i] || Math.ceil(Math.random() * 5);
        const pool = byCost[targetCost] || UNIT_TEMPLATES;
        const tmpl = pool[Math.floor(Math.random() * pool.length)];
        deck.push({
            id: Date.now() + Math.random(),
            templateId: tmpl.id,
            name: tmpl.name,
            cost: tmpl.cost,
            atk: tmpl.atk,
            hp: tmpl.hp,
            maxHp: tmpl.hp,
            type: tmpl.type,
            pixelColor: tmpl.pixelColor,
            emoji: tmpl.emoji,
            desc: tmpl.desc,
        });
    }
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// Generate enemy deck scaled to stage
function generateEnemyUnitDeck(stage = 1) {
    const scale = 1 + (stage - 1) * 0.15;
    const deck = generateUnitDeck(10);
    for (const card of deck) {
        card.atk = Math.max(1, Math.floor(card.atk * scale));
        card.hp = Math.max(1, Math.floor(card.hp * scale));
        card.maxHp = card.hp;
    }
    return deck;
}
