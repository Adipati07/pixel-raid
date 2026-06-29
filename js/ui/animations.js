/* ========================================
 * PIXEL RAID — Battle Animation System
 * Smooth animations for card duels
 * ======================================== */

const BattleAnimations = {
    // Animation queue for sequencing
    _queue: [],
    _isAnimating: false,
    _damageNumbers: [],
    _phaseBanner: null,
    _screenShake: { intensity: 0, duration: 0, elapsed: 0 },
    _cardMoves: [],    // cards flying from A to B on canvas
    _lpAnim: { player: null, enemy: null },
    _raf: null,
    _summonEffects: [],  // summon flash effects
    _attackFlashes: [],  // attack hit flashes

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

    // ===== DAMAGE NUMBERS =====
    spawnDamageNumber(x, y, text, color, fontSize) {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;
        const canvas = document.getElementById('battle-canvas');
        if (!canvas) return;

        // Convert canvas coords to percentage
        const pctX = (x / canvas.width) * 100;
        const pctY = (y / canvas.height) * 100;

        const num = document.createElement('div');
        num.className = 'battle-damage-num anim-dmg';
        num.style.cssText = `
            position: absolute;
            left: ${pctX}%;
            top: ${pctY}%;
            transform: translateX(-50%);
            font-family: 'Press Start 2P', monospace;
            font-size: ${fontSize || 14}px;
            color: ${color || '#ff4444'};
            pointer-events: none;
            z-index: 50;
            text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 0 0 8px ${color || '#ff4444'};
            animation: animDmgFloat 1.2s ease-out forwards;
            white-space: nowrap;
        `;
        num.textContent = text;
        wrap.appendChild(num);
        setTimeout(() => { if (num.parentNode) num.remove(); }, 1300);
    },

    // ===== SCREEN SHAKE =====
    shakeScreen(intensity, duration) {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;
        wrap.style.animation = `animScreenShake ${duration || 0.3}s ease-in-out`;
        setTimeout(() => { wrap.style.animation = ''; }, (duration || 0.3) * 1000 + 50);
    },

    // ===== PHASE BANNER =====
    showPhaseBanner(phaseName, isPlayerTurn) {
        const wrap = document.querySelector('.battle-canvas-wrap');
        if (!wrap) return;

        // Remove existing banner
        const old = wrap.querySelector('.phase-banner');
        if (old) old.remove();

        const banner = document.createElement('div');
        banner.className = 'phase-banner';
        banner.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scaleX(0);
            background: linear-gradient(90deg, transparent, rgba(0,0,0,0.85) 10%, rgba(0,0,0,0.85) 90%, transparent);
            padding: 12px 40px;
            z-index: 55;
            pointer-events: none;
            animation: animPhaseBanner 1.5s ease-in-out forwards;
            white-space: nowrap;
        `;

        const textColor = isPlayerTurn ? '#44ff88' : '#ff6644';
        banner.innerHTML = `
            <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:${textColor};text-align:center;text-shadow:0 0 10px ${textColor},2px 2px 0 #000;">
                ${phaseName}
            </div>
        `;
        wrap.appendChild(banner);
        setTimeout(() => { if (banner.parentNode) banner.remove(); }, 1600);
    },

    // ===== CARD MOVE ANIMATION (Canvas-based) =====
    // Tracks a card position lerping from start to end
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

    // ===== SUMMON EFFECT =====
    spawnSummonEffect(x, y) {
        const canvas = document.getElementById('battle-canvas');
        if (!canvas) return;
        this._summonEffects.push({
            x, y,
            startTime: performance.now(),
            duration: 400,
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

    // ===== LP ANIMATION =====
    animateLP(side, fromLP, toLP, maxLP) {
        this._lpAnim[side] = {
            fromLP, toLP, maxLP,
            currentLP: fromLP,
            startTime: performance.now(),
            duration: 500,
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
            // Ease out bounce
            const ease = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
            m.currentX = m.fromX + (m.toX - m.fromX) * ease;
            m.currentY = m.fromY + (m.toY - m.fromY) * ease;
            m.progress = t;
            if (t >= 1 && !m.done) {
                m.done = true;
                if (m.onComplete) m.onComplete();
            }
        }
        // Clean up finished moves
        this._cardMoves = this._cardMoves.filter(m => !m.done);

        // Clean up summon effects
        this._summonEffects = this._summonEffects.filter(e => now - e.startTime < e.duration);

        // Clean up attack flashes
        this._attackFlashes = this._attackFlashes.filter(e => now - e.startTime < e.duration);
    },

    // ===== RENDER OVERLAY EFFECTS ON CANVAS =====
    renderOverlay(ctx, W, H) {
        const now = performance.now();

        // Summon effects (golden circle expanding)
        for (const eff of this._summonEffects) {
            const t = (now - eff.startTime) / eff.duration;
            const alpha = 1 - t;
            const radius = 20 + t * 40;
            ctx.save();
            ctx.globalAlpha = alpha * 0.6;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(eff.x, eff.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            // Inner glow
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillStyle = '#ffd700';
            ctx.fill();
            ctx.restore();
        }

        // Attack flash effects (red expanding circle)
        for (const eff of this._attackFlashes) {
            const t = (now - eff.startTime) / eff.duration;
            const alpha = 1 - t;
            const radius = 10 + t * 30;
            ctx.save();
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(eff.x, eff.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    },

    // ===== HAND CARD ANIMATIONS (CSS) =====
    animateCardDraw(container) {
        if (!container) return;
        const cards = container.querySelectorAll('.battle-card');
        if (cards.length === 0) return;
        const last = cards[cards.length - 1];
        last.style.animation = 'none';
        void last.offsetWidth; // reflow
        last.style.animation = 'animCardDrawIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    },

    animateCardPlay(el, callback) {
        if (!el) { if (callback) callback(); return; }
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = 'animCardPlayOut 0.35s ease-in forwards';
        setTimeout(() => { if (callback) callback(); }, 350);
    },

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
        /* Damage number float */
        @keyframes animDmgFloat {
            0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(0.5); }
            15% { opacity: 1; transform: translateX(-50%) translateY(-8px) scale(1.3); }
            30% { transform: translateX(-50%) translateY(-16px) scale(1); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-50px) scale(0.7); }
        }

        /* Screen shake */
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

        /* Phase banner slide in */
        @keyframes animPhaseBanner {
            0% { transform: translate(-50%, -50%) scaleX(0); opacity: 0; }
            15% { transform: translate(-50%, -50%) scaleX(1.1); opacity: 1; }
            25% { transform: translate(-50%, -50%) scaleX(1); opacity: 1; }
            70% { transform: translate(-50%, -50%) scaleX(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scaleX(0.3); opacity: 0; }
        }

        /* Card draw animation */
        @keyframes animCardDrawIn {
            0% { transform: translateX(80px) translateY(-20px) scale(0.3) rotate(10deg); opacity: 0; }
            60% { transform: translateX(-5px) translateY(2px) scale(1.05) rotate(-1deg); opacity: 1; }
            100% { transform: translateX(0) translateY(0) scale(1) rotate(0deg); opacity: 1; }
        }

        /* Card play out animation */
        @keyframes animCardPlayOut {
            0% { transform: translateY(0) scale(1); opacity: 1; }
            30% { transform: translateY(-15px) scale(1.1); opacity: 1; }
            100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
        }

        /* Card shake (can't play) */
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
            0% { text-shadow: 0 0 20px #ff4444; }
            100% { text-shadow: none; }
        }

        /* Skill activation glow */
        @keyframes animSkillActivate {
            0% { box-shadow: 0 0 10px rgba(170,68,255,0.5); filter: brightness(1.5); }
            50% { box-shadow: 0 0 30px rgba(170,68,255,0.8); filter: brightness(2); }
            100% { box-shadow: none; filter: brightness(1); }
        }

        .battle-card.card-playable-anim {
            animation: animCardGlow 1.2s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);
})();
