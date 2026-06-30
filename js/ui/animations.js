/* ========================================
 * PIXEL RAID — Battle Animation System (v4)
 * Smooth, satisfying animations for card duels
 * Premium feel with proper easing and timing
 * ======================================== */

const BattleAnimations = {
    // Animation queue for sequencing
    _queue: [],
    _isAnimating: false,
    _damageNumbers: [],
    _phaseBanner: null,
    _screenShake: { intensity: 0, duration: 0, elapsed: 0 },
    _cardMoves: [],
    _lpAnim: { player: null, enemy: null },
    _raf: null,
    _summonEffects: [],
    _attackFlashes: [],
    _turnBanners: [],

    init() {
        this._startLoop();
    },

    _startLoop() {
        if (this._raf) return;
        const tick = () => {
            this._raf = requestAnimationFrame(tick);
        };
        this._raf = requestAnimationFrame(tick);
    },

    stop() {
        if (this._raf) {
            cancelAnimationFrame(this._raf);
            this._raf = null;
        }
        this._queue = [];
        this._damageNumbers = [];
        this._cardMoves = [];
        this._summonEffects = [];
        this._attackFlashes = [];
        this._turnBanners = [];
        this._isAnimating = false;
    },

    // ===== ANIMATION QUEUE =====
    enqueue(fn, duration) {
        return new Promise(resolve => {
            this._queue.push({ fn, duration: duration || 0, resolve });
            if (!this._isAnimating) this._processQueue();
        });
    },

    async _processQueue() {
        if (this._queue.length === 0) {
            this._isAnimating = false;
            return;
        }
        this._isAnimating = true;
        const item = this._queue.shift();
        item.fn();
        if (item.duration > 0) {
            await this._wait(item.duration);
        }
        item.resolve();
        this._processQueue();
    },

    _wait(ms) {
        return new Promise(r => setTimeout(r, ms));
    },

    // ===== DAMAGE NUMBERS — Float up, color-coded =====
    spawnDamageNumber(x, y, text, color, fontSize) {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;
        const canvas = document.getElementById('battle-canvas');
        if (!canvas) return;

        const pctX = (x / canvas.width) * 100;
        const pctY = (y / canvas.height) * 100;

        const num = document.createElement('div');
        num.className = 'battle-damage-num';
        num.style.cssText = `
            position: absolute;
            left: ${pctX}%;
            top: ${pctY}%;
            transform: translateX(-50%);
            font-family: 'Press Start 2P', monospace;
            font-size: ${fontSize || 14}px;
            color: ${color || '#e94560'};
            pointer-events: none;
            z-index: 50;
            text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 0 0 8px ${color || '#e94560'};
            animation: animDmgFloat 1.2s ease-out forwards;
            white-space: nowrap;
            font-weight: bold;
        `;
        num.textContent = text;
        wrap.appendChild(num);
        setTimeout(() => { if (num.parentNode) num.remove(); }, 1300);
    },

    // ===== SCREEN SHAKE =====
    shakeScreen(intensity, duration) {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;
        const dur = duration || 0.3;
        wrap.style.animation = `animScreenShake ${dur}s ease-in-out`;
        setTimeout(() => { wrap.style.animation = ''; }, dur * 1000 + 50);
    },

    // ===== PHASE BANNER — Slide in from top, hold, slide out =====
    showPhaseBanner(phaseName, isPlayerTurn) {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;

        const old = wrap.querySelector('.phase-banner');
        if (old) old.remove();

        const banner = document.createElement('div');
        banner.className = 'phase-banner';

        // Phase color coding
        const phaseColors = {
            'DRAW': '#4488ff', 'Draw Phase': '#4488ff',
            'MAIN': '#00ff88', 'Main Phase': '#00ff88',
            'BATTLE': '#e94560', 'Battle Phase': '#e94560',
            'END': '#9b59b6', 'End Phase': '#9b59b6',
        };
        const pColor = Object.entries(phaseColors).find(([k]) =>
            phaseName.toUpperCase().includes(k.toUpperCase())
        );
        const bannerColor = pColor ? pColor[1] : (isPlayerTurn ? '#00ff88' : '#e94560');

        banner.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scaleX(0);
            background: linear-gradient(90deg, transparent, rgba(0,0,0,0.9) 10%, rgba(0,0,0,0.9) 90%, transparent);
            padding: 14px 50px;
            z-index: 55;
            pointer-events: none;
            animation: animPhaseBanner 1.5s ease-in-out forwards;
            white-space: nowrap;
            border-top: 2px solid ${bannerColor}40;
            border-bottom: 2px solid ${bannerColor}40;
        `;

        banner.innerHTML = `
            <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:${bannerColor};text-align:center;text-shadow:0 0 12px ${bannerColor},2px 2px 0 #000;letter-spacing:2px;">
                ${phaseName}
            </div>
        `;
        wrap.appendChild(banner);
        setTimeout(() => { if (banner.parentNode) banner.remove(); }, 1600);
    },

    // ===== TURN CHANGE BANNER — Dramatic fade + scale =====
    showTurnBanner(isPlayerTurn) {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;

        const old = wrap.querySelector('.turn-banner');
        if (old) old.remove();

        const banner = document.createElement('div');
        banner.className = 'turn-banner';
        const text = isPlayerTurn ? 'YOUR TURN' : 'ENEMY TURN';
        const color = isPlayerTurn ? '#00ff88' : '#e94560';

        banner.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.5);
            z-index: 56;
            pointer-events: none;
            animation: animTurnBanner 1.8s ease-out forwards;
            white-space: nowrap;
        `;

        banner.innerHTML = `
            <div style="font-family:'Press Start 2P',monospace;font-size:16px;color:${color};text-align:center;text-shadow:0 0 20px ${color},3px 3px 0 #000;letter-spacing:3px;">
                ${text}
            </div>
        `;
        wrap.appendChild(banner);
        setTimeout(() => { if (banner.parentNode) banner.remove(); }, 2000);
    },

    // ===== CARD MOVE ANIMATION (Canvas-based) =====
    animateCardMove(fromX, fromY, toX, toY, duration, onComplete) {
        const move = {
            fromX, fromY, toX, toY,
            currentX: fromX, currentY: fromY,
            startTime: performance.now(),
            duration: duration || 300,
            progress: 0,
            onComplete,
            done: false,
        };
        this._cardMoves.push(move);
        return move;
    },

    // ===== SUMMON EFFECT — Flash of light, hero fades in =====
    spawnSummonEffect(x, y) {
        const canvas = document.getElementById('battle-canvas');
        if (!canvas) return;
        this._summonEffects.push({
            x, y,
            startTime: performance.now(),
            duration: 500,
        });
    },

    // ===== ATTACK FLASH EFFECT =====
    spawnAttackFlash(x, y) {
        const canvas = document.getElementById('battle-canvas');
        if (!canvas) return;
        this._attackFlashes.push({
            x, y,
            startTime: performance.now(),
            duration: 300,
        });
    },

    // ===== LP ANIMATION — Smooth width transition =====
    animateLP(side, fromLP, toLP, maxLP) {
        this._lpAnim[side] = {
            fromLP, toLP, maxLP,
            currentLP: fromLP,
            startTime: performance.now(),
            duration: 400,
        };
    },

    getAnimatedLP(side) {
        const anim = this._lpAnim[side];
        if (!anim) return null;
        const elapsed = performance.now() - anim.startTime;
        const t = Math.min(1, elapsed / anim.duration);
        const ease = 1 - Math.pow(1 - t, 3); // ease out cubic
        anim.currentLP = Math.round(anim.fromLP + (anim.toLP - anim.fromLP) * ease);
        if (t >= 1) {
            this._lpAnim[side] = null;
            return anim.toLP;
        }
        return anim.currentLP;
    },

    // ===== UPDATE CALLED EACH FRAME =====
    update() {
        const now = performance.now();

        // Update card moves
        for (let i = this._cardMoves.length - 1; i >= 0; i--) {
            const m = this._cardMoves[i];
            const elapsed = now - m.startTime;
            const t = Math.min(1, elapsed / m.duration);
            const ease = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
            m.currentX = m.fromX + (m.toX - m.fromX) * ease;
            m.currentY = m.fromY + (m.toY - m.fromY) * ease;
            m.progress = t;
            if (t >= 1 && !m.done) {
                m.done = true;
                if (m.onComplete) m.onComplete();
            }
        }
        this._cardMoves = this._cardMoves.filter(m => !m.done);

        // Clean up summon effects
        this._summonEffects = this._summonEffects.filter(e => now - e.startTime < e.duration);

        // Clean up attack flashes
        this._attackFlashes = this._attackFlashes.filter(e => now - e.startTime < e.duration);
    },

    // ===== RENDER OVERLAY EFFECTS ON CANVAS =====
    renderOverlay(ctx, W, H) {
        const now = performance.now();

        // Summon effects — expanding golden rings + flash
        for (const eff of this._summonEffects) {
            const t = (now - eff.startTime) / eff.duration;
            const alpha = 1 - t;

            ctx.save();

            // Outer expanding ring
            const radius = 15 + t * 50;
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3 * (1 - t);
            ctx.beginPath();
            ctx.arc(eff.x, eff.y, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner flash (white → gold)
            if (t < 0.4) {
                const flashAlpha = (1 - t / 0.4) * 0.6;
                const flashRadius = 20 * (1 - t / 0.4);
                ctx.globalAlpha = flashAlpha;
                const flashGrad = ctx.createRadialGradient(eff.x, eff.y, 0, eff.x, eff.y, flashRadius);
                flashGrad.addColorStop(0, '#ffffff');
                flashGrad.addColorStop(0.5, '#ffd700');
                flashGrad.addColorStop(1, 'rgba(255,215,0,0)');
                ctx.fillStyle = flashGrad;
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, flashRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Inner glow ring
            ctx.globalAlpha = alpha * 0.2;
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(eff.x, eff.y, radius * 0.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // Attack flash effects — red impact burst
        for (const eff of this._attackFlashes) {
            const t = (now - eff.startTime) / eff.duration;
            const alpha = 1 - t;
            const radius = 10 + t * 35;

            ctx.save();
            ctx.globalAlpha = alpha * 0.6;

            // Impact ring
            ctx.strokeStyle = '#e94560';
            ctx.lineWidth = 3 * (1 - t);
            ctx.beginPath();
            ctx.arc(eff.x, eff.y, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Impact flash
            if (t < 0.3) {
                const flashAlpha = (1 - t / 0.3) * 0.5;
                ctx.globalAlpha = flashAlpha;
                const flashGrad = ctx.createRadialGradient(eff.x, eff.y, 0, eff.x, eff.y, 20);
                flashGrad.addColorStop(0, '#ffffff');
                flashGrad.addColorStop(1, 'rgba(233,69,96,0)');
                ctx.fillStyle = flashGrad;
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, 20, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    },

    // ===== HAND CARD ANIMATIONS (CSS-based) =====
    animateCardDraw(container) {
        if (!container) return;
        const cards = container.querySelectorAll('.battle-card');
        if (cards.length === 0) return;
        const last = cards[cards.length - 1];
        last.style.animation = 'none';
        void last.offsetWidth; // reflow
        last.style.animation = 'animCardDrawIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    },

    // Card play — slide from hand, scale 1→1.1→1, fly up (300ms)
    animateCardPlay(el, callback) {
        if (!el) { if (callback) callback(); return; }
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = 'animCardPlayOut 0.3s ease-out forwards';
        setTimeout(() => { if (callback) callback(); }, 300);
    },

    // Card shake — "can't play" indicator
    shakeCard(el) {
        if (!el) return;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = 'animCardShake 0.4s ease-in-out';
        setTimeout(() => { el.style.animation = ''; }, 400);
    },
};

// ===== Inject CSS keyframes =====
(function injectAnimCSS() {
    if (document.getElementById('battle-anim-css')) return;
    const style = document.createElement('style');
    style.id = 'battle-anim-css';
    style.textContent = `
        /* Damage number float — white normal, red crit, green heal */
        @keyframes animDmgFloat {
            0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(0.5); }
            15% { opacity: 1; transform: translateX(-50%) translateY(-8px) scale(1.3); }
            30% { transform: translateX(-50%) translateY(-16px) scale(1); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-50px) scale(0.7); }
        }

        /* Screen shake — smooth micro-movements */
        @keyframes animScreenShake {
            0%, 100% { transform: translate(0, 0); }
            10% { transform: translate(-4px, -2px); }
            20% { transform: translate(4px, 2px); }
            30% { transform: translate(-3px, 1px); }
            40% { transform: translate(3px, -1px); }
            50% { transform: translate(-2px, 2px); }
            60% { transform: translate(2px, -2px); }
            70% { transform: translate(-1px, 1px); }
            80% { transform: translate(1px, -1px); }
        }

        /* Phase banner — slide in from center, hold, slide out */
        @keyframes animPhaseBanner {
            0% { transform: translate(-50%, -50%) scaleX(0); opacity: 0; }
            15% { transform: translate(-50%, -50%) scaleX(1.1); opacity: 1; }
            25% { transform: translate(-50%, -50%) scaleX(1); opacity: 1; }
            70% { transform: translate(-50%, -50%) scaleX(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scaleX(0.3); opacity: 0; }
        }

        /* Turn banner — dramatic fade + scale (YOUR TURN / ENEMY TURN) */
        @keyframes animTurnBanner {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            15% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
            25% { transform: translate(-50%, -50%) scale(1); }
            75% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }

        /* Card draw — bouncy slide in from right */
        @keyframes animCardDrawIn {
            0% { transform: translateX(80px) translateY(-20px) scale(0.3) rotate(10deg); opacity: 0; }
            60% { transform: translateX(-5px) translateY(2px) scale(1.05) rotate(-1deg); opacity: 1; }
            100% { transform: translateX(0) translateY(0) scale(1) rotate(0deg); opacity: 1; }
        }

        /* Card play out — scale 1→1.1→0, fly up (300ms) */
        @keyframes animCardPlayOut {
            0% { transform: translateY(0) scale(1); opacity: 1; }
            30% { transform: translateY(-10px) scale(1.1); opacity: 1; }
            100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
        }

        /* Card shake — can't play indicator */
        @keyframes animCardShake {
            0%, 100% { transform: translateX(0); }
            15% { transform: translateX(-6px); }
            30% { transform: translateX(6px); }
            45% { transform: translateX(-4px); }
            60% { transform: translateX(4px); }
            75% { transform: translateX(-2px); }
            90% { transform: translateX(2px); }
        }

        /* Card glow pulse for playable cards */
        @keyframes animCardGlow {
            0%, 100% { box-shadow: 0 0 6px var(--rarity-glow, #ffd700), 0 2px 4px rgba(0,0,0,0.5); }
            50% { box-shadow: 0 0 14px var(--rarity-glow, #ffd700), 0 0 24px var(--rarity-glow, #ffd700), 0 2px 4px rgba(0,0,0,0.5); }
        }

        /* LP change flash */
        @keyframes animLPFlash {
            0% { text-shadow: 0 0 20px #e94560; }
            100% { text-shadow: none; }
        }

        /* Skill activation glow */
        @keyframes animSkillActivate {
            0% { box-shadow: 0 0 10px rgba(170,68,255,0.5); filter: brightness(1.5); }
            50% { box-shadow: 0 0 30px rgba(170,68,255,0.8); filter: brightness(2); }
            100% { box-shadow: none; filter: brightness(1); }
        }

        /* Hero death — fade to grayscale, dissolve */
        @keyframes animHeroDeath {
            0% { filter: none; opacity: 1; }
            40% { filter: grayscale(1); opacity: 1; }
            100% { filter: grayscale(1); opacity: 0; }
        }

        /* Hero summon — flash in */
        @keyframes animHeroSummon {
            0% { filter: brightness(2); opacity: 0; transform: scale(0.8); }
            30% { filter: brightness(1.5); opacity: 1; transform: scale(1.05); }
            100% { filter: none; opacity: 1; transform: scale(1); }
        }

        .battle-card.card-playable-anim {
            animation: animCardGlow 1.2s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);
})();
