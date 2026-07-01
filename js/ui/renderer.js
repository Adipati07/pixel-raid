/* ========================================
 * PIXEL RAID — Premium Canvas Renderer (v4)
 * Yu-Gi-Oh style field with TCG Chaos Rising aesthetics
 * Dark gradient backgrounds, glowing zones, animated LP bars
 * ======================================== */

// Image cache to avoid re-loading
const _imageCache = {};
const _bgImageCache = {};

function _loadImage(src) {
    if (_imageCache[src]) return _imageCache[src];
    const img = new Image();
    img.src = src;
    img.onerror = () => { img._failed = true; };
    _imageCache[src] = img;
    return img;
}

function _loadBgImage(src) {
    if (_bgImageCache[src]) return _bgImageCache[src];
    const img = new Image();
    img.src = src;
    img.onerror = () => { img._failed = true; };
    _bgImageCache[src] = img;
    return img;
}

// Stage → background image mapping
function getStageBackground(stage) {
    if (stage <= 3) return 'assets/backgrounds/battleback_forest.png';
    if (stage <= 6) return 'assets/backgrounds/battleback_grassland.png';
    if (stage <= 9) return 'assets/backgrounds/battleback_desert.png';
    if (stage <= 12) return 'assets/backgrounds/battleback_snow.png';
    if (stage <= 15) return 'assets/backgrounds/battleback_dungeon.png';
    if (stage <= 18) return 'assets/backgrounds/battleback_night.png';
    return 'assets/backgrounds/volcano_bg.png';
}

// ===== COLOR PALETTE (Pixel Raid Design System) =====
const PR_COLORS = {
    bgDark: '#0f0f23',
    bgMid: '#1a1a2e',
    zoneEmpty: 'rgba(15,52,96,0.3)',
    zoneEmptyBorder: 'rgba(68,136,255,0.3)',
    lpGreen: '#00ff88',
    lpYellow: '#ffd700',
    lpRed: '#e94560',
    gold: '#ffd700',
    textPrimary: '#f0f0f0',
    textSecondary: '#888888',
    divider: '#ffd700',
};

// Phase color map
const PHASE_COLORS = {
    idle:   '#888888',
    draw:   '#4488ff',
    main:   '#00ff88',
    battle: '#e94560',
    end:    '#9b59b6',
};

// Procedural pixel art card sprites (fallback)
const CardRenderer = {
    // Generate deterministic pixel art from card's artSeed
    drawCardSprite(canvas, card, size) {
        const ctx = canvas.getContext('2d');
        const s = size || 48;
        canvas.width = s;
        canvas.height = s;

        const pixelSize = Math.max(2, Math.floor(s / 12));
        const rarityColor = RARITIES[card.rarity] ? RARITIES[card.rarity].color : '#aaa';
        const classColor = CLASSES[card.class] ? CLASSES[card.class].color : '#888';

        // Use seed for deterministic random
        let seed = card.artSeed || 12345;
        const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, s, s);

        // Try to draw character image
        const template = getTemplateByName(card.templateId || card.name);
        if (template && template.image) {
            const img = _loadImage(template.image);
            if (img.complete && img.naturalWidth > 0 && !img._failed) {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, s, s);
                ctx.strokeStyle = rarityColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(1, 1, s - 2, s - 2);
                return;
            }
        }

        // Fallback: procedural pixel art
        const ox = Math.floor((s - pixelSize * 10) / 2);
        const oy = Math.floor((s - pixelSize * 12) / 2);

        // Head
        ctx.fillStyle = '#ddb89a';
        for (let x = 3; x <= 6; x++) {
            for (let y = 0; y <= 3; y++) {
                ctx.fillRect(ox + x * pixelSize, oy + y * pixelSize, pixelSize, pixelSize);
            }
        }

        // Eyes
        ctx.fillStyle = '#222';
        ctx.fillRect(ox + 4 * pixelSize, oy + 1 * pixelSize, pixelSize, pixelSize);
        ctx.fillRect(ox + 6 * pixelSize, oy + 1 * pixelSize, pixelSize, pixelSize);

        // Class-specific body
        ctx.fillStyle = classColor;
        for (let x = 3; x <= 6; x++) {
            for (let y = 4; y <= 8; y++) {
                if (rand() > 0.15) {
                    ctx.fillRect(ox + x * pixelSize, oy + y * pixelSize, pixelSize, pixelSize);
                }
            }
        }

        // Class-specific details
        this.drawClassDetails(ctx, card.class, ox, oy, pixelSize, rand, classColor);

        // Legs
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(ox + 3 * pixelSize, oy + 9 * pixelSize, pixelSize * 2, pixelSize * 2);
        ctx.fillRect(ox + 6 * pixelSize, oy + 9 * pixelSize, pixelSize * 2, pixelSize * 2);

        // Rarity glow border
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, s - 2, s - 2);

        // Rarity stars
        const starCount = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 }[card.rarity] || 1;
        ctx.fillStyle = rarityColor;
        for (let i = 0; i < starCount; i++) {
            ctx.fillRect(ox + (i * 2 + 1) * pixelSize, oy + 11.5 * pixelSize, pixelSize, pixelSize);
        }
    },

    drawClassDetails(ctx, cls, ox, oy, ps, rand, color) {
        switch (cls) {
            case 'warrior':
                ctx.fillStyle = '#aaaacc';
                ctx.fillRect(ox + 8 * ps, oy + 3 * ps, ps, ps * 5);
                ctx.fillStyle = '#ffdd44';
                ctx.fillRect(ox + 7 * ps, oy + 4 * ps, ps * 3, ps);
                ctx.fillStyle = '#888899';
                ctx.fillRect(ox + 3 * ps, oy, ps * 4, ps);
                break;
            case 'mage':
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(ox + 1 * ps, oy + 2 * ps, ps, ps * 7);
                ctx.fillStyle = '#9b59b6';
                ctx.fillRect(ox + 0 * ps, oy + 1 * ps, ps * 3, ps * 2);
                ctx.fillStyle = '#6633aa';
                ctx.fillRect(ox + 4 * ps, oy - ps, ps * 2, ps);
                ctx.fillRect(ox + 3 * ps, oy, ps * 4, ps);
                break;
            case 'archer':
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(ox + 8 * ps, oy + 2 * ps, ps, ps * 5);
                ctx.fillStyle = '#aaa';
                ctx.fillRect(ox + 8 * ps, oy + 1 * ps, ps, ps);
                ctx.fillRect(ox + 8 * ps, oy + 7 * ps, ps, ps);
                ctx.fillStyle = '#2d5a2d';
                ctx.fillRect(ox + 3 * ps, oy - ps, ps * 4, ps);
                break;
            case 'healer':
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(ox + 5 * ps, oy + 4 * ps, ps, ps * 3);
                ctx.fillRect(ox + 4 * ps, oy + 5 * ps, ps * 3, ps);
                ctx.fillStyle = '#ffdd44';
                ctx.fillRect(ox + 4 * ps, oy - ps, ps * 3, ps);
                break;
            case 'assassin':
                ctx.fillStyle = '#cc4466';
                ctx.fillRect(ox + 1 * ps, oy + 4 * ps, ps, ps * 3);
                ctx.fillRect(ox + 8 * ps, oy + 4 * ps, ps, ps * 3);
                ctx.fillStyle = '#333';
                ctx.fillRect(ox + 3 * ps, oy + 1 * ps, ps * 4, ps);
                break;
        }
    },

    // Draw full card with Pokemon TCG Chaos Rising style
    drawFullCard(canvas, card, width, height) {
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;

        const rarityColor = RARITIES[card.rarity] ? RARITIES[card.rarity].color : '#aaa';
        const cls = CLASSES[card.class] || {};
        const clsColor = cls.color || '#888';

        const darken = (hex, amt) => {
            const num = parseInt(hex.replace('#',''), 16);
            const r = Math.max(0, (num >> 16) - amt);
            const g = Math.max(0, ((num >> 8) & 0xFF) - amt);
            const b = Math.max(0, (num & 0xFF) - amt);
            return `rgb(${r},${g},${b})`;
        };
        const lighten = (hex, amt) => {
            const num = parseInt(hex.replace('#',''), 16);
            const r = Math.min(255, (num >> 16) + amt);
            const g = Math.min(255, ((num >> 8) & 0xFF) + amt);
            const b = Math.min(255, (num & 0xFF) + amt);
            return `rgb(${r},${g},${b})`;
        };

        const pad = 4;

        // 1. Outer border — class-colored
        ctx.fillStyle = clsColor;
        ctx.fillRect(0, 0, width, height);

        // 2. Inner dark border
        ctx.fillStyle = '#111';
        ctx.fillRect(pad, pad, width - pad * 2, height - pad * 2);

        // 3. Card body gradient
        const bodyGrad = ctx.createLinearGradient(0, 0, 0, height);
        bodyGrad.addColorStop(0, lighten(clsColor, 30));
        bodyGrad.addColorStop(0.15, darken(clsColor, 60));
        bodyGrad.addColorStop(0.85, darken(clsColor, 80));
        bodyGrad.addColorStop(1, darken(clsColor, 40));
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(pad + 1, pad + 1, width - (pad + 1) * 2, height - (pad + 1) * 2);

        const innerX = pad + 4;
        const innerW = width - (pad + 4) * 2;

        // 4. Header: Name + HP
        const headerY = pad + 4;
        const headerH = 16;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(innerX, headerY, innerW, headerH);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(card.name, innerX + 3, headerY + 12);

        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 10px "Press Start 2P"';
        ctx.textAlign = 'right';
        ctx.fillText(`HP ${card.stats.hp}`, innerX + innerW - 3, headerY + 12);

        // Class emoji + rarity stars
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(cls.emoji || '⚔', innerX + 1, headerY + 8);

        const starCount = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 }[card.rarity] || 1;
        ctx.fillStyle = '#ffd700';
        ctx.font = '6px sans-serif';
        ctx.fillText('★'.repeat(starCount), innerX + 16, headerY + 7);

        // 5. Artwork window
        const artY = headerY + headerH + 3;
        const artH = height * 0.35;
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(innerX, artY, innerW, artH);

        // Draw sprite
        const spriteSize = Math.min(innerW - 8, artH - 8);
        const spriteX2 = innerX + (innerW - spriteSize) / 2;
        const template = getTemplateByName(card.templateId || card.name);

        if (template && template.image) {
            const img = _loadImage(template.image);
            if (img.complete && img.naturalWidth > 0 && !img._failed) {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, spriteX2, artY + 4, spriteSize, spriteSize);
            } else {
                const spriteCanvas = document.createElement('canvas');
                this.drawCardSprite(spriteCanvas, card, spriteSize);
                ctx.drawImage(spriteCanvas, spriteX2, artY + 4);
            }
        } else {
            const spriteCanvas = document.createElement('canvas');
            this.drawCardSprite(spriteCanvas, card, spriteSize);
            ctx.drawImage(spriteCanvas, spriteX2, artY + 4);
        }

        // Golden artwork frame
        ctx.strokeStyle = '#c8a832';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(innerX, artY, innerW, artH);

        // Holographic shimmer for rare+
        if (card.rarity !== 'common') {
            const shimGrad = ctx.createLinearGradient(0, artY, width, artY + artH);
            shimGrad.addColorStop(0, 'rgba(255,255,255,0)');
            shimGrad.addColorStop(0.35, 'rgba(255,255,255,0.08)');
            shimGrad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
            shimGrad.addColorStop(0.65, 'rgba(255,255,255,0.08)');
            shimGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = shimGrad;
            ctx.fillRect(innerX + 1, artY + 1, innerW - 2, artH - 2);
        }

        // 6. Type info line
        const infoY = artY + artH + 3;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(innerX, infoY, innerW, 10);

        ctx.fillStyle = clsColor;
        ctx.font = '7px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(cls.name || 'Hero', innerX + 3, infoY + 8);

        ctx.fillStyle = rarityColor;
        ctx.textAlign = 'right';
        ctx.fillText(RARITIES[card.rarity] ? RARITIES[card.rarity].name : '', innerX + innerW - 3, infoY + 8);

        // 7. Stats box
        const statsY = infoY + 13;
        const statsH = height - statsY - pad - 4;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(innerX, statsY, innerW, statsH);

        // HP Bar
        const hpBarY3 = statsY + 4;
        const hpBarH3 = 8;
        ctx.fillStyle = '#222';
        ctx.fillRect(innerX + 3, hpBarY3, innerW - 6, hpBarH3);
        ctx.fillStyle = '#44cc44';
        ctx.fillRect(innerX + 3, hpBarY3, innerW - 6, hpBarH3);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(innerX + 3, hpBarY3, innerW - 6, hpBarH3);
        ctx.fillStyle = '#fff';
        ctx.font = '5px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(`${card.stats.hp}/${card.stats.hp}`, innerX + innerW / 2, hpBarY3 + 6);

        // Stats rows (ATK, DEF, SPD, CRIT)
        const statDefs = [
            { label: 'ATK', value: card.stats.atk, color: '#ff6644' },
            { label: 'DEF', value: card.stats.def, color: '#4488ff' },
            { label: 'SPD', value: card.stats.spd, color: '#ffaa00' },
            { label: 'CRIT', value: card.stats.crit + '%', color: '#ff44aa' },
        ];

        ctx.font = '7px "Press Start 2P"';
        const statRowY = hpBarY3 + hpBarH3 + 6;
        statDefs.forEach((stat, i) => {
            const sx = innerX + 3;
            const sy = statRowY + i * 12;
            if (sy + 10 > statsY + statsH) return;
            ctx.fillStyle = '#888';
            ctx.textAlign = 'left';
            ctx.fillText(stat.label, sx, sy + 8);
            ctx.fillStyle = stat.color;
            ctx.fillText(String(stat.value), sx + 40, sy + 8);
        });

        // Power (bottom center)
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('PWR ' + getCardPower(card), width / 2, height - pad - 6);
    },
};

// ===== YU-GI-OH BATTLE CANVAS RENDERER (v4 — Premium Redesign) =====
const BattleRenderer = {
    // Attack animation state
    _attackAnims: [],
    _animating: false,
    _lastRenderArgs: null,
    _hoveredZone: null,
    _clickHandlers: [],
    _enemyPositions: {},

    // Field zone layout constants
    ZONE_WIDTH: 80,
    ZONE_HEIGHT: 110,
    SKILL_ZONE_WIDTH: 55,
    SKILL_ZONE_HEIGHT: 60,

    /**
     * Main render entry point — receives full combatant state
     */
    renderBattle(player, enemy) {
        this._lastRenderArgs = { player, enemy };

        const canvas = document.getElementById('battle-canvas');
        if (!canvas || canvas.tagName !== 'CANVAS') return;

        const container = canvas.parentElement;
        const W = container ? Math.min(container.clientWidth, 600) : 600;
        const H = 400;
        canvas.width = W;
        canvas.height = H;

        const ctx = canvas.getContext('2d');

        // 1. Premium background with gradient + grid
        this._drawBackground(ctx, W, H);

        // Layout: divide into 6 rows
        const rowH = H / 6;

        // 2. Enemy Info Bar (top row — rows 0-1)
        this._drawInfoBar(ctx, enemy, 0, 0, W, rowH, false);

        // 3. Enemy Field (rows 1-3)
        this._drawFieldZones(ctx, enemy, 0, rowH, W, rowH * 2, false);

        // 4. Center Divider with VS badge (row 3-4)
        this._drawCenterDivider(ctx, 0, rowH * 3, W, rowH, player, enemy);

        // 5. Player Field (rows 3-5)
        this._drawFieldZones(ctx, player, 0, rowH * 4, W, rowH, true);

        // 6. Player Info Bar (bottom row — row 5-6)
        this._drawInfoBar(ctx, player, 0, rowH * 5, W, rowH, true);

        // Attack animation overlays
        for (const anim of this._attackAnims) {
            this._drawAttackAnim(ctx, anim, W, H);
        }

        // Battle animation overlays (summon effects, attack flashes)
        if (typeof BattleAnimations !== 'undefined') {
            BattleAnimations.update();
            BattleAnimations.renderOverlay(ctx, W, H);
        }

        // Register click handler for zones
        this._registerClickHandler(canvas, W, H);
    },

    // ===== BACKGROUND — Dark gradient with stone tile grid =====
    _drawBackground(ctx, W, H) {
        // Try stage background image first
        const stage = GameState ? GameState.player.stage : 1;
        const bgSrc = getStageBackground(stage);
        const bgImg = _loadBgImage(bgSrc);

        // Dark gradient base
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, PR_COLORS.bgDark);
        bgGrad.addColorStop(1, PR_COLORS.bgMid);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Try to draw stage background with overlay
        if (bgImg.complete && bgImg.naturalWidth > 0 && !bgImg._failed) {
            ctx.globalAlpha = 0.15;
            ctx.drawImage(bgImg, 0, 0, W, H);
            ctx.globalAlpha = 1;
        }

        // Stone tile grid pattern
        ctx.strokeStyle = 'rgba(68,136,255,0.06)';
        ctx.lineWidth = 1;
        const gridSize = 25;
        for (let x = 0; x <= W; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        for (let y = 0; y <= H; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        // Subtle vignette effect
        const vignetteGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
        vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, W, H);
    },

    // ===== INFO BAR — LP bar with gradient fill (green→yellow→red) =====
    _drawInfoBar(ctx, combatant, x, y, w, h, isPlayer) {
        // Background — dark panel
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, isPlayer ? 'rgba(0,20,40,0.85)' : 'rgba(40,10,10,0.85)');
        grad.addColorStop(1, 'rgba(5,5,20,0.95)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        // Accent border — top for enemy, bottom for player
        const accentColor = isPlayer ? PR_COLORS.lpGreen : PR_COLORS.lpRed;
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, isPlayer ? y + h - 2 : y, w, 2);
        ctx.globalAlpha = 1;

        const padding = 12;
        const textY = y + h / 2 + 4;

        // Class emoji portrait (left)
        const hero = combatant.hero || (combatant.heroes && combatant.heroes[0]);
        if (hero) {
            const cls = CLASSES[hero.class || hero.cls];
            if (cls) {
                ctx.font = '16px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(cls.emoji, x + padding, textY + 5);
            }
        }

        // Name
        ctx.fillStyle = PR_COLORS.textPrimary;
        ctx.font = 'bold 10px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(combatant.name || 'Unknown', x + padding + 22, textY - 6);

        // LP Bar — with green→yellow→red gradient
        const lpBarX = x + 160;
        const lpBarW = Math.min(200, w - 320);
        const lpBarH = 14;
        const lpBarY = y + (h - lpBarH) / 2;
        const maxHP = BattleEngine.HERO_HP || 20;
        const hpPct = Math.max(0, combatant.heroHp / maxHP);

        // Use animated HP if available
        let displayHP = combatant.heroHp;
        if (typeof BattleAnimations !== 'undefined') {
            const animatedHP = BattleAnimations.getAnimatedLP(isPlayer ? 'player' : 'enemy');
            if (animatedHP !== null) {
                displayHP = animatedHP;
                const animPct = Math.max(0, animatedHP / maxHP);
                this._drawLPBar(ctx, lpBarX, lpBarY, lpBarW, lpBarH, animPct, displayHP, maxHP);
            } else {
                this._drawLPBar(ctx, lpBarX, lpBarY, lpBarW, lpBarH, hpPct, displayHP, maxHP);
            }
        } else {
            this._drawLPBar(ctx, lpBarX, lpBarY, lpBarW, lpBarH, hpPct, displayHP, maxHP);
        }

        // Deck count (right side)
        ctx.fillStyle = PR_COLORS.textSecondary;
        ctx.font = '7px "Press Start 2P"';
        ctx.textAlign = 'right';
        ctx.fillText(`DECK: ${combatant.deck ? combatant.deck.length : 0}`, x + w - padding, textY - 6);

        // Graveyard count
        ctx.fillStyle = 'rgba(136,136,136,0.7)';
        ctx.font = '6px "Press Start 2P"';
        ctx.fillText(`GY: ${combatant.graveyard ? combatant.graveyard.length : 0}`, x + w - padding, textY + 8);
    },

    /**
     * Draw an LP bar with green→yellow→red gradient fill
     */
    _drawLPBar(ctx, x, y, w, h, pct, currentLP, maxLP) {
        // Bar background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y, w, h);

        // LP fill with gradient based on health percentage
        if (pct > 0) {
            const fillGrad = ctx.createLinearGradient(x, y, x + w * pct, y);
            if (pct > 0.55) {
                // Green zone
                fillGrad.addColorStop(0, PR_COLORS.lpGreen);
                fillGrad.addColorStop(1, '#00cc66');
            } else if (pct > 0.25) {
                // Green → Yellow transition
                const yellowPct = (0.55 - pct) / 0.3;
                fillGrad.addColorStop(0, PR_COLORS.lpGreen);
                fillGrad.addColorStop(Math.max(0.01, 1 - yellowPct), PR_COLORS.lpYellow);
                fillGrad.addColorStop(1, PR_COLORS.lpYellow);
            } else {
                // Yellow → Red zone
                fillGrad.addColorStop(0, PR_COLORS.lpYellow);
                fillGrad.addColorStop(0.5, PR_COLORS.lpRed);
                fillGrad.addColorStop(1, '#cc0033');
            }
            ctx.fillStyle = fillGrad;
            ctx.fillRect(x + 1, y + 1, (w - 2) * pct, h - 2);

            // Inner shine
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(x + 1, y + 1, (w - 2) * pct, (h - 2) / 2);
        }

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        // LP text
        ctx.fillStyle = PR_COLORS.textPrimary;
        ctx.font = 'bold 7px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(`LP ${currentLP} / ${maxLP}`, x + w / 2, y + h - 3);
    },

    // ===== FIELD ZONES — Monster zones (3) + Spell/Trap zones (2) =====
    _drawFieldZones(ctx, combatant, x, y, w, h, isPlayer) {
        const zoneW = this.ZONE_WIDTH;
        const zoneH = this.ZONE_HEIGHT;
        const skillW = this.SKILL_ZONE_WIDTH;
        const skillH = this.SKILL_ZONE_HEIGHT;
        const gap = 10;

        // Hero zones: centered, 3 zones
        const totalHeroW = zoneW * 3 + gap * 2;
        const heroStartX = x + (w - totalHeroW) / 2;
        const heroY = y + (h - zoneH) / 2;

        // Draw 3 Hero/Monster Zones
        for (let i = 0; i < 3; i++) {
            const zx = heroStartX + i * (zoneW + gap);
            const hero = combatant.heroZones ? combatant.heroZones[i] : null;
            this._drawZone(ctx, zx, heroY, zoneW, zoneH, hero, 'hero', isPlayer, i, combatant);
        }

        // Skill/Spell zones: flanking hero zones
        const skillY = y + (h - skillH) / 2;

        // Left skill zone
        const leftSkillX = heroStartX - skillW - 15;
        const leftSkill = combatant.skillZones ? combatant.skillZones[0] : null;
        this._drawZone(ctx, leftSkillX, skillY, skillW, skillH, leftSkill, 'skill', isPlayer, 0, combatant);

        // Right skill zone
        const rightSkillX = heroStartX + totalHeroW + 15;
        const rightSkill = combatant.skillZones ? combatant.skillZones[1] : null;
        this._drawZone(ctx, rightSkillX, skillY, skillW, skillH, rightSkill, 'skill', isPlayer, 1, combatant);
    },

    /**
     * Draw a single zone (hero or skill) with premium styling
     */
    _drawZone(ctx, x, y, w, h, card, zoneType, isPlayer, zoneIndex, combatant) {
        if (!card) {
            // Empty zone — dashed border with subtle fill
            ctx.fillStyle = PR_COLORS.zoneEmpty;
            ctx.fillRect(x, y, w, h);

            // Dashed border
            ctx.strokeStyle = PR_COLORS.zoneEmptyBorder;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);

            // Zone icon placeholder
            ctx.fillStyle = 'rgba(68,136,255,0.15)';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(zoneType === 'hero' ? '⚔' : '✨', x + w / 2, y + h / 2 + 8);

            // Zone label
            ctx.fillStyle = 'rgba(68,136,255,0.4)';
            ctx.font = '5px "Press Start 2P"';
            ctx.fillText(zoneType === 'hero' ? `HERO ${zoneIndex + 1}` : `SPELL ${zoneIndex + 1}`, x + w / 2, y - 4);
            return;
        }

        // Occupied zone — solid border with rarity glow
        const rarityColor = RARITIES[card.rarity] ? RARITIES[card.rarity].color : '#555';

        // Zone glow background
        ctx.fillStyle = 'rgba(0,10,30,0.8)';
        ctx.fillRect(x, y, w, h);

        // Glow effect for rarity
        ctx.shadowColor = rarityColor;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0;

        // Zone label
        ctx.fillStyle = rarityColor;
        ctx.font = '5px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(zoneType === 'hero' ? `HERO ${zoneIndex + 1}` : `SPELL ${zoneIndex + 1}`, x + w / 2, y - 4);

        // Draw card content
        if (card.faceUp === false) {
            // Face-down card back
            this._drawCardBack(ctx, x + 3, y + 3, w - 6, h - 6, rarityColor);
            return;
        }

        if (zoneType === 'hero') {
            this._drawHeroCard(ctx, card, x, y, w, h, isPlayer);
        } else {
            this._drawSkillCard(ctx, card, x, y, w, h);
        }
    },

    /**
     * Draw card back (face-down)
     */
    _drawCardBack(ctx, x, y, w, h, accentColor) {
        ctx.fillStyle = '#0a0a2a';
        ctx.fillRect(x, y, w, h);

        // Pattern
        ctx.strokeStyle = 'rgba(68,136,255,0.2)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < w + h; i += 8) {
            ctx.beginPath();
            ctx.moveTo(x + i, y);
            ctx.lineTo(x, y + i);
            ctx.stroke();
        }

        // Inner border
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);

        // Question mark
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 20px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('?', x + w / 2, y + h / 2 + 7);
    },

    // ===== HERO CARD — Pokemon TCG Chaos Rising style =====
    _drawHeroCard(ctx, card, x, y, w, h, isPlayer) {
        const cls = CLASSES[card.class || card.type] || {};
        const clsColor = cls.color || '#888';
        const rarityColor = RARITIES[card.rarity] ? RARITIES[card.rarity].color : '#aaa';

        const darken = (hex, amt) => {
            const num = parseInt(hex.replace('#',''), 16);
            const r = Math.max(0, (num >> 16) - amt);
            const g = Math.max(0, ((num >> 8) & 0xFF) - amt);
            const b = Math.max(0, (num & 0xFF) - amt);
            return `rgb(${r},${g},${b})`;
        };
        const lighten = (hex, amt) => {
            const num = parseInt(hex.replace('#',''), 16);
            const r = Math.min(255, (num >> 16) + amt);
            const g = Math.min(255, ((num >> 8) & 0xFF) + amt);
            const b = Math.min(255, (num & 0xFF) + amt);
            return `rgb(${r},${g},${b})`;
        };

        const pad = 3;

        // 1. Outer border — class-colored thick frame
        ctx.fillStyle = clsColor;
        ctx.fillRect(x, y, w, h);

        // 2. Inner border — dark outline
        ctx.fillStyle = '#111';
        ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);

        // 3. Card body gradient — class-tinted
        const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
        bodyGrad.addColorStop(0, lighten(clsColor, 30));
        bodyGrad.addColorStop(0.15, darken(clsColor, 60));
        bodyGrad.addColorStop(0.85, darken(clsColor, 80));
        bodyGrad.addColorStop(1, darken(clsColor, 40));
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(x + pad + 1, y + pad + 1, w - (pad + 1) * 2, h - (pad + 1) * 2);

        // 4. Header bar — name + HP
        const headerH = 14;
        const headerY = y + pad + 2;
        const headerX = x + pad + 3;
        const headerW = w - (pad + 3) * 2;

        // Name banner background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(headerX, headerY, headerW, headerH);

        // Name text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 5px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(card.name, headerX + 2, headerY + 10);

        // HP display (top right)
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 5px "Press Start 2P"';
        ctx.textAlign = 'right';
        ctx.fillText(`HP ${card.currentHp}`, headerX + headerW - 2, headerY + 10);

        // Class type badge (top-left corner)
        ctx.fillStyle = clsColor;
        ctx.font = '6px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(cls.emoji || '⚔', headerX + 1, headerY + 5);

        // Rarity stars
        const rarityStars = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
        const stars = rarityStars[card.rarity] || 1;
        ctx.fillStyle = PR_COLORS.gold;
        ctx.font = '4px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('★'.repeat(stars), headerX + 12, headerY + 5);

        // 5. Artwork window — large sprite area
        const artY = headerY + headerH + 2;
        const artPad = 2;
        const artW = headerW - artPad * 2;
        const artH = h * 0.38;

        // Art background
        ctx.fillStyle = '#0f3460';
        ctx.fillRect(headerX + artPad, artY, artW, artH);

        // Draw sprite
        const spriteSize = Math.min(artW - 4, artH - 4);
        const spriteX = headerX + artPad + (artW - spriteSize) / 2;
        const spriteY = artY + (artH - spriteSize) / 2;

        const template = getTemplateByName(card.templateId || card.name);
        if (template && template.image) {
            const img = _loadImage(template.image);
            if (img.complete && img.naturalWidth > 0 && !img._failed) {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, spriteX, spriteY, spriteSize, spriteSize);
            } else {
                const spriteCanvas = document.createElement('canvas');
                CardRenderer.drawCardSprite(spriteCanvas, card, spriteSize);
                ctx.drawImage(spriteCanvas, spriteX, spriteY);
            }
        } else {
            const spriteCanvas = document.createElement('canvas');
            CardRenderer.drawCardSprite(spriteCanvas, card, spriteSize);
            ctx.drawImage(spriteCanvas, spriteX, spriteY);
        }

        // Golden artwork frame
        ctx.strokeStyle = '#c8a832';
        ctx.lineWidth = 1;
        ctx.strokeRect(headerX + artPad, artY, artW, artH);

        // Holographic shimmer for rare+ cards
        if (card.rarity !== 'common') {
            const shimmerGrad = ctx.createLinearGradient(x, artY, x + w, artY + artH);
            shimmerGrad.addColorStop(0, 'rgba(255,255,255,0)');
            shimmerGrad.addColorStop(0.3, 'rgba(255,255,255,0.06)');
            shimmerGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
            shimmerGrad.addColorStop(0.7, 'rgba(255,255,255,0.06)');
            shimmerGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = shimmerGrad;
            ctx.fillRect(headerX + artPad + 1, artY + 1, artW - 2, artH - 2);
        }

        // 6. Type info line (below artwork)
        const infoY = artY + artH + 2;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(headerX, infoY, headerW, 8);

        ctx.fillStyle = clsColor;
        ctx.font = '4px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`${cls.name || 'Hero'}`, headerX + 2, infoY + 6);

        ctx.fillStyle = rarityColor;
        ctx.textAlign = 'right';
        ctx.fillText(RARITIES[card.rarity] ? RARITIES[card.rarity].name : '', headerX + headerW - 2, infoY + 6);

        // 7. Stats box — ATK | HP bar | DEF
        const statsBoxY = infoY + 10;
        const statsBoxH = h - (statsBoxY - y) - pad - 2;

        // Stats background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(headerX, statsBoxY, headerW, statsBoxH);

        // HP Bar (center, wide)
        const hpBarY2 = statsBoxY + 2;
        const hpBarH2 = 6;
        const hpBarX2 = headerX + 2;
        const hpBarW2 = headerW - 4;
        const hpPct = Math.max(0, card.currentHp / card.maxHp);

        // HP bar background
        ctx.fillStyle = '#222';
        ctx.fillRect(hpBarX2, hpBarY2, hpBarW2, hpBarH2);
        // HP bar fill with gradient
        const hpColor = hpPct > 0.6 ? PR_COLORS.lpGreen : hpPct > 0.3 ? PR_COLORS.lpYellow : PR_COLORS.lpRed;
        ctx.fillStyle = hpColor;
        ctx.fillRect(hpBarX2, hpBarY2, hpBarW2 * hpPct, hpBarH2);
        // HP bar border
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(hpBarX2, hpBarY2, hpBarW2, hpBarH2);
        // HP text on bar
        ctx.fillStyle = '#fff';
        ctx.font = '4px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(`${card.currentHp}/${card.maxHp}`, headerX + headerW / 2, hpBarY2 + 5);

        // ATK (left) and DEF (right) boxes below HP bar
        const totalAtk = (card.stats.atk || 0) + (card.atkBuff || 0);
        const totalDef = (card.stats.def || 0) + (card.defBuff || 0);
        const statBoxY = hpBarY2 + hpBarH2 + 2;
        const halfW = (headerW - 4) / 2;

        // ATK box — red tint
        ctx.fillStyle = 'rgba(233,69,96,0.5)';
        ctx.fillRect(headerX + 2, statBoxY, halfW, statsBoxH - (statBoxY - statsBoxY) - 2);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 5px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`⚔${totalAtk}`, headerX + 4, statBoxY + 7);

        // DEF box — blue tint
        ctx.fillStyle = 'rgba(68,136,255,0.5)';
        ctx.fillRect(headerX + 2 + halfW + 2, statBoxY, halfW - 2, statsBoxH - (statBoxY - statsBoxY) - 2);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText(`🛡${totalDef}`, headerX + headerW - 4, statBoxY + 7);

        // 8. Attack/Defense position indicator
        if (card.position === 'defense') {
            ctx.fillStyle = 'rgba(68,136,255,0.25)';
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = 'rgba(68,136,255,0.9)';
            ctx.font = 'bold 4px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('🛡 DEF', x + w / 2, y + h - 4);
        }

        // 9. Active glow — cards that can attack get a pulsing gold border
        if (card.canAttack && !card.hasAttacked && card.position === 'attack') {
            const pulseAlpha = 0.5 + 0.3 * Math.sin(Date.now() / 200);
            ctx.shadowColor = PR_COLORS.gold;
            ctx.shadowBlur = 8;
            ctx.strokeStyle = `rgba(255,215,0,${pulseAlpha})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
            ctx.shadowBlur = 0;
        }
    },

    // ===== SKILL CARD — Spell/Trap style =====
    _drawSkillCard(ctx, card, x, y, w, h) {
        const typeInfo = CARD_TYPES[card.type] || { emoji: '✨', color: '#888' };
        const rarityColor = RARITIES[card.rarity] ? RARITIES[card.rarity].color : '#aaa';

        // Icon
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(typeInfo.emoji, x + w / 2, y + h / 2 - 4);

        // Name
        ctx.fillStyle = rarityColor;
        ctx.font = '4px "Press Start 2P"';
        ctx.fillText(card.name, x + w / 2, y + h - 12);

        // Description (truncated)
        if (card.description) {
            ctx.fillStyle = PR_COLORS.textSecondary;
            ctx.font = '3px "Press Start 2P"';
            const desc = card.description.length > 20 ? card.description.substring(0, 20) + '...' : card.description;
            ctx.fillText(desc, x + w / 2, y + h - 6);
        }

        // Inner border
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    },

    // ===== CENTER DIVIDER — Decorative VS badge + Phase + Turn =====
    _drawCenterDivider(ctx, x, y, w, h, player, enemy) {
        // Background gradient
        const grad = ctx.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0, 'rgba(0,0,0,0.9)');
        grad.addColorStop(0.3, 'rgba(15,15,35,0.95)');
        grad.addColorStop(0.7, 'rgba(15,15,35,0.95)');
        grad.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        // Gold accent lines (top and bottom)
        ctx.fillStyle = PR_COLORS.gold;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x, y, w, 2);
        ctx.fillRect(x, y + h - 2, w, 2);
        ctx.globalAlpha = 1;

        // Decorative line from left to center
        const lineY = y + h / 2;
        const lineGrad = ctx.createLinearGradient(0, 0, w / 2, 0);
        lineGrad.addColorStop(0, 'rgba(255,215,0,0)');
        lineGrad.addColorStop(1, 'rgba(255,215,0,0.3)');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, lineY);
        ctx.lineTo(w / 2 - 40, lineY);
        ctx.stroke();

        // Decorative line from center to right
        const lineGrad2 = ctx.createLinearGradient(w / 2, 0, w, 0);
        lineGrad2.addColorStop(0, 'rgba(255,215,0,0.3)');
        lineGrad2.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.strokeStyle = lineGrad2;
        ctx.beginPath();
        ctx.moveTo(w / 2 + 40, lineY);
        ctx.lineTo(w, lineY);
        ctx.stroke();

        // VS badge (center, golden diamond shape)
        const cx = w / 2;
        const cy = lineY;
        const badgeSize = 18;

        // Badge background
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = 'rgba(255,215,0,0.15)';
        ctx.fillRect(-badgeSize, -badgeSize, badgeSize * 2, badgeSize * 2);
        ctx.strokeStyle = PR_COLORS.gold;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-badgeSize, -badgeSize, badgeSize * 2, badgeSize * 2);
        ctx.restore();

        // VS text
        ctx.fillStyle = PR_COLORS.gold;
        ctx.font = 'bold 12px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = PR_COLORS.gold;
        ctx.shadowBlur = 8;
        ctx.fillText('VS', cx, cy);
        ctx.shadowBlur = 0;
        ctx.textBaseline = 'alphabetic';

        // Phase indicator (left of VS badge)
        const phase = BattleEngine.currentPhase;
        const phaseNames = {
            idle: 'READY',
            draw: 'DRAW',
            main: 'MAIN',
            battle: 'BATTLE',
            end: 'END',
        };
        const phaseColor = PHASE_COLORS[phase] || PHASE_COLORS.idle;

        ctx.fillStyle = phaseColor;
        ctx.font = 'bold 8px "Press Start 2P"';
        ctx.textAlign = 'right';
        ctx.fillText(phaseNames[phase] || phase.toUpperCase(), cx - badgeSize - 8, cy + 3);

        // Turn counter (right of VS badge)
        const turn = BattleEngine.turnNumber;
        ctx.fillStyle = PR_COLORS.gold;
        ctx.font = '7px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`TURN ${turn}`, cx + badgeSize + 8, cy + 3);

        // Turn direction indicator (who's turn)
        const isPlayerTurn = BattleEngine.isPlayerTurn;
        ctx.fillStyle = isPlayerTurn ? PR_COLORS.lpGreen : PR_COLORS.lpRed;
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(isPlayerTurn ? '▼' : '▲', cx + badgeSize + 8, cy - 8);

        // Player/Enemy labels on sides
        ctx.fillStyle = PR_COLORS.lpGreen;
        ctx.font = '5px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('YOU', x + 8, lineY + 3);

        ctx.fillStyle = PR_COLORS.lpRed;
        ctx.textAlign = 'right';
        ctx.fillText('ENEMY', x + w - 8, lineY + 3);
    },

    // ===== ATTACK ANIMATION — Slash effect =====
    _drawAttackAnim(ctx, anim, W, H) {
        if (!anim || anim.progress === undefined) return;

        const progress = anim.progress;
        // Flash effect
        if (progress < 0.3) {
            ctx.fillStyle = `rgba(255,255,255,${0.3 * (1 - progress / 0.3)})`;
            ctx.fillRect(0, 0, W, H);
        }

        // Slash line with glow
        if (progress > 0.2 && progress < 0.6) {
            const t = (progress - 0.2) / 0.4;
            ctx.shadowColor = PR_COLORS.gold;
            ctx.shadowBlur = 6;
            ctx.strokeStyle = PR_COLORS.gold;
            ctx.lineWidth = 3;
            ctx.beginPath();
            const startX = anim.fromX || W / 2;
            const startY = anim.fromY || H / 2;
            const endX = anim.toX || W / 2;
            const endY = anim.toY || H / 2;
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX + (endX - startX) * t, startY + (endY - startY) * t);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    },

    animateAttack(fromX, fromY, toX, toY, callback) {
        const anim = { fromX, fromY, toX, toY, progress: 0 };
        this._attackAnims.push(anim);

        const startTime = performance.now();
        const duration = 400;

        const tick = (now) => {
            const elapsed = now - startTime;
            anim.progress = Math.min(1, elapsed / duration);

            if (this._lastRenderArgs) {
                this.renderBattle(this._lastRenderArgs.player, this._lastRenderArgs.enemy);
            }

            if (anim.progress < 1) {
                requestAnimationFrame(tick);
            } else {
                this._attackAnims = this._attackAnims.filter(a => a !== anim);
                if (this._lastRenderArgs) {
                    this.renderBattle(this._lastRenderArgs.player, this._lastRenderArgs.enemy);
                }
                if (callback) callback();
            }
        };
        requestAnimationFrame(tick);
    },

    // ===== CLICK HANDLING =====
    _registerClickHandler(canvas, W, H) {
        canvas.onclick = null;

        canvas.onclick = (e) => {
            if (!BattleEngine.isRunning) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = W / rect.width;
            const scaleY = H / rect.height;
            const cx = (e.clientX - rect.left) * scaleX;
            const cy = (e.clientY - rect.top) * scaleY;

            const rowHeight = H / 6;

            // Check player field zone (rows 4-5)
            if (cy >= rowHeight * 4 && cy < rowHeight * 5) {
                const player = BattleEngine.player;
                if (!player) return;

                const zoneW = this.ZONE_WIDTH;
                const zoneH = this.ZONE_HEIGHT;
                const gap = 10;
                const totalHeroW = zoneW * 3 + gap * 2;
                const heroStartX = (W - totalHeroW) / 2;
                const heroY = rowHeight * 4 + (rowHeight - zoneH) / 2;

                for (let i = 0; i < 3; i++) {
                    const zx = heroStartX + i * (zoneW + gap);
                    if (cx >= zx && cx <= zx + zoneW && cy >= heroY && cy <= heroY + zoneH) {
                        if (BattleEngine.currentPhase === 'main') {
                            BattleEngine.togglePosition(i);
                        }
                        return;
                    }
                }
            }

            // Check enemy field zone (rows 1-3)
            if (cy >= rowHeight && cy < rowHeight * 3) {
                const enemy = BattleEngine.enemy;
                if (!enemy) return;

                const zoneW = this.ZONE_WIDTH;
                const zoneH = this.ZONE_HEIGHT;
                const gap = 10;
                const totalHeroW = zoneW * 3 + gap * 2;
                const heroStartX = (W - totalHeroW) / 2;
                const heroY = rowHeight + (rowHeight * 2 - zoneH) / 2;

                for (let i = 0; i < 3; i++) {
                    const zx = heroStartX + i * (zoneW + gap);
                    if (cx >= zx && cx <= zx + zoneW && cy >= heroY && cy <= heroY + zoneH) {
                        const hero = enemy.heroZones ? enemy.heroZones[i] : null;
                        if (hero) {
                            UI.showEnemyInfo(hero);
                        }
                        return;
                    }
                }
            }

            // Default: show hero info
            if (BattleEngine.enemy && BattleEngine.enemy.hero) {
                UI.showEnemyInfo(BattleEngine.enemy.hero);
            }
        };
    },

    // ===== LEGACY COMPAT =====
    storeEnemyPositions() {},
    initEnemyClickHandler() {},
};
