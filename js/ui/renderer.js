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
        const starCount = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 }[card.rarity];
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
                ctx.fillStyle = '#aa44ff';
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
        
        // Sprite area
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

// ===== BATTLE CANVAS RENDERER =====
const BattleRenderer = {
    // Attack animation state
    _attackAnims: [],
    _animating: false,
    _lastRenderArgs: null,

    renderBattle(allyTeam, enemyTeam) {
        // Store args for re-render during animations
        this._lastRenderArgs = { allyTeam, enemyTeam };
        
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
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(0, 0, W, H);
        } else {
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

        // Find attack animation offsets
        const offsets = {};
        for (const anim of this._attackAnims) {
            const progress = anim.progress || 0;
            // Lunge: move toward target (0→0.3), hold (0.3→0.5), return (0.5→1.0)
            let dx = 0, dy = 0;
            if (progress < 0.35) {
                // Lunge forward
                const t = progress / 0.35;
                const ease = t * (2 - t); // ease-out quad
                dx = anim.dirX * 40 * ease;
                dy = anim.dirY * 15 * ease;
            } else if (progress < 0.5) {
                // Hold at peak
                dx = anim.dirX * 40;
                dy = anim.dirY * 15;
            } else {
                // Return
                const t = (progress - 0.5) / 0.5;
                const ease = 1 - t * t; // ease-in quad
                dx = anim.dirX * 40 * ease;
                dy = anim.dirY * 15 * ease;
            }
            offsets[anim.unitId] = { dx, dy };
        }

        // Draw ally team (left side)
        this.drawTeam(ctx, allyTeam, 80, H * 0.32, 90, true, offsets);
        
        // Draw enemy team (right side)
        this.drawTeam(ctx, enemyTeam, W - 80, H * 0.32, 90, false, offsets);
        this.storeEnemyPositions(enemyTeam, W - 80, H * 0.32, 90);
        this.initEnemyClickHandler();

        // VS text (only if no animation active)
        if (this._attackAnims.length === 0) {
            ctx.fillStyle = '#ffd700';
            ctx.globalAlpha = 0.3;
            ctx.font = 'bold 20px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('VS', W / 2, H * 0.5);
            ctx.globalAlpha = 1;
        }
    },

    drawTeam(ctx, team, startX, startY, spacing, isLeft, offsets) {
        offsets = offsets || {};
        team.forEach((card, i) => {
            const baseX = isLeft ? startX + i * spacing : startX - i * spacing;
            const baseY = startY + (i % 2) * 15;
            
            // Apply attack animation offset
            const off = offsets[card.name + '_' + i] || { dx: 0, dy: 0 };
            const x = baseX + off.dx;
            const y = baseY + off.dy;
            
            if (!card.alive) {
                ctx.globalAlpha = 0.3;
            }

            // Bigger sprite: 80px
            const spriteSize = 80;
            const template = getTemplateByName(card.templateId || card.name);

            if (template && template.image) {
                const img = _loadImage(template.image);
                if (img.complete && img.naturalWidth > 0 && !img._failed) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(img, x - spriteSize/2, y - spriteSize/2, spriteSize, spriteSize);
                } else {
                    const spriteCanvas = document.createElement('canvas');
                    CardRenderer.drawCardSprite(spriteCanvas, card, spriteSize);
                    ctx.drawImage(spriteCanvas, x - spriteSize/2, y - spriteSize/2);
                }
            } else {
                const spriteCanvas = document.createElement('canvas');
                CardRenderer.drawCardSprite(spriteCanvas, card, spriteSize);
                ctx.drawImage(spriteCanvas, x - spriteSize/2, y - spriteSize/2);
            }

            // Shadow under hero
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(x, y + spriteSize/2 + 2, spriteSize * 0.35, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Death overlay
            if (!card.alive) {
                ctx.fillStyle = 'rgba(30, 30, 30, 0.5)';
                ctx.fillRect(x - spriteSize/2, y - spriteSize/2, spriteSize, spriteSize);
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - spriteSize/3, y - spriteSize/3);
                ctx.lineTo(x + spriteSize/3, y + spriteSize/3);
                ctx.moveTo(x + spriteSize/3, y - spriteSize/3);
                ctx.lineTo(x - spriteSize/3, y + spriteSize/3);
                ctx.stroke();
                ctx.globalAlpha = 0.8;
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff';
                ctx.fillText('💀', x, y + 6);
                ctx.globalAlpha = 0.3;
            }

            // HP bar — bigger
            const barWidth = 70;
            const barHeight = 8;
            const barX = x - barWidth / 2;
            const barY = y + spriteSize / 2 + 6;
            const hpPercent = card.stats.hp / card.stats.maxHp;
            
            // Bar background
            ctx.fillStyle = '#222';
            ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            // HP fill
            ctx.fillStyle = hpPercent > 0.5 ? '#44cc44' : hpPercent > 0.25 ? '#ffaa00' : '#ff4444';
            ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
            // HP text on bar
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 7px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${card.stats.hp}/${card.stats.maxHp}`, x, barY + barHeight / 2);

            // Charge bar (ultimate)
            const chargePercent = (card.charge || 0) / 100;
            if (chargePercent > 0) {
                const chargeY = barY + barHeight + 2;
                const chargeH = 3;
                ctx.fillStyle = '#111';
                ctx.fillRect(barX, chargeY, barWidth, chargeH);
                ctx.fillStyle = chargePercent >= 1 ? '#ffd700' : '#8866ff';
                ctx.fillRect(barX, chargeY, barWidth * chargePercent, chargeH);
                if (chargePercent >= 1) {
                    // Glowing ultimate ready indicator
                    ctx.fillStyle = '#ffd700';
                    ctx.font = '5px "Press Start 2P"';
                    ctx.textAlign = 'center';
                    ctx.fillText('⚡', x, chargeY + chargeH + 6);
                }
            }

            // Name
            ctx.fillStyle = card.alive ? '#fff' : '#666';
            ctx.font = '7px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(card.name, x, barY + barHeight + 20);

            ctx.globalAlpha = 1;
        });
    },

    // ===== ATTACK LUNGE ANIMATION =====
    animateAttack(attackerName, attackerIdx, isAlly, targetName, targetIdx, targetIsAlly, callback) {
        const W = 600, H = 300;
        const startX = isAlly ? 80 : W - 80;
        const targetX = isAlly ? W - 80 : 80;
        const dirX = isAlly ? 1 : -1;
        const dirY = 0;

        const anim = {
            unitId: attackerName + '_' + attackerIdx,
            dirX,
            dirY,
            progress: 0,
        };

        this._attackAnims.push(anim);

        const startTime = performance.now();
        const duration = 400; // ms

        const tick = (now) => {
            const elapsed = now - startTime;
            anim.progress = Math.min(1, elapsed / duration);

            // Re-render
            if (this._lastRenderArgs) {
                this.renderBattle(this._lastRenderArgs.allyTeam, this._lastRenderArgs.enemyTeam);
            }

            if (anim.progress < 1) {
                requestAnimationFrame(tick);
            } else {
                // Remove this animation
                this._attackAnims = this._attackAnims.filter(a => a !== anim);
                if (this._lastRenderArgs) {
                    this.renderBattle(this._lastRenderArgs.allyTeam, this._lastRenderArgs.enemyTeam);
                }
                if (callback) callback();
            }
        };

        requestAnimationFrame(tick);
    },

    // ===== IMPACT FLASH EFFECT =====
    drawImpactFlash(targetName, targetIdx, isAlly) {
        // Draw a brief flash at the target's position
        const canvas = document.getElementById('battle-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        
        const baseX = isAlly ? 80 + targetIdx * 90 : W - 80 - targetIdx * 90;
        const baseY = H * 0.32 + (targetIdx % 2) * 15;
        
        // Flash circle
        ctx.save();
        ctx.globalAlpha = 0.7;
        const grad = ctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, 45);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#ffdd44');
        grad.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(baseX - 50, baseY - 50, 100, 100);
        ctx.restore();
    },

    // ===== ENEMY INFO PANEL =====
    _enemyPositions: [],
    _infoPanel: null,

    storeEnemyPositions(team, startX, startY, spacing) {
        this._enemyPositions = [];
        team.forEach((card, i) => {
            const x = startX - i * spacing;
            const y = startY + (i % 2) * 15;
            this._enemyPositions.push({ card, x, y });
        });
    },

    initEnemyClickHandler() {
        const canvas = document.getElementById('battle-canvas');
        if (!canvas || canvas._enemyClickInit) return;
        canvas._enemyClickInit = true;

        canvas.addEventListener('click', (e) => {
            if (!BattleEngine.isRunning) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            // Check if click is near an enemy
            for (const ep of this._enemyPositions) {
                const dx = mx - ep.x;
                const dy = my - ep.y;
                if (dx * dx + dy * dy < 2500) { // 50px radius
                    this.showEnemyInfo(ep.card, e.clientX, e.clientY);
                    return;
                }
            }
            // Click elsewhere dismisses
            this.hideEnemyInfo();
        });
    },

    showEnemyInfo(card, screenX, screenY) {
        this.hideEnemyInfo();
        const panel = document.createElement('div');
        panel.className = 'enemy-info-panel';
        panel.innerHTML = `
            <div style="text-align:center;margin-bottom:6px;">
                <div style="font-size:10px;font-weight:700;color:${RARITIES[card.rarity]?.color || '#fff'};">${card.name}</div>
                <div style="font-size:7px;color:#888;">${card.class} • ${card.rarity}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;font-size:7px;">
                <span style="color:#44cc44">❤️ HP: ${card.stats.hp}/${card.stats.maxHp}</span>
                <span style="color:#ff6644">⚔️ ATK: ${card.stats.atk}</span>
                <span style="color:#4488ff">🛡️ DEF: ${card.stats.def}</span>
                <span style="color:#ffaa00">⚡ SPD: ${card.stats.spd}</span>
                <span style="color:#ff44aa">💥 CRIT: ${card.stats.crit}%</span>
                <span style="color:#aaa;">✨ ${card.skill || 'None'}</span>
            </div>
        `;
        panel.style.left = Math.min(screenX + 10, window.innerWidth - 180) + 'px';
        panel.style.top = Math.min(screenY - 40, window.innerHeight - 120) + 'px';
        document.body.appendChild(panel);
        this._infoPanel = panel;
        // Auto-dismiss after 4s
        setTimeout(() => this.hideEnemyInfo(), 4000);
    },

    hideEnemyInfo() {
        if (this._infoPanel && this._infoPanel.parentNode) {
            this._infoPanel.remove();
            this._infoPanel = null;
        }
    },
};
