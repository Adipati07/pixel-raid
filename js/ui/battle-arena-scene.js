/**
 * BattleArenaScene — Full-screen Canvas battle arena (Duel Links style)
 * 
 * Takes over #battle-canvas when battle starts.
 * Split-screen: Enemy (top) | VS divider (mid) | Player (bottom)
 * Handles transitions, animations, damage numbers, HP bars.
 * 
 * Depends on: BattleEngine, BattleAnimations, CardRenderer, CLASSES, RARITIES
 */

const BattleArenaScene = {
    // Canvas references
    canvas: null,
    ctx: null,
    W: 600,
    H: 400,

    // Scene state
    active: false,
    transitioning: false,
    transitionType: 'enter', // 'enter' | 'exit'
    transitionAlpha: 1.0,
    transitionStartTime: 0,
    TRANSITION_DURATION: 800, // ms

    // Animation state
    animations: [],
    damageNumbers: [],
    attackAnims: [],
    shakeX: 0,
    shakeY: 0,
    shakeDecay: 0,

    // Layout constants
    LP_BAR_H: 18,
    FIELD_GAP: 6,
    CENTER_H: 32,
    ZONE_W: 80,
    ZONE_H: 100,
    ZONE_GAP: 6,
    SKILL_ZONE_W: 56,
    SKILL_ZONE_H: 80,

    // Cache
    _spriteCache: {},

    // ===== INIT =====
    init(canvasId) {
        let el = document.getElementById(canvasId || 'battle-canvas');
        if (!el) return;
        
        // If it's a container div (not a canvas), find or create a canvas inside it
        if (el.tagName !== 'CANVAS') {
            let cvs = el.querySelector('canvas');
            if (!cvs) {
                cvs = document.createElement('canvas');
                cvs.id = 'battle-canvas';
                cvs.width = 800;
                cvs.height = 500;
                el.appendChild(cvs);
            }
            el = cvs;
        }
        
        this.canvas = el;
        this.ctx = this.canvas.getContext('2d');
        this.W = this.canvas.width;
        this.H = this.canvas.height;
        this._setupFonts();
    },

    _setupFonts() {
        // Press Start 2P is loaded via Google Fonts in HTML
        // We just set it here for reference
    },

    // ===== SCENE LIFECYCLE =====
    enter(player, enemy, onComplete) {
        if (!this.canvas) this.init();

        this.active = true;
        this.transitioning = true;
        this.transitionType = 'enter';
        this.transitionAlpha = 1.0;
        this.transitionStartTime = Date.now();
        this.animations = [];
        this.damageNumbers = [];
        this.attackAnims = [];
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeDecay = 0;

        // === FULLSCREEN OVERLAY ===
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (wrap) {
            // Make wrap a fixed fullscreen overlay with flex column for canvas + controls
            wrap.style.cssText = `
                position: fixed !important;
                top: 0; left: 0; right: 0; bottom: 0;
                width: 100vw !important; height: 100vh !important;
                z-index: 9999 !important;
                background: #0a0a1a;
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                border-radius: 0 !important;
                overflow: hidden;
            `;
        }

        // Resize canvas to fill most of viewport (leave ~160px for hand/controls)
        const vw = window.innerWidth;
        const canvasArea = window.innerHeight - 160; // leave room for card hand + controls
        const aspect = 600 / 400; // 3:2
        let cw = canvasArea * aspect > vw ? vw : canvasArea * aspect;
        let ch = cw / aspect;
        this.canvas.width = Math.floor(cw);
        this.canvas.height = Math.floor(ch);
        this.W = this.canvas.width;
        this.H = this.canvas.height;
        this.canvas.style.cssText = `
            display: block;
            image-rendering: pixelated;
            width: ${cw}px; height: ${ch}px;
            border: none; box-shadow: none;
            margin: 0 auto;
        `;

        // Move card hand and action buttons INSIDE the wrap (after canvas)
        const cardHand = document.getElementById('card-hand-area');
        const actionRow = document.querySelector('.battle-action-row');
        const infoStrip = document.querySelector('.battle-info-strip');
        const controls = document.querySelector('.battle-controls');
        [cardHand, actionRow, infoStrip, controls].forEach(el => {
            if (el && el.parentElement !== wrap) {
                wrap.appendChild(el);
            }
            if (el) {
                el.style.display = '';
                el.style.position = 'relative';
                el.style.zIndex = '10000';
            }
        });

        // Only hide nav/header (not battle controls)
        ['.game-nav', '.game-header'].forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.display = 'none';
        });

        // Draw initial black frame immediately
        this._drawBlackScreen();

        // Start render loop
        this._startRenderLoop();

        // Transition complete callback
        setTimeout(() => {
            this.transitioning = false;
            if (onComplete) onComplete();
        }, this.TRANSITION_DURATION);
    },

    exit(onComplete) {
        this.transitioning = true;
        this.transitionType = 'exit';
        this.transitionAlpha = 0.0;
        this.transitionStartTime = Date.now();

        setTimeout(() => {
            this.active = false;
            this.transitioning = false;
            this._stopRenderLoop();

            // === RESTORE FROM FULLSCREEN ===
            const wrap = document.querySelector('.battle-canvas-wrap');
            const screenBattle = document.getElementById('screen-battle');

            // Move elements back to screen-battle if they were moved into wrap
            const movedEls = ['#card-hand-area', '.battle-action-row', '.battle-info-strip', '.battle-controls'];
            movedEls.forEach(sel => {
                const el = document.querySelector(sel);
                if (el && wrap && el.parentElement === wrap && screenBattle) {
                    screenBattle.appendChild(el);
                    el.style.cssText = '';
                }
            });

            if (wrap) {
                wrap.style.cssText = ''; // Reset to CSS defaults
            }

            // Restore canvas size
            if (this.canvas) {
                this.canvas.width = 600;
                this.canvas.height = 400;
                this.W = 600;
                this.H = 400;
                this.canvas.style.cssText = '';
            }

            // Restore hidden UI elements (nav/header)
            ['.game-nav', '.game-header'].forEach(sel => {
                const el = document.querySelector(sel);
                if (el) el.style.display = '';
            });

            if (onComplete) onComplete();
        }, this.TRANSITION_DURATION);
    },

    // ===== RENDER LOOP =====
    _renderLoopId: null,
    _startRenderLoop() {
        this._stopRenderLoop();
        const loop = () => {
            if (!this.active) return;
            this._render();
            this._renderLoopId = requestAnimationFrame(loop);
        };
        this._renderLoopId = requestAnimationFrame(loop);
    },

    _stopRenderLoop() {
        if (this._renderLoopId) {
            cancelAnimationFrame(this._renderLoopId);
            this._renderLoopId = null;
        }
    },

    // ===== MAIN RENDER =====
    _render() {
        const ctx = this.ctx;
        const W = this.W;
        const H = this.H;

        // Apply screen shake
        ctx.save();
        if (this.shakeDecay > 0) {
            ctx.translate(this.shakeX, this.shakeY);
            this.shakeX *= 0.85;
            this.shakeY *= 0.85;
            this.shakeDecay -= 0.05;
            if (this.shakeDecay < 0) this.shakeDecay = 0;
        }

        // Clear
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, W, H);

        // Get battle state
        const state = BattleEngine.getFieldState();
        if (!state || !state.player || !state.enemy) {
            ctx.restore();
            return;
        }

        // Layout calculation
        const layout = this._calcLayout();

        // Draw battlefield background
        this._drawBackground(ctx, W, H);

        // Draw perspective floor grid (2.5D effect)
        this._drawPerspectiveFloor(ctx, W, H);

        // Draw enemy LP bar (top)
        this._drawLPBar(ctx, state.enemy, false, layout.lpEnemy);

        // Draw enemy field zones (top half)
        this._drawField(ctx, state.enemy, false, layout.fieldEnemy);

        // Draw center divider (VS badge)
        this._drawCenterDivider(ctx, state, layout.center);

        // Draw player field zones (bottom half)
        this._drawField(ctx, state.player, true, layout.fieldPlayer);

        // Draw player LP bar (bottom)
        this._drawLPBar(ctx, state.player, true, layout.lpPlayer);

        // Draw vignette (dramatic edge darkening)
        this._drawVignette(ctx, W, H);

        // Draw attack animations
        this._renderAttackAnims(ctx);

        // Draw floating damage numbers
        this._renderDamageNumbers(ctx);

        // Draw phase banner if active
        this._renderPhaseBanner(ctx);

        ctx.restore();

        // Draw transition overlay on top (unaffected by shake)
        if (this.transitioning) {
            this._renderTransition(ctx);
        }
    },

    // ===== LAYOUT =====
    _calcLayout() {
        const W = this.W;
        const H = this.H;
        const lpH = this.LP_BAR_H;
        const centerH = this.CENTER_H;
        const gap = this.FIELD_GAP;

        // Vertical split: LP_bar | field | center | field | LP_bar
        const totalFixed = lpH * 2 + centerH + gap * 4;
        const fieldH = (H - totalFixed) / 2;

        return {
            lpEnemy:    { x: 0, y: 0, w: W, h: lpH },
            fieldEnemy: { x: 0, y: lpH + gap, w: W, h: fieldH },
            center:     { x: 0, y: lpH + gap + fieldH + gap, w: W, h: centerH },
            fieldPlayer:{ x: 0, y: lpH + gap + fieldH + gap + centerH + gap, w: W, h: fieldH },
            lpPlayer:   { x: 0, y: H - lpH, w: W, h: lpH },
        };
    },

    // ===== BACKGROUND =====
    _drawBackground(ctx, W, H) {
        // Cinematic gradient — deep space/sky at top, warm arena floor at bottom
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#050515');    // deep void
        grad.addColorStop(0.2, '#0a0a2e');  // dark blue
        grad.addColorStop(0.45, '#0f0d28');
        grad.addColorStop(0.55, '#120e20');
        grad.addColorStop(0.8, '#1a100d');  // warm ground
        grad.addColorStop(1, '#200d0d');    // player warm
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Animated floating particles
        if (!this._particles) {
            this._particles = [];
            for (let i = 0; i < 30; i++) {
                this._particles.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    r: Math.random() * 2 + 0.5,
                    speed: Math.random() * 0.3 + 0.1,
                    alpha: Math.random() * 0.3 + 0.1,
                    color: ['#4488ff', '#ff6644', '#88ff44', '#ff44ff'][Math.floor(Math.random() * 4)]
                });
            }
        }
        this._particles.forEach(p => {
            p.y -= p.speed;
            if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        // Center arena glow
        const arenaGlow = ctx.createRadialGradient(W/2, H*0.45, 0, W/2, H*0.45, W*0.35);
        arenaGlow.addColorStop(0, 'rgba(68,136,255,0.06)');
        arenaGlow.addColorStop(0.5, 'rgba(40,80,160,0.03)');
        arenaGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = arenaGlow;
        ctx.fillRect(0, 0, W, H);
    },

    // ===== LP BAR =====
    _drawLPBar(ctx, combatant, isPlayer, rect) {
        const { x, y, w, h } = rect;
        const maxLP = BattleEngine.MAX_LP || 4000;
        const actualPct = Math.max(0, Math.min(1, combatant.lp / maxLP));

        // Smooth LP animation
        const lpKey = isPlayer ? '_playerLPDisplay' : '_enemyLPDisplay';
        if (this[lpKey] === undefined) this[lpKey] = actualPct;
        this[lpKey] += (actualPct - this[lpKey]) * 0.08; // Smooth lerp
        const pct = this[lpKey];

        // Animated LP number
        const lpNumKey = isPlayer ? '_playerLPNum' : '_enemyLPNum';
        if (this[lpNumKey] === undefined) this[lpNumKey] = combatant.lp;
        this[lpNumKey] += (combatant.lp - this[lpNumKey]) * 0.1;
        const displayLP = Math.round(this[lpNumKey]);

        // Background
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        bgGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
        bgGrad.addColorStop(1, 'rgba(10,10,30,0.9)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(x, y, w, h);

        // Accent line (gold top for player, blue top for enemy)
        ctx.fillStyle = isPlayer ? 'rgba(255,215,0,0.5)' : 'rgba(68,136,255,0.5)';
        ctx.fillRect(x, y, w, 1);

        const pad = 8;
        const barX = x + 160;
        const barW = Math.min(240, w - 340);
        const barY = y + 3;
        const barH = h - 6;

        // Portrait emoji
        const hero = combatant.hero || (combatant.heroes && combatant.heroes[0]);
        if (hero) {
            const cls = CLASSES[hero.class || hero.cls];
            if (cls) {
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(cls.emoji, x + pad, y + h - 5);
            }
        }

        // Name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(combatant.name || (isPlayer ? 'Player' : 'Enemy'), x + pad + 20, y + h - 5);

        // LP bar background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(barX, barY, barW, barH);

        // LP bar fill with glow
        if (pct > 0) {
            const fillGrad = ctx.createLinearGradient(barX, barY, barX + barW * pct, barY);
            let glowColor;
            if (pct > 0.55) {
                fillGrad.addColorStop(0, '#22cc66');
                fillGrad.addColorStop(1, '#00ee77');
                glowColor = '#00ff88';
            } else if (pct > 0.25) {
                fillGrad.addColorStop(0, '#ccaa22');
                fillGrad.addColorStop(1, '#ffcc00');
                glowColor = '#ffdd44';
            } else {
                fillGrad.addColorStop(0, '#cc2222');
                fillGrad.addColorStop(1, '#ff3333');
                glowColor = '#ff4444';
            }

            // Glow behind bar
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 8;
            ctx.fillStyle = fillGrad;
            ctx.fillRect(barX + 1, barY + 1, (barW - 2) * pct, barH - 2);
            ctx.shadowBlur = 0;

            // Damage trail (red overlay showing recent damage)
            if (actualPct < pct - 0.01) {
                ctx.fillStyle = 'rgba(255,50,50,0.4)';
                ctx.fillRect(barX + 1 + (barW - 2) * actualPct, barY + 1, (barW - 2) * (pct - actualPct), barH - 2);
            }

            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(barX + 1, barY + 1, (barW - 2) * pct, (barH - 2) / 2);
        }

        // LP bar border with glow
        ctx.strokeStyle = pct > 0.55 ? 'rgba(0,255,136,0.3)' : pct > 0.25 ? 'rgba(255,200,0,0.3)' : 'rgba(255,50,50,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        // LP text with color
        ctx.fillStyle = pct > 0.55 ? '#88ffbb' : pct > 0.25 ? '#ffdd88' : '#ff8888';
        ctx.font = 'bold 7px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(`LP ${displayLP} / ${maxLP}`, barX + barW / 2, barY + barH - 4);

        // Deck + Graveyard (right side)
        ctx.fillStyle = 'rgba(180,180,180,0.7)';
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'right';
        ctx.fillText(`DECK: ${combatant.deck ? combatant.deck.length : 0}`, x + w - pad, y + h - 10);
        ctx.fillStyle = 'rgba(136,136,136,0.5)';
        ctx.fillText(`GY: ${combatant.graveyard ? combatant.graveyard.length : 0}`, x + w - pad, y + h - 3);
    },

    // ===== FIELD ZONES (2.5D Perspective) =====
    _drawPerspectiveFloor(ctx, W, H) {
        // Vanishing point at center-top of canvas
        const vpX = W / 2;
        const vpY = H * 0.12;

        // Horizontal grid lines (perspective depth)
        ctx.strokeStyle = 'rgba(100,150,255,0.06)';
        ctx.lineWidth = 1;
        const numLines = 12;
        for (let i = 0; i <= numLines; i++) {
            const t = i / numLines;
            const ly = vpY + (H - vpY) * t;
            // Lines get wider as they go down (perspective)
            const spread = t * t; // quadratic spread
            const lx1 = vpX - (W * 0.6) * spread;
            const lx2 = vpX + (W * 0.6) * spread;
            ctx.beginPath();
            ctx.moveTo(lx1, ly);
            ctx.lineTo(lx2, ly);
            ctx.stroke();
        }

        // Vertical perspective lines converging to vanishing point
        const numVLines = 8;
        for (let i = 0; i <= numVLines; i++) {
            const t = i / numVLines;
            const bx = W * 0.05 + (W * 0.9) * t; // bottom x
            ctx.beginPath();
            ctx.moveTo(vpX, vpY);
            ctx.lineTo(bx, H);
            ctx.stroke();
        }
    },

    _drawVignette(ctx, W, H) {
        // Strong dramatic vignette — dark edges, bright center
        const grad = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.2, W / 2, H * 0.45, W * 0.75);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.1)');
        grad.addColorStop(0.8, 'rgba(0,0,0,0.35)');
        grad.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Top/bottom extra darkening
        const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.15);
        topGrad.addColorStop(0, 'rgba(0,0,0,0.4)');
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, W, H * 0.15);

        const botGrad = ctx.createLinearGradient(0, H * 0.85, 0, H);
        botGrad.addColorStop(0, 'rgba(0,0,0,0)');
        botGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, H * 0.85, W, H * 0.15);
    },

    _drawField(ctx, combatant, isPlayer, rect) {
        const { x, y, w, h } = rect;
        const zoneW = this.ZONE_W;
        const zoneH = this.ZONE_H;
        const skillW = this.SKILL_ZONE_W;
        const skillH = this.SKILL_ZONE_H;
        const gap = this.ZONE_GAP;

        // 2.5D perspective scaling — enemy (top) smaller, player (bottom) bigger
        const scale = isPlayer ? 1.05 : 0.85;
        const scaledZoneW = zoneW * scale;
        const scaledZoneH = zoneH * scale;
        const scaledSkillW = skillW * scale;
        const scaledSkillH = skillH * scale;
        const scaledGap = gap * scale;

        // 3 hero zones centered
        const totalHeroW = scaledZoneW * 3 + scaledGap * 2;
        const heroStartX = x + (w - totalHeroW) / 2;
        const heroY = y + (h - scaledZoneH) / 2;

        // Field decoration — perspective ground
        ctx.fillStyle = isPlayer ? 'rgba(0,100,0,0.04)' : 'rgba(0,0,100,0.04)';
        ctx.fillRect(x, y, w, h);

        // Draw perspective grid lines for this side
        const vpX = x + w / 2;
        const vpY = isPlayer ? y : y + h;
        ctx.strokeStyle = isPlayer ? 'rgba(50,200,50,0.08)' : 'rgba(50,50,200,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const gy = isPlayer ? y + (h * 0.3) + (h * 0.7) * (i / 4) : y + h - (h * 0.3) - (h * 0.7) * (i / 4);
            const spread = isPlayer ? (i / 4) * (i / 4) : (1 - i / 4) * (1 - i / 4);
            const gx1 = x + (w * 0.05) + (w * 0.45) * (1 - spread);
            const gx2 = x + w - (w * 0.05) - (w * 0.45) * (1 - spread);
            ctx.beginPath();
            ctx.moveTo(gx1, gy);
            ctx.lineTo(gx2, gy);
            ctx.stroke();
        }

        // Draw 3 hero zones with perspective scaling
        for (let i = 0; i < 3; i++) {
            const zx = heroStartX + i * (scaledZoneW + scaledGap);
            const hero = combatant.heroZones ? combatant.heroZones[i] : null;
            this._drawHeroZone(ctx, zx, heroY, scaledZoneW, scaledZoneH, hero, isPlayer, i);
        }

        // Draw 2 skill zones flanking with perspective scaling
        const skillY = y + (h - scaledSkillH) / 2;
        const leftSkillX = heroStartX - scaledSkillW - (18 * scale);
        const rightSkillX = heroStartX + totalHeroW + (18 * scale);
        
        const leftSkill = combatant.skillZones ? combatant.skillZones[0] : null;
        const rightSkill = combatant.skillZones ? combatant.skillZones[1] : null;
        
        this._drawSkillZone(ctx, leftSkillX, skillY, scaledSkillW, scaledSkillH, leftSkill, 0);
        this._drawSkillZone(ctx, rightSkillX, skillY, scaledSkillW, scaledSkillH, rightSkill, 1);
    },

    _drawHeroZone(ctx, x, y, w, h, hero, isPlayer, index) {
        if (!hero) {
            // Empty zone
            ctx.fillStyle = 'rgba(20,20,50,0.4)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = 'rgba(68,136,255,0.15)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);

            // Placeholder icon
            ctx.fillStyle = 'rgba(68,136,255,0.12)';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚔', x + w / 2, y + h / 2 + 6);

            // Zone label
            ctx.fillStyle = 'rgba(68,136,255,0.3)';
            ctx.font = '5px "Press Start 2P"';
            ctx.fillText(`HERO ${index + 1}`, x + w / 2, y - 3);
            return;
        }

        // Rarity glow
        const rarityColor = RARITIES[hero.rarity] ? RARITIES[hero.rarity].color : '#555';
        const cls = CLASSES[hero.class || hero.type] || {};
        const clsColor = cls.color || '#888';

        // Zone glow
        ctx.shadowColor = rarityColor;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0;

        // Card body
        ctx.fillStyle = 'rgba(0,10,30,0.85)';
        ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

        // Class-colored top strip
        ctx.fillStyle = clsColor;
        ctx.fillRect(x + 1, y + 1, w - 2, 3);

        // Header — name + HP
        const pad = 4;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x + pad, y + 5, w - pad * 2, 13);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 5px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(hero.name, x + pad + 2, y + 14);

        ctx.fillStyle = '#ff4444';
        ctx.textAlign = 'right';
        ctx.fillText(`HP ${hero.currentHp}`, x + w - pad - 2, y + 14);

        // Sprite area
        const artY = y + 19;
        const artH = h * 0.4;
        ctx.fillStyle = '#0f3460';
        ctx.fillRect(x + pad, artY, w - pad * 2, artH);

        // Draw sprite
        const spriteSize = Math.min(w - pad * 2 - 4, artH - 4);
        const spriteX = x + pad + (w - pad * 2 - spriteSize) / 2;
        const spriteY = artY + (artH - spriteSize) / 2;
        this._drawSprite(ctx, hero, spriteX, spriteY, spriteSize);

        // Golden art frame
        ctx.strokeStyle = '#c8a832';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + pad, artY, w - pad * 2, artH);

        // Type + rarity line
        const infoY = artY + artH + 2;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(x + pad, infoY, w - pad * 2, 8);
        ctx.fillStyle = clsColor;
        ctx.font = '4px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(cls.name || 'Hero', x + pad + 2, infoY + 6);
        ctx.fillStyle = rarityColor;
        ctx.textAlign = 'right';
        ctx.fillText(RARITIES[hero.rarity] ? RARITIES[hero.rarity].name : '', x + w - pad - 2, infoY + 6);

        // Stats box
        const statsY = infoY + 10;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x + pad, statsY, w - pad * 2, h - statsY + y - pad);

        // HP bar
        const hpBarX = x + pad + 2;
        const hpBarW = w - pad * 2 - 4;
        const hpBarY2 = statsY + 2;
        const hpBarH = 6;
        const hpPct = Math.max(0, hero.currentHp / hero.maxHp);

        ctx.fillStyle = '#222';
        ctx.fillRect(hpBarX, hpBarY2, hpBarW, hpBarH);
        const hpColor = hpPct > 0.6 ? '#22cc66' : hpPct > 0.3 ? '#ffcc00' : '#ff3333';
        ctx.fillStyle = hpColor;
        ctx.fillRect(hpBarX, hpBarY2, hpBarW * hpPct, hpBarH);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(hpBarX, hpBarY2, hpBarW, hpBarH);
        ctx.fillStyle = '#fff';
        ctx.font = '4px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(`${hero.currentHp}/${hero.maxHp}`, x + pad + (w - pad * 2) / 2, hpBarY2 + 5);

        // ATK / DEF
        const totalAtk = (hero.stats.atk || 0) + (hero.atkBuff || 0);
        const totalDef = (hero.stats.def || 0) + (hero.defBuff || 0);
        const statBoxY = hpBarY2 + hpBarH + 2;
        const halfW = (w - pad * 2 - 6) / 2;

        ctx.fillStyle = 'rgba(233,69,96,0.5)';
        ctx.fillRect(x + pad + 2, statBoxY, halfW, 8);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 5px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`⚔${totalAtk}`, x + pad + 4, statBoxY + 6);

        ctx.fillStyle = 'rgba(68,136,255,0.5)';
        ctx.fillRect(x + pad + 4 + halfW, statBoxY, halfW, 8);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText(`🛡${totalDef}`, x + w - pad - 4, statBoxY + 6);

        // Position indicator (attack/defense)
        if (hero.position === 'defense') {
            ctx.fillStyle = 'rgba(68,136,255,0.2)';
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = 'rgba(68,136,255,0.9)';
            ctx.font = 'bold 4px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('🛡 DEF', x + w / 2, y + h - 4);
        }

        // Can-attack pulse glow
        if (hero.canAttack && !hero.hasAttacked && hero.position === 'attack') {
            const pulseAlpha = 0.4 + 0.3 * Math.sin(Date.now() / 250);
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = `rgba(255,215,0,${pulseAlpha})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
            ctx.shadowBlur = 0;
        }
    },

    _drawSkillZone(ctx, x, y, w, h, card, index) {
        if (!card) {
            ctx.fillStyle = 'rgba(20,20,50,0.3)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = 'rgba(155,89,182,0.15)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(155,89,182,0.12)';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('✨', x + w / 2, y + h / 2 + 5);
            ctx.fillStyle = 'rgba(155,89,182,0.3)';
            ctx.font = '4px "Press Start 2P"';
            ctx.fillText(`SPELL ${index + 1}`, x + w / 2, y - 3);
            return;
        }

        const typeInfo = CARD_TYPES[card.type] || { emoji: '✨', color: '#888' };
        const rarityColor = RARITIES[card.rarity] ? RARITIES[card.rarity].color : '#aaa';

        // Background
        ctx.fillStyle = 'rgba(20,10,40,0.8)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);

        // Icon
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(typeInfo.emoji, x + w / 2, y + h / 2 - 4);

        // Name
        ctx.fillStyle = rarityColor;
        ctx.font = '4px "Press Start 2P"';
        ctx.fillText(card.name, x + w / 2, y + h - 10);

        // Description
        if (card.description) {
            ctx.fillStyle = 'rgba(170,170,255,0.6)';
            ctx.font = '3px "Press Start 2P"';
            const desc = card.description.length > 18 ? card.description.substring(0, 18) + '...' : card.description;
            ctx.fillText(desc, x + w / 2, y + h - 4);
        }

        // Inner border
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    },

    // ===== CENTER DIVIDER =====
    _drawCenterDivider(ctx, state, rect) {
        const { x, y, w, h } = rect;

        // Background gradient
        const grad = ctx.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0, 'rgba(0,0,0,0.95)');
        grad.addColorStop(0.3, 'rgba(15,15,35,0.95)');
        grad.addColorStop(0.7, 'rgba(15,15,35,0.95)');
        grad.addColorStop(1, 'rgba(0,0,0,0.95)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        // Gold accent lines
        ctx.fillStyle = 'rgba(255,215,0,0.5)';
        ctx.fillRect(x, y, w, 1);
        ctx.fillRect(x, y + h - 1, w, 1);

        // VS badge
        const vsX = w / 2;
        const vsY = y + h / 2;

        // VS glow
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('VS', vsX, vsY + 5);
        ctx.shadowBlur = 0;

        // Turn info (left of VS)
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'right';
        ctx.fillText(`Turn ${state.turn}`, vsX - 40, vsY + 4);

        // Phase info (right of VS)
        const phaseNames = { draw: '📥 DRAW', main: '🃏 MAIN', battle: '⚔️ BATTLE', end: '⏳ END', idle: '' };
        ctx.fillStyle = 'rgba(68,204,136,0.8)';
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(phaseNames[state.phase] || '', vsX + 40, vsY + 4);

        // Decorative lines from edges toward VS
        const lineGrad = ctx.createLinearGradient(0, 0, w / 2 - 60, 0);
        lineGrad.addColorStop(0, 'rgba(255,215,0,0)');
        lineGrad.addColorStop(1, 'rgba(255,215,0,0.25)');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(20, vsY); ctx.lineTo(vsX - 60, vsY); ctx.stroke();

        const lineGrad2 = ctx.createLinearGradient(w / 2 + 60, 0, w - 20, 0);
        lineGrad2.addColorStop(0, 'rgba(255,215,0,0.25)');
        lineGrad2.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.strokeStyle = lineGrad2;
        ctx.beginPath(); ctx.moveTo(vsX + 60, vsY); ctx.lineTo(w - 20, vsY); ctx.stroke();
    },

    // ===== SPRITE DRAWING =====
    _drawSprite(ctx, card, x, y, size) {
        // Try template image first
        const template = typeof getTemplateByName === 'function' 
            ? getTemplateByName(card.templateId || card.name) 
            : null;
        
        if (template && template.image) {
            const img = this._loadImage(template.image);
            if (img.complete && img.naturalWidth > 0 && !img._failed) {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, x, y, size, size);
                return;
            }
        }

        // Fallback: use CardRenderer's procedural sprite
        if (typeof CardRenderer !== 'undefined' && CardRenderer.drawCardSprite) {
            const spriteCanvas = document.createElement('canvas');
            spriteCanvas.width = size;
            spriteCanvas.height = size;
            CardRenderer.drawCardSprite(spriteCanvas, card, size);
            ctx.drawImage(spriteCanvas, x, y);
        } else {
            // Final fallback: colored rectangle with emoji
            const cls = CLASSES[card.class || card.type] || {};
            ctx.fillStyle = cls.color || '#444';
            ctx.fillRect(x, y, size, size);
            ctx.font = `${Math.floor(size * 0.4)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(cls.emoji || '⚔', x + size / 2, y + size / 2 + Math.floor(size * 0.15));
        }
    },

    _loadImage(src) {
        if (this._spriteCache[src]) return this._spriteCache[src];
        const img = new Image();
        img.src = src;
        img.onerror = () => { img._failed = true; };
        this._spriteCache[src] = img;
        return img;
    },

    // ===== ATTACK ANIMATIONS =====
    playAttack(attackIdx, targetIdx, isPlayerAttacking, damage, isCrit) {
        const layout = this._calcLayout();
        const fieldSrc = isPlayerAttacking ? layout.fieldPlayer : layout.fieldEnemy;
        const fieldDst = isPlayerAttacking ? layout.fieldEnemy : layout.fieldPlayer;

        // Source position (attacker zone center)
        const zoneW = this.ZONE_W;
        const gap = this.ZONE_GAP;
        const totalHeroW = zoneW * 3 + gap * 2;
        const heroStartX = fieldSrc.x + (fieldSrc.w - totalHeroW) / 2;
        const srcX = heroStartX + attackIdx * (zoneW + gap) + zoneW / 2;
        const srcY = fieldSrc.y + fieldSrc.h / 2;

        // Target position
        const tgtStartX = fieldDst.x + (fieldDst.w - totalHeroW) / 2;
        const tgtX = tgtStartX + targetIdx * (zoneW + gap) + zoneW / 2;
        const tgtY = fieldDst.y + fieldDst.h / 2;

        this.attackAnims.push({
            srcX, srcY, tgtX, tgtY,
            progress: 0,
            speed: 0.04,
            damage: damage,
            isCrit: isCrit,
            isPlayer: isPlayerAttacking,
            phase: 'lunge', // lunge → impact → retreat
            impactDone: false,
        });
    },

    _renderAttackAnims(ctx) {
        for (let i = this.attackAnims.length - 1; i >= 0; i--) {
            const anim = this.attackAnims[i];
            
            if (anim.phase === 'lunge') {
                anim.progress += anim.speed;
                const t = Math.min(1, anim.progress);
                const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                
                const curX = anim.srcX + (anim.tgtX - anim.srcX) * eased;
                const curY = anim.srcY + (anim.tgtY - anim.srcY) * eased;

                // Trail line with glow
                ctx.strokeStyle = anim.isCrit ? 'rgba(255,50,50,0.8)' : 'rgba(255,200,50,0.6)';
                ctx.lineWidth = anim.isCrit ? 4 : 3;
                ctx.shadowColor = anim.isCrit ? '#ff4444' : '#ffd700';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(anim.srcX, anim.srcY);
                ctx.lineTo(curX, curY);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Bright projectile
                ctx.fillStyle = anim.isCrit ? '#ff6666' : '#ffdd44';
                ctx.shadowColor = anim.isCrit ? '#ff4444' : '#ffd700';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(curX, curY, anim.isCrit ? 8 : 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                if (t >= 1) {
                    anim.phase = 'impact';
                    anim.progress = 0;
                }
            } else if (anim.phase === 'impact') {
                anim.progress += 0.04; // Slower for drama
                
                if (!anim.impactDone) {
                    // Spawn damage number (bigger)
                    this.spawnDamageNumber(
                        anim.tgtX + (Math.random() - 0.5) * 20,
                        anim.tgtY - 30,
                        anim.damage,
                        anim.isCrit
                    );
                    // Strong screen shake
                    this.triggerShake(anim.isCrit ? 12 : 6, anim.isCrit ? 0.8 : 0.5);
                    anim.impactDone = true;
                }

                // Full-screen flash
                const flashAlpha = Math.max(0, 0.4 * (1 - anim.progress));
                if (flashAlpha > 0) {
                    ctx.fillStyle = anim.isCrit ? `rgba(255,50,50,${flashAlpha})` : `rgba(255,255,200,${flashAlpha})`;
                    ctx.fillRect(0, 0, this.W, this.H);
                }

                // Radial burst at impact point
                const burstProgress = Math.min(1, anim.progress * 2);
                const burstRadius = 40 * burstProgress;
                const burstAlpha = Math.max(0, 0.6 * (1 - burstProgress));
                if (burstAlpha > 0) {
                    ctx.strokeStyle = anim.isCrit ? `rgba(255,100,50,${burstAlpha})` : `rgba(255,220,100,${burstAlpha})`;
                    ctx.lineWidth = 3;
                    for (let r = 0; r < 8; r++) {
                        const angle = (r / 8) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.moveTo(anim.tgtX, anim.tgtY);
                        ctx.lineTo(
                            anim.tgtX + Math.cos(angle) * burstRadius,
                            anim.tgtY + Math.sin(angle) * burstRadius
                        );
                        ctx.stroke();
                    }
                    // Impact ring
                    ctx.strokeStyle = anim.isCrit ? `rgba(255,50,50,${burstAlpha * 0.5})` : `rgba(255,220,100,${burstAlpha * 0.5})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(anim.tgtX, anim.tgtY, burstRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                if (anim.progress >= 1) {
                    this.attackAnims.splice(i, 1);
                }
            }
        }
    },

    // ===== DAMAGE NUMBERS =====
    spawnDamageNumber(x, y, amount, isCrit) {
        this.damageNumbers.push({
            x, y,
            text: isCrit ? `💥${amount}` : `-${amount}`,
            color: isCrit ? '#ff4444' : '#ffffff',
            outline: isCrit ? '#880000' : '#000000',
            fontSize: isCrit ? 22 : 16,
            alpha: 1.0,
            vy: -2,
            scale: isCrit ? 1.5 : 1.2,
            life: 1.0,
        });
    },

    spawnHealNumber(x, y, amount) {
        this.damageNumbers.push({
            x, y,
            text: `+${amount}`,
            color: '#44ff88',
            outline: '#006622',
            fontSize: 12,
            alpha: 1.0,
            vy: -1.2,
            scale: 1.0,
            life: 1.0,
        });
    },

    _renderDamageNumbers(ctx) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            dn.y += dn.vy;
            dn.life -= 0.02;
            dn.alpha = Math.max(0, dn.life);

            if (dn.life <= 0) {
                this.damageNumbers.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = dn.alpha;
            ctx.translate(dn.x, dn.y);
            ctx.scale(dn.scale, dn.scale);

            // Outline
            ctx.font = `bold ${dn.fontSize}px "Press Start 2P"`;
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            ctx.strokeStyle = dn.outline;
            ctx.strokeText(dn.text, 0, 0);

            // Fill
            ctx.fillStyle = dn.color;
            ctx.fillText(dn.text, 0, 0);

            ctx.restore();
        }
    },

    // ===== PHASE BANNER =====
    _phaseBanner: null,

    showPhaseBanner(text, isPlayer) {
        this._phaseBanner = {
            text: text.toUpperCase(),
            color: isPlayer ? '#ffd700' : '#88ccff',
            alpha: 0,
            scale: 0.5,
            life: 1.0,
            phase: 'in', // in → hold → out
        };
    },

    _renderPhaseBanner(ctx) {
        const pb = this._phaseBanner;
        if (!pb) return;

        if (pb.phase === 'in') {
            pb.alpha = Math.min(1, pb.alpha + 0.08);
            pb.scale = Math.min(1.0, pb.scale + 0.04);
            if (pb.alpha >= 1) pb.phase = 'hold';
        } else if (pb.phase === 'hold') {
            pb.life -= 0.02;
            if (pb.life <= 0.3) pb.phase = 'out';
        } else if (pb.phase === 'out') {
            pb.alpha -= 0.04;
            if (pb.alpha <= 0) {
                this._phaseBanner = null;
                return;
            }
        }

        // Semi-transparent backdrop
        ctx.fillStyle = `rgba(0,0,0,${pb.alpha * 0.5})`;
        ctx.fillRect(0, this.H / 2 - 20, this.W, 40);

        ctx.save();
        ctx.globalAlpha = pb.alpha;
        ctx.translate(this.W / 2, this.H / 2);
        ctx.scale(pb.scale, pb.scale);

        // Shadow
        ctx.shadowColor = pb.color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = pb.color;
        ctx.font = 'bold 16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(pb.text, 0, 6);
        ctx.shadowBlur = 0;

        ctx.restore();
    },

    // ===== SCREEN SHAKE =====
    triggerShake(intensity, duration) {
        this.shakeDecay = duration || 0.3;
        this.shakeX = (Math.random() - 0.5) * intensity;
        this.shakeY = (Math.random() - 0.5) * intensity;
    },

    // ===== TRANSITION =====
    _renderTransition(ctx) {
        const elapsed = Date.now() - this.transitionStartTime;
        const progress = Math.min(1, elapsed / this.TRANSITION_DURATION);

        if (this.transitionType === 'enter') {
            this.transitionAlpha = 1 - progress;
        } else {
            this.transitionAlpha = progress;
        }

        if (this.transitionAlpha > 0.01) {
            // Dramatic effect: radial wipe + fade
            ctx.save();
            ctx.globalAlpha = this.transitionAlpha;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, this.W, this.H);

            // Center glow during transition
            if (this.transitionAlpha > 0.3) {
                const glowAlpha = (this.transitionAlpha - 0.3) / 0.7;
                const gradient = ctx.createRadialGradient(
                    this.W / 2, this.H / 2, 0,
                    this.W / 2, this.H / 2, this.W * 0.5
                );
                gradient.addColorStop(0, `rgba(255,215,0,${glowAlpha * 0.3})`);
                gradient.addColorStop(0.5, `rgba(68,136,255,${glowAlpha * 0.15})`);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, this.W, this.H);
            }

            // "DUEL!" text during enter
            if (this.transitionType === 'enter' && this.transitionAlpha > 0.5) {
                const textAlpha = Math.min(1, (this.transitionAlpha - 0.5) * 3);
                ctx.globalAlpha = textAlpha;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 30;
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 28px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText('⚔ DUEL! ⚔', this.W / 2, this.H / 2 + 10);
                ctx.shadowBlur = 0;
            }

            ctx.restore();
        }
    },

    _drawBlackScreen() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.W, this.H);
    },

    // ===== UTILITY =====
    /** Get pixel position of a hero zone for external animation targeting */
    getHeroZonePosition(zoneIndex, isPlayer) {
        const layout = this._calcLayout();
        const field = isPlayer ? layout.fieldPlayer : layout.fieldEnemy;
        const totalHeroW = this.ZONE_W * 3 + this.ZONE_GAP * 2;
        const heroStartX = field.x + (field.w - totalHeroW) / 2;
        return {
            x: heroStartX + zoneIndex * (this.ZONE_W + this.ZONE_GAP) + this.ZONE_W / 2,
            y: field.y + field.h / 2,
        };
    },

    isActive() {
        return this.active;
    },
};
