/* ========================================
 * PIXEL RAID — Canvas Renderer
 * Pixel art card sprites with real image support
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

// Procedural pixel art card sprites (fallback)
const CardRenderer = {
    // Generate deterministic pixel art from card's artSeed
    drawCardSprite(canvas, card, size) {
        const ctx = canvas.getContext('2d');
        const s = size || 48;
        canvas.width = s;
        canvas.height = s;
        
        const pixelSize = Math.max(2, Math.floor(s / 12));
        const rarityColor = RARITIES[card.rarity].color;
        const classColor = CLASSES[card.class].color;
        
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
                // Rarity glow border
                ctx.strokeStyle = rarityColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(1, 1, s - 2, s - 2);
                return;
            }
        }

        // Fallback: procedural pixel art
        // Draw body (8x10 pixel grid centered)
        const ox = Math.floor((s - pixelSize * 10) / 2);
        const oy = Math.floor((s - pixelSize * 12) / 2);

        // Head
        ctx.fillStyle = '#ddb89a'; // skin
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
        const starCount = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 }[card.rarity];
        ctx.fillStyle = rarityColor;
        for (let i = 0; i < starCount; i++) {
            ctx.fillRect(ox + (i * 2 + 1) * pixelSize, oy + 11.5 * pixelSize, pixelSize, pixelSize);
        }
    },

    drawClassDetails(ctx, cls, ox, oy, ps, rand, color) {
        switch (cls) {
            case 'warrior':
                // Sword on right
                ctx.fillStyle = '#aaaacc';
                ctx.fillRect(ox + 8 * ps, oy + 3 * ps, ps, ps * 5);
                ctx.fillStyle = '#ffdd44';
                ctx.fillRect(ox + 7 * ps, oy + 4 * ps, ps * 3, ps);
                // Helmet
                ctx.fillStyle = '#888899';
                ctx.fillRect(ox + 3 * ps, oy, ps * 4, ps);
                break;
            case 'mage':
                // Staff on left
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(ox + 1 * ps, oy + 2 * ps, ps, ps * 7);
                ctx.fillStyle = '#aa44ff';
                ctx.fillRect(ox + 0 * ps, oy + 1 * ps, ps * 3, ps * 2);
                // Hat
                ctx.fillStyle = '#6633aa';
                ctx.fillRect(ox + 4 * ps, oy - ps, ps * 2, ps);
                ctx.fillRect(ox + 3 * ps, oy, ps * 4, ps);
                break;
            case 'archer':
                // Bow
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(ox + 8 * ps, oy + 2 * ps, ps, ps * 5);
                ctx.fillStyle = '#aaa';
                ctx.fillRect(ox + 8 * ps, oy + 1 * ps, ps, ps);
                ctx.fillRect(ox + 8 * ps, oy + 7 * ps, ps, ps);
                // Hood
                ctx.fillStyle = '#2d5a2d';
                ctx.fillRect(ox + 3 * ps, oy - ps, ps * 4, ps);
                break;
            case 'healer':
                // Cross symbol
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(ox + 5 * ps, oy + 4 * ps, ps, ps * 3);
                ctx.fillRect(ox + 4 * ps, oy + 5 * ps, ps * 3, ps);
                // Halo
                ctx.fillStyle = '#ffdd44';
                ctx.fillRect(ox + 4 * ps, oy - ps, ps * 3, ps);
                break;
            case 'assassin':
                // Dual daggers
                ctx.fillStyle = '#cc4466';
                ctx.fillRect(ox + 1 * ps, oy + 4 * ps, ps, ps * 3);
                ctx.fillRect(ox + 8 * ps, oy + 4 * ps, ps, ps * 3);
                // Mask
                ctx.fillStyle = '#333';
                ctx.fillRect(ox + 3 * ps, oy + 1 * ps, ps * 4, ps);
                break;
        }
    },

    // Draw full card with info
    drawFullCard(canvas, card, width, height) {
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        
        const rarityColor = RARITIES[card.rarity].color;
        
        // Card background
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#1a1a3a');
        grad.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        
        // Border
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        
        // Sprite area — try image first, fallback to procedural
        const spriteSize = Math.min(width - 20, height * 0.5);
        const spriteX = Math.floor((width - spriteSize) / 2);
        const template = getTemplateByName(card.templateId || card.name);
        
        if (template && template.image) {
            const img = _loadImage(template.image);
            if (img.complete && img.naturalWidth > 0 && !img._failed) {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, spriteX, 15, spriteSize, spriteSize);
            } else {
                const spriteCanvas = document.createElement('canvas');
                this.drawCardSprite(spriteCanvas, card, spriteSize);
                ctx.drawImage(spriteCanvas, spriteX, 15);
            }
        } else {
            const spriteCanvas = document.createElement('canvas');
            this.drawCardSprite(spriteCanvas, card, spriteSize);
            ctx.drawImage(spriteCanvas, spriteX, 15);
        }
        
        // Name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px "Press Start 2P"';
        ctx.textAlign = 'center';
        const nameY = spriteSize + 30;
        ctx.fillText(card.name, width / 2, nameY);
        
        // Rarity
        ctx.fillStyle = rarityColor;
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText(RARITIES[card.rarity].name, width / 2, nameY + 14);
        
        // Class
        ctx.fillStyle = CLASSES[card.class].color;
        ctx.fillText(CLASSES[card.class].emoji + ' ' + CLASSES[card.class].name, width / 2, nameY + 28);
        
        // Stats
        ctx.font = '7px "Press Start 2P"';
        ctx.textAlign = 'left';
        const statsY = nameY + 44;
        const stats = [
            { label: 'HP', value: card.stats.hp, color: '#44cc44' },
            { label: 'ATK', value: card.stats.atk, color: '#ff6644' },
            { label: 'DEF', value: card.stats.def, color: '#4488ff' },
            { label: 'SPD', value: card.stats.spd, color: '#ffaa00' },
            { label: 'CRIT', value: card.stats.crit + '%', color: '#ff44aa' },
        ];
        
        stats.forEach((stat, i) => {
            const x = 12;
            const y = statsY + i * 14;
            ctx.fillStyle = '#888';
            ctx.fillText(stat.label, x, y);
            ctx.fillStyle = stat.color;
            ctx.fillText(String(stat.value), x + 40, y);
        });
        
        // Power
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('PWR ' + getCardPower(card), width / 2, height - 10);
    },
};

// Battle canvas renderer
const BattleRenderer = {
    renderBattle(allyTeam, enemyTeam) {
        const canvas = document.getElementById('battle-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        // Clear
        ctx.fillStyle = '#0a0a2a';
        ctx.fillRect(0, 0, W, H);

        // Draw stage background image
        const stage = GameState ? GameState.player.stage : 1;
        const bgSrc = getStageBackground(stage);
        const bgImg = _loadBgImage(bgSrc);
        if (bgImg.complete && bgImg.naturalWidth > 0 && !bgImg._failed) {
            ctx.drawImage(bgImg, 0, 0, W, H);
            // Semi-transparent overlay for readability
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(0, 0, W, H);
        } else {
            // Fallback grid pattern background
            ctx.strokeStyle = 'rgba(50,50,100,0.3)';
            ctx.lineWidth = 1;
            for (let x = 0; x < W; x += 40) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
            }
            for (let y = 0; y < H; y += 40) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
            }
        }

        // Ground line
        ctx.fillStyle = 'rgba(26,26,74,0.7)';
        ctx.fillRect(0, H * 0.7, W, 3);

        // Draw ally team (left side)
        this.drawTeam(ctx, allyTeam, 60, H * 0.35, 70, true);
        
        // Draw enemy team (right side)
        this.drawTeam(ctx, enemyTeam, W - 60, H * 0.35, 70, false);

        // VS text
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 20px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('VS', W / 2, H * 0.5);
    },

    drawTeam(ctx, team, startX, startY, spacing, isLeft) {
        team.forEach((card, i) => {
            const x = isLeft ? startX + i * spacing : startX - i * spacing;
            const y = startY + (i % 2) * 20;
            
            if (!card.alive) {
                ctx.globalAlpha = 0.3;
            }

            // Try to draw character image sprite
            const spriteSize = 40;
            const template = getTemplateByName(card.templateId || card.name);

            if (template && template.image) {
                const img = _loadImage(template.image);
                if (img.complete && img.naturalWidth > 0 && !img._failed) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(img, x - spriteSize/2, y - spriteSize/2, spriteSize, spriteSize);
                } else {
                    // Fallback to procedural sprite
                    const spriteCanvas = document.createElement('canvas');
                    CardRenderer.drawCardSprite(spriteCanvas, card, spriteSize);
                    ctx.drawImage(spriteCanvas, x - spriteSize/2, y - spriteSize/2);
                }
            } else {
                // Fallback to procedural sprite
                const spriteCanvas = document.createElement('canvas');
                CardRenderer.drawCardSprite(spriteCanvas, card, spriteSize);
                ctx.drawImage(spriteCanvas, x - spriteSize/2, y - spriteSize/2);
            }

            // Death overlay: grey tint + skull
            if (!card.alive) {
                // Grey overlay
                ctx.fillStyle = 'rgba(30, 30, 30, 0.5)';
                ctx.fillRect(x - spriteSize/2, y - spriteSize/2, spriteSize, spriteSize);
                // Red X mark
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - spriteSize/3, y - spriteSize/3);
                ctx.lineTo(x + spriteSize/3, y + spriteSize/3);
                ctx.moveTo(x + spriteSize/3, y - spriteSize/3);
                ctx.lineTo(x - spriteSize/3, y + spriteSize/3);
                ctx.stroke();
                // Skull emoji text
                ctx.globalAlpha = 0.8;
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff';
                ctx.fillText('💀', x, y + 4);
                ctx.globalAlpha = 0.3;
            }

            // HP bar
            const barWidth = 40;
            const barHeight = 4;
            const barX = x - barWidth / 2;
            const barY = y + spriteSize / 2 + 4;
            const hpPercent = card.stats.hp / card.stats.maxHp;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = hpPercent > 0.5 ? '#44cc44' : hpPercent > 0.25 ? '#ffaa00' : '#ff4444';
            ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

            // Name
            ctx.fillStyle = card.alive ? '#fff' : '#666';
            ctx.font = '6px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(card.name, x, barY + 14);

            ctx.globalAlpha = 1;
        });
    },
};
