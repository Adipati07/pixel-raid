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

        // Resize canvas to fill FULL viewport (cards now drawn in canvas)
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const aspect = 600 / 400; // 3:2
        let cw = vh * aspect > vw ? vw : vh * aspect;
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

        // Hide HTML card hand (now drawn in canvas)
        const cardHand = document.getElementById('card-hand-area');
        if (cardHand) cardHand.style.display = 'none';

        // ===== CANVAS CLICK HANDLER FOR CARDS =====
        this._cardClickHandler = (e) => this._onCanvasClick(e);
        this.canvas.addEventListener('click', this._cardClickHandler);
        this.canvas.style.cursor = 'default';
        this._hoveredCard = -1;
        this._cardMouseMove = (e) => this._onCanvasMouseMove(e);
        this.canvas.addEventListener('mousemove', this._cardMouseMove);
        this._cardFlyAnims = []; // active card fly animations
        this._playingCardIndex = -1; // card currently being animated

        // Keep only action buttons visible below canvas
        const actionRow = document.querySelector('.battle-action-row');
        const controls = document.querySelector('.battle-controls');
        [actionRow, controls].forEach(el => {
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

        // Hook battle engine attack callback
        BattleEngine.onAttack = (info) => {
            this.playAttack(0, 0, info.isPlayerAttacking, info.damage, info.isCrit);
        };

        // Hook battle engine draw callback
        BattleEngine.onDraw = (info) => {
            if (info.isPlayer) {
                this._cardDrawAnims.push({
                    startTime: performance.now(),
                    duration: 400,
                    x: this.W + 50, // start off-screen right
                    targetX: 0, // will be set in _renderCardDrawAnims
                });
            }
        };
        this._cardDrawAnims = [];

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

            // Remove canvas event listeners
            if (this._cardClickHandler && this.canvas) {
                this.canvas.removeEventListener('click', this._cardClickHandler);
                this.canvas.removeEventListener('mousemove', this._cardMouseMove);
                this._cardClickHandler = null;
                this._cardMouseMove = null;
            }
            this._cardFlyAnims = [];
            this._hoveredCard = -1;

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

        // Draw enemy LP bar (top-left)
        this._drawLPBar(ctx, state.enemy, false, layout.lpEnemy);

        // Draw enemy hero zone (left side, facing right)
        this._drawField(ctx, state.enemy, false, layout.fieldEnemy);

        // Draw VS divider (center)
        this._drawCenterDivider(ctx, state, layout.vsCenter);

        // Draw player hero zone (right side, facing left)
        this._drawField(ctx, state.player, true, layout.fieldPlayer);

        // Draw player LP bar (top-right)
        this._drawLPBar(ctx, state.player, true, layout.lpPlayer);

        // Draw player hand as 2x2 card grid in bottom area
        this._drawHand(ctx, state.player, layout.hand);

        // Draw card fly animations (on top of everything)
        this._renderCardFlyAnims(ctx);

        // Draw card draw animations
        this._renderCardDrawAnims(ctx);

        // Draw vignette (dramatic edge darkening)
        this._drawVignette(ctx, W, H);

        // Draw attack animations
        this._renderAttackAnims(ctx);

        // Update hero lunge animation
        if (this._heroLunge) {
            const l = this._heroLunge;
            if (l.phase === 'forward') {
                l.progress += 0.15;
                l.offsetX = l.targetOffsetX * Math.min(1, l.progress);
                if (l.progress >= 1) { l.phase = 'hold'; l.progress = 0; }
            } else if (l.phase === 'hold') {
                l.progress += 0.1;
                if (l.progress >= 0.5) { l.phase = 'back'; l.progress = 0; }
            } else if (l.phase === 'back') {
                l.progress += 0.1;
                l.offsetX = l.targetOffsetX * (1 - Math.min(1, l.progress));
                if (l.progress >= 1) { this._heroLunge = null; }
            }
        }

        // Draw floating damage numbers
        this._renderDamageNumbers(ctx);

        // Draw phase banner if active
        this._renderPhaseBanner(ctx);

        // Draw battle end overlay if active
        this._renderBattleEnd(ctx);

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
        const centerW = this.CENTER_H; // reuse for VS divider width
        const gap = this.FIELD_GAP;

        // Reserve bottom 30% for card hand (2x2 grid)
        const handH = Math.floor(H * 0.30);
        const battleH = H - handH;

        // LP bars at top (enemy left, player right)
        const lpW = (W - gap * 3) / 2;

        // Battle area below LP bars — HORIZONTAL duel layout
        const fieldTop = lpH + gap;
        const fieldH = battleH - lpH - gap * 2;
        const heroW = Math.floor((W - centerW - gap * 4) / 2);

        return {
            lpEnemy:     { x: 0, y: 0, w: lpW, h: lpH },
            lpPlayer:    { x: lpW + gap * 2, y: 0, w: lpW, h: lpH },
            fieldEnemy:  { x: 0, y: fieldTop, w: heroW, h: fieldH },
            vsCenter:    { x: heroW + gap, y: fieldTop, w: centerW + gap * 2, h: fieldH },
            fieldPlayer: { x: heroW + centerW + gap * 3, y: fieldTop, w: heroW, h: fieldH },
            hand:        { x: 0, y: battleH, w: W, h: handH },
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

        // 2.5D perspective scaling — enemy (left) slightly smaller, player (right) bigger
        const scale = isPlayer ? 1.1 : 0.9;
        const scaledZoneW = zoneW * scale;
        const scaledZoneH = zoneH * scale;
        const scaledSkillW = skillW * scale;
        const scaledSkillH = skillH * scale;
        const scaledGap = gap * scale;

        // Horizontal layout: hero centered, skills above and below
        const totalH = scaledZoneH + scaledSkillH * 2 + scaledGap * 2;
        const startY = y + (h - totalH) / 2;
        const heroX = x + (w - scaledZoneW) / 2;

        // Field decoration
        ctx.fillStyle = isPlayer ? 'rgba(0,100,0,0.04)' : 'rgba(0,0,100,0.04)';
        ctx.fillRect(x, y, w, h);

        // Draw the main hero
        const rawHero = combatant.hero || (combatant.heroes && combatant.heroes[0]) || null;
        let hero = rawHero;
        if (rawHero && combatant.battleHero) {
            hero = { ...rawHero };
            hero.currentHp = combatant.battleHero.heroHP || combatant.battleHero.hp || rawHero.stats?.hp || 0;
            hero.maxHp = combatant.battleHero.heroMaxHP || combatant.battleHero.maxHp || rawHero.stats?.maxHp || 0;
            hero.atk = combatant.battleHero.heroATK || rawHero.stats?.atk || 0;
            hero.def = combatant.battleHero.heroDEF || rawHero.stats?.def || 0;
        } else if (rawHero && rawHero.stats) {
            hero = { ...rawHero };
            hero.currentHp = rawHero.stats.hp;
            hero.maxHp = rawHero.stats.maxHp;
        }

        const heroY = startY + scaledSkillH + scaledGap;

        // Apply hero lunge offset if attacking
        let lungeOffsetX = 0;
        if (this._heroLunge && this._heroLunge.isPlayer === isPlayer) {
            lungeOffsetX = this._heroLunge.offsetX || 0;
        }

        // Flip enemy hero to face right, player hero faces left
        if (!isPlayer) {
            ctx.save();
            ctx.translate(heroX + scaledZoneW + lungeOffsetX, heroY);
            ctx.scale(-1, 1);
            this._drawHeroZone(ctx, 0, 0, scaledZoneW, scaledZoneH, hero, isPlayer, 0);
            ctx.restore();
        } else {
            this._drawHeroZone(ctx, heroX + lungeOffsetX, heroY, scaledZoneW, scaledZoneH, hero, isPlayer, 0);
        }

        // Draw skill zones above and below hero
        const skillX = x + (w - scaledSkillW) / 2;
        const topSkillY = startY;
        const botSkillY = startY + scaledSkillH + scaledGap + scaledZoneH + scaledGap;

        const leftSkill = combatant.skillZones ? combatant.skillZones[0] : null;
        const rightSkill = combatant.skillZones ? combatant.skillZones[1] : null;

        this._drawSkillZone(ctx, skillX, topSkillY, scaledSkillW, scaledSkillH, leftSkill, 0);
        this._drawSkillZone(ctx, skillX, botSkillY, scaledSkillW, scaledSkillH, rightSkill, 1);
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
        const totalAtk = (hero.stats?.atk || hero.atk || 0) + (hero.atkBuff || 0);
        const totalDef = (hero.stats?.def || hero.def || 0) + (hero.defBuff || 0);
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

        // Background gradient (vertical stripe)
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0.9)');
        grad.addColorStop(0.5, 'rgba(15,15,35,0.95)');
        grad.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        // Gold accent lines (left/right edges)
        ctx.fillStyle = 'rgba(255,215,0,0.5)';
        ctx.fillRect(x, y, 1, h);
        ctx.fillRect(x + w - 1, y, 1, h);

        // VS badge (center)
        const vsX = x + w / 2;
        const vsY = y + h / 2;

        // VS glow
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 14px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('VS', vsX, vsY + 5);
        ctx.shadowBlur = 0;

        // Turn info (above VS)
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '6px "Press Start 2P"';
        ctx.fillText(`Turn ${state.turn}`, vsX, vsY - 20);

        // Phase info (below VS)
        const phaseNames = { draw: '📥 DRAW', main: '🃏 MAIN', battle: '⚔️ BATTLE', end: '⏳ END', idle: '' };
        ctx.fillStyle = 'rgba(68,204,136,0.8)';
        ctx.font = '5px "Press Start 2P"';
        ctx.fillText(phaseNames[state.phase] || '', vsX, vsY + 25);

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

    // ===== HAND CARDS (2x2 grid at bottom) =====
    _drawHand(ctx, combatant, rect) {
        const { x, y, w, h } = rect;
        const hand = combatant.hand || [];
        if (!hand.length) return;

        // Hand area background
        ctx.fillStyle = 'rgba(5, 5, 20, 0.85)';
        ctx.fillRect(x, y, w, h);

        // Top border line
        ctx.strokeStyle = 'rgba(68, 136, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();

        // "YOUR HAND" label
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(68, 136, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('YOUR HAND', x + w / 2, y + 14);

        // 2x2 grid for first 4 cards
        const cardsToShow = hand.slice(0, 4);
        const pad = 8;
        const gap = 6;
        const gridTop = y + 22;
        const gridH = h - 28;
        const cardW = (w - pad * 2 - gap) / 2;
        const cardH = (gridH - gap) / 2;

        const positions = [
            { cx: x + pad, cy: gridTop },
            { cx: x + pad + cardW + gap, cy: gridTop },
            { cx: x + pad, cy: gridTop + cardH + gap },
            { cx: x + pad + cardW + gap, cy: gridTop + cardH + gap },
        ];

        for (let i = 0; i < cardsToShow.length; i++) {
            // Skip card being animated (flying to arena)
            if (this._playingCardIndex === i) continue;
            const card = cardsToShow[i];
            const pos = positions[i];
            this._drawCard(ctx, card, pos.cx, pos.cy, cardW, cardH, i + 1);
        }
    },

    _drawCard(ctx, card, x, y, w, h, index) {
        const color = card.pixelColor || '#4488ff';
        const rarity = card.rarity || 'common';
        const isHovered = this._hoveredCard === (index - 1);
        const isPlayable = BattleEngine.isPlayerTurn && BattleEngine.currentPhase === 'main' && BattleEngine._cardsPlayedThisTurn < BattleEngine.MAX_CARDS_PER_TURN;
        const rarityColors = {
            common: '#8a8a8a',
            rare: '#4488ff',
            epic: '#aa44ff',
            legendary: '#ffaa00',
            mythic: '#ff4488',
        };
        const borderColor = rarityColors[rarity] || '#8a8a8a';

        // Card background
        ctx.fillStyle = isHovered && isPlayable ? 'rgba(25, 20, 50, 0.98)' : 'rgba(15, 12, 30, 0.95)';
        ctx.fillRect(x, y, w, h);

        // Card border (rarity color, glow when hovered)
        if (isHovered && isPlayable) {
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 10;
        }
        ctx.strokeStyle = isHovered && isPlayable ? '#ffd700' : borderColor;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0;

        // Playable indicator (subtle glow on non-hovered playable cards)
        if (isPlayable && !isHovered) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
        }

        // Color strip at top
        ctx.fillStyle = color;
        ctx.fillRect(x + 2, y + 2, w - 4, 4);

        // Card icon (type-specific emoji)
        const typeEmojis = {
            attack: '⚔️', damage: '💥', defense: '🛡️', buff: '⬆️',
            debuff: '⬇️', heal: '💚', special: '⭐', draw: '📥',
            shield: '🛡️', speed: '💨', poison: '☠️', burn: '🔥',
        };
        const cardType = card.type || card.cardType || '';
        const emoji = typeEmojis[cardType] || '🃏';
        const iconSize = Math.min(w * 0.35, h * 0.25);
        ctx.font = `${iconSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(emoji, x + w / 2, y + 10 + iconSize * 0.8);

        // Card name
        ctx.font = 'bold 8px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        const name = card.name || 'Card';
        ctx.fillText(name, x + w / 2, y + 10 + iconSize + 10);

        // Card type
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillStyle = borderColor;
        const type = (card.type || '').toUpperCase();
        ctx.fillText(type, x + w / 2, y + 10 + iconSize + 20);

        // Mana cost (top-right corner)
        if (card.manaCost !== undefined) {
            const manaR = 8;
            const mx = x + w - manaR - 3;
            const my = y + manaR + 3;
            ctx.beginPath();
            ctx.arc(mx, my, manaR, 0, Math.PI * 2);
            ctx.fillStyle = '#2244aa';
            ctx.fill();
            ctx.strokeStyle = '#4488ff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.font = 'bold 7px "Press Start 2P", monospace';
            ctx.fillStyle = '#88ccff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(card.manaCost), mx, my);
            ctx.textBaseline = 'alphabetic';
        }

        // Description (truncated)
        if (card.description) {
            ctx.font = '5px "Press Start 2P", monospace';
            ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
            ctx.textAlign = 'center';
            const desc = card.description.length > 30 ? card.description.slice(0, 28) + '..' : card.description;
            ctx.fillText(desc, x + w / 2, y + h - 6);
        }

        // Keybind number (top-left)
        ctx.font = 'bold 7px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffcc00';
        ctx.textAlign = 'left';
        ctx.fillText(String(index), x + 4, y + 12);
    },

    // ===== CARD CLICK & FLY ANIMATION =====
    _getCardRects() {
        const layout = this._calcLayout();
        const { x, y, w, h } = layout.hand;
        const state = BattleEngine.getFieldState();
        const hand = state.player.hand || [];
        if (!hand.length) return [];

        const pad = 8;
        const gap = 6;
        const gridTop = y + 22;
        const gridH = h - 28;
        const cardW = (w - pad * 2 - gap) / 2;
        const cardH = (gridH - gap) / 2;

        const positions = [
            { cx: x + pad, cy: gridTop },
            { cx: x + pad + cardW + gap, cy: gridTop },
            { cx: x + pad, cy: gridTop + cardH + gap },
            { cx: x + pad + cardW + gap, cy: gridTop + cardH + gap },
        ];

        return hand.slice(0, 4).map((card, i) => ({
            card, index: i,
            x: positions[i].cx, y: positions[i].cy,
            w: cardW, h: cardH
        }));
    },

    _onCanvasMouseMove(e) {
        if (!this.active || this.transitioning) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.W / rect.width;
        const scaleY = this.H / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        const cards = this._getCardRects();
        let hovered = -1;
        for (const c of cards) {
            if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
                hovered = c.index;
                break;
            }
        }
        this._hoveredCard = hovered;
        this.canvas.style.cursor = hovered >= 0 ? 'pointer' : 'default';
    },

    _onCanvasClick(e) {
        if (!this.active || this.transitioning) return;
        if (!BattleEngine.isRunning || !BattleEngine.isPlayerTurn) return;
        if (BattleEngine.currentPhase !== 'main') return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.W / rect.width;
        const scaleY = this.H / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        const cards = this._getCardRects();
        for (const c of cards) {
            if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
                this._playCardAnim(c.index);
                return;
            }
        }
    },

    _playCardAnim(cardIndex) {
        // Check if card can be played
        if (BattleEngine._cardsPlayedThisTurn >= BattleEngine.MAX_CARDS_PER_TURN) {
            BattleEngine.addLog('❌ Already played a card this turn!', 'info');
            return;
        }

        const cards = this._getCardRects();
        const card = cards[cardIndex];
        if (!card) return;

        // Calculate target position (player hero zone center)
        const layout = this._calcLayout();
        const targetX = layout.fieldPlayer.x + layout.fieldPlayer.w / 2;
        const targetY = layout.fieldPlayer.y + layout.fieldPlayer.h / 2;

        // Capture card data BEFORE playCard removes it from hand
        const cardData = { ...card.card };

        // Start fly animation
        const anim = {
            card: cardData,
            index: cardIndex,
            startX: card.x + card.w / 2,
            startY: card.y + card.h / 2,
            startW: card.w,
            startH: card.h,
            targetX,
            targetY,
            startTime: performance.now(),
            duration: 500,
            done: false
        };
        this._cardFlyAnims.push(anim);

        // Mark card as "being played" so _drawHand skips it
        this._playingCardIndex = cardIndex;

        // Play the card after animation completes
        setTimeout(() => {
            this._playingCardIndex = -1;
            BattleEngine.playCard(cardIndex);
        }, anim.duration + 50);
    },

    _renderCardFlyAnims(ctx) {
        if (!this._cardFlyAnims.length) return;
        const now = performance.now();
        this._cardFlyAnims = this._cardFlyAnims.filter(anim => {
            const t = Math.min(1, (now - anim.startTime) / anim.duration);
            const ease = 1 - Math.pow(1 - t, 3); // ease out cubic

            const cx = anim.startX + (anim.targetX - anim.startX) * ease;
            const cy = anim.startY + (anim.targetY - anim.startY) * ease;
            const cw = anim.startW * (1 - ease * 0.7);
            const ch = anim.startH * (1 - ease * 0.7);

            ctx.save();
            ctx.globalAlpha = 1 - ease * 0.5;

            // Glow trail
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 20 * (1 - ease);

            // Card body
            const color = anim.card.pixelColor || '#4488ff';
            ctx.fillStyle = color;
            ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);

            // Card name
            ctx.shadowBlur = 0;
            ctx.font = 'bold 7px "Press Start 2P", monospace';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(anim.card.name || 'Card', cx, cy + 3);

            ctx.restore();

            if (t >= 1) {
                anim.done = true;
                return false;
            }
            return true;
        });
    },

    // ===== CARD DRAW ANIMATION =====
    _renderCardDrawAnims(ctx) {
        if (!this._cardDrawAnims || !this._cardDrawAnims.length) return;
        const now = performance.now();
        const layout = this._calcLayout();
        const handRect = layout.hand;

        this._cardDrawAnims = this._cardDrawAnims.filter(anim => {
            const t = Math.min(1, (now - anim.startTime) / anim.duration);
            const ease = 1 - Math.pow(1 - t, 3);

            // Animate from right side to hand area
            const startX = this.W + 50;
            const endX = handRect.x + handRect.w / 2;
            const y = handRect.y + handRect.h / 2;
            const cx = startX + (endX - startX) * ease;

            // Draw card sliding in
            const cw = 60 * (0.5 + ease * 0.5);
            const ch = 80 * (0.5 + ease * 0.5);

            ctx.save();
            ctx.globalAlpha = ease;
            ctx.shadowColor = '#4488ff';
            ctx.shadowBlur = 15 * (1 - ease);

            ctx.fillStyle = 'rgba(15, 12, 30, 0.95)';
            ctx.fillRect(cx - cw / 2, y - ch / 2, cw, ch);
            ctx.strokeStyle = '#4488ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - cw / 2, y - ch / 2, cw, ch);

            ctx.shadowBlur = 0;
            ctx.font = '6px "Press Start 2P"';
            ctx.fillStyle = '#4488ff';
            ctx.textAlign = 'center';
            ctx.fillText('📥 DRAW', cx, y + 3);

            ctx.restore();

            return t < 1;
        });
    },

    // ===== ATTACK ANIMATIONS =====
    playAttack(attackIdx, targetIdx, isPlayerAttacking, damage, isCrit) {
        const layout = this._calcLayout();
        const fieldSrc = isPlayerAttacking ? layout.fieldPlayer : layout.fieldEnemy;
        const fieldDst = isPlayerAttacking ? layout.fieldEnemy : layout.fieldPlayer;

        // Single hero centered in field
        const srcX = fieldSrc.x + fieldSrc.w / 2;
        const srcY = fieldSrc.y + fieldSrc.h / 2;
        const tgtX = fieldDst.x + fieldDst.w / 2;
        const tgtY = fieldDst.y + fieldDst.h / 2;

        // Hero lunge effect — shift hero toward enemy briefly
        this._heroLunge = {
            isPlayer: isPlayerAttacking,
            offsetX: 0,
            phase: 'forward', // forward → hold → back
            progress: 0,
            targetOffsetX: isPlayerAttacking ? -30 : 30, // toward enemy
        };

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

    // ===== BATTLE END OVERLAY =====
    showBattleEnd(result) {
        this._battleEnd = {
            result: result, // 'win' or 'lose'
            alpha: 0,
            scale: 0.5,
            phase: 'in',
            startTime: performance.now(),
        };
    },

    _renderBattleEnd(ctx) {
        const be = this._battleEnd;
        if (!be) return;

        if (be.phase === 'in') {
            be.alpha = Math.min(1, be.alpha + 0.03);
            be.scale = Math.min(1.0, be.scale + 0.025);
            if (be.alpha >= 1) be.phase = 'hold';
        }

        const W = this.W;
        const H = this.H;

        // Full screen dark overlay
        ctx.fillStyle = `rgba(0,0,0,${be.alpha * 0.7})`;
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.globalAlpha = be.alpha;
        ctx.translate(W / 2, H / 2);
        ctx.scale(be.scale, be.scale);

        const isWin = be.result === 'win';
        const color = isWin ? '#ffd700' : '#ff4444';
        const text = isWin ? '🏆 VICTORY!' : '💀 DEFEATED';
        const subText = isWin ? 'Stage Clear!' : 'Try Again...';

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 30;

        // Main text
        ctx.fillStyle = color;
        ctx.font = 'bold 20px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(text, 0, -10);

        // Sub text
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText(subText, 0, 20);

        ctx.shadowBlur = 0;
        ctx.restore();

        // Particles burst for victory
        if (isWin && be.alpha > 0.5) {
            const t = (performance.now() - be.startTime) / 1000;
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2 + t;
                const dist = 50 + t * 40;
                const px = W / 2 + Math.cos(angle) * dist;
                const py = H / 2 + Math.sin(angle) * dist;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fillStyle = ['#ffd700', '#ff6644', '#44ff88', '#4488ff'][i % 4];
                ctx.globalAlpha = Math.max(0, 1 - t * 0.3);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
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
        // Single hero centered in field
        return {
            x: field.x + field.w / 2,
            y: field.y + field.h / 2,
        };
    },

    isActive() {
        return this.active;
    },
};
