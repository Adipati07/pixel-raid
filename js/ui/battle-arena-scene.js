/**
 * BattleArenaScene — Tactical Auto Battler renderer (Phase 1)
 * 
 * Layout:
 *   Top bar: Enemy hero HP + name
 *   Enemy board: 5 slots in a row
 *   Divider: Turn info + VS
 *   Player board: 5 slots in a row  
 *   Player hero HP + Energy bar
 *   Hand cards: horizontal row at bottom
 *   End Turn button
 * 
 * Interactions:
 *   - Tap hand card → select
 *   - Tap empty board slot → play selected card
 *   - Tap End Turn → trigger auto battle
 * 
 * Depends on: BattleEngine
 */

const BattleArenaScene = {
    canvas: null,
    ctx: null,
    W: 600,
    H: 400,
    active: false,

    // Interaction state
    _selectedHandIdx: -1,
    _hoveredSlot: -1,
    _hoveredHandIdx: -1,

    // Animation state
    _damageNumbers: [],
    _attackAnims: [],
    _shakeX: 0,
    _shakeY: 0,
    _shakeDecay: 0,
    _floatingTexts: [],

    // Cached rects for hit testing
    _handRects: [],
    _playerSlotRects: [],
    _endTurnRect: null,

    // ===== INIT =====
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;image-rendering:pixelated;';
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this._resize();
        window.addEventListener('resize', () => this._resize());

        this.canvas.addEventListener('click', (e) => this._onClick(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMove(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) this._onClick(e.touches[0]);
        }, { passive: false });

        // Hook BattleEngine callbacks
        BattleEngine.onFieldUpdate = () => { /* will render on next frame */ };
        BattleEngine.onAttack = (atk) => this._onAttack(atk);
        BattleEngine.onPhaseChange = (phase) => this._onPhaseChange(phase);

        this.active = true;
        this._gameLoop();
    },

    isActive() { return this.active; },

    _resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.W = Math.floor(rect.width);
        this.H = Math.floor(rect.height);
        this.canvas.width = this.W;
        this.canvas.height = this.H;
    },

    // ===== GAME LOOP =====
    _gameLoop() {
        if (!this.active) return;
        this._update();
        this._render();
        requestAnimationFrame(() => this._gameLoop());
    },

    _update() {
        // Shake decay
        if (this._shakeDecay > 0) {
            this._shakeX = (Math.random() - 0.5) * this._shakeDecay * 8;
            this._shakeY = (Math.random() - 0.5) * this._shakeDecay * 8;
            this._shakeDecay *= 0.85;
            if (this._shakeDecay < 0.01) { this._shakeDecay = 0; this._shakeX = 0; this._shakeY = 0; }
        }

        // Damage numbers
        this._damageNumbers = this._damageNumbers.filter(d => {
            d.age += 16;
            d.y -= 1.2;
            d.alpha = 1 - (d.age / d.maxAge);
            return d.age < d.maxAge;
        });

        // Attack anims
        this._attackAnims = this._attackAnims.filter(a => {
            a.age += 16;
            a.t = a.age / a.duration;
            return a.age < a.duration;
        });

        // Floating texts
        this._floatingTexts = this._floatingTexts.filter(t => {
            t.age += 16;
            t.y -= 0.8;
            t.alpha = 1 - (t.age / t.maxAge);
            return t.age < t.maxAge;
        });
    },

    // ===== RENDER =====
    _render() {
        const ctx = this.ctx;
        const W = this.W;
        const H = this.H;

        ctx.save();
        ctx.translate(this._shakeX, this._shakeY);

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0a0a1a');
        grad.addColorStop(0.4, '#0d1020');
        grad.addColorStop(0.6, '#0d1020');
        grad.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        const state = BattleEngine.getFieldState();
        if (!state.player || !state.enemy) { ctx.restore(); return; }

        // Layout zones
        const barH = Math.floor(H * 0.06);
        const boardZoneH = Math.floor(H * 0.22);
        const dividerH = Math.floor(H * 0.06);
        const energyBarH = Math.floor(H * 0.05);
        const handZoneH = H - barH * 2 - boardZoneH * 2 - dividerH - energyBarH;

        let y = 0;

        // 1. Enemy hero bar
        this._drawHeroBar(ctx, 0, y, W, barH, state.enemy, '#cc2244');
        y += barH;

        // 2. Enemy board (5 slots)
        this._drawBoard(ctx, 0, y, W, boardZoneH, state.enemy.board, 'enemy', state.phase);
        y += boardZoneH;

        // 3. Divider
        this._drawDivider(ctx, 0, y, W, dividerH, state.turn, state.phase);
        y += dividerH;

        // 4. Player board (5 slots)
        this._drawBoard(ctx, 0, y, W, boardZoneH, state.player.board, 'player', state.phase);
        y += boardZoneH;

        // 5. Player hero bar
        this._drawHeroBar(ctx, 0, y, W, barH, state.player, '#4488ff');
        y += barH;

        // 6. Energy bar
        this._drawEnergyBar(ctx, 0, y, W, energyBarH, state.player);
        y += energyBarH;

        // 7. Hand cards
        this._drawHand(ctx, 0, y, W, handZoneH, state.player.hand, state.player.energy, state.phase);
        y += handZoneH;

        // 8. End Turn button (only in main phase)
        if (state.phase === 'main') {
            this._drawEndTurnButton(ctx);
        }

        // 9. Damage numbers
        for (const d of this._damageNumbers) {
            ctx.globalAlpha = d.alpha;
            ctx.font = `bold ${d.size}px monospace`;
            ctx.fillStyle = d.color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';
            ctx.strokeText(d.text, d.x, d.y);
            ctx.fillText(d.text, d.x, d.y);
            ctx.globalAlpha = 1;
        }

        // 10. Attack animations
        for (const a of this._attackAnims) {
            this._drawAttackAnim(ctx, a);
        }

        // 11. Floating texts
        for (const t of this._floatingTexts) {
            ctx.globalAlpha = t.alpha;
            ctx.font = `bold ${t.size}px monospace`;
            ctx.fillStyle = t.color;
            ctx.textAlign = 'center';
            ctx.fillText(t.text, t.x, t.y);
            ctx.globalAlpha = 1;
        }

        // 12. Selection highlight on hand card
        if (this._selectedHandIdx >= 0 && this._handRects[this._selectedHandIdx]) {
            const r = this._handRects[this._selectedHandIdx];
            ctx.strokeStyle = '#ffdd44';
            ctx.lineWidth = 3;
            ctx.strokeRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
        }

        // 13. Hover highlight on empty player slot
        if (this._selectedHandIdx >= 0 && this._hoveredSlot >= 0 && this._playerSlotRects[this._hoveredSlot]) {
            const r = this._playerSlotRects[this._hoveredSlot];
            ctx.strokeStyle = '#44ff88';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(r.x, r.y, r.w, r.h);
            ctx.setLineDash([]);
        }

        ctx.restore();
    },

    // ===== DRAW: Hero Bar =====
    _drawHeroBar(ctx, x, y, w, h, combatant, color) {
        ctx.fillStyle = '#111122';
        ctx.fillRect(x, y, w, h);

        // Name
        ctx.font = `bold ${Math.floor(h * 0.55)}px monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(combatant.name, x + 10, y + h * 0.65);

        // HP bar
        const barW = Math.floor(w * 0.45);
        const barX = x + w - barW - 10;
        const barY = y + Math.floor(h * 0.2);
        const barH = Math.floor(h * 0.6);
        const hpRatio = combatant.heroHp / combatant.heroMaxHp;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = hpRatio > 0.5 ? '#44dd44' : hpRatio > 0.25 ? '#dddd44' : '#dd4444';
        ctx.fillRect(barX, barY, Math.floor(barW * hpRatio), barH);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        ctx.font = `bold ${Math.floor(h * 0.5)}px monospace`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`❤ ${combatant.heroHp}/${combatant.heroMaxHp}`, barX + barW / 2, y + h * 0.68);
    },

    // ===== DRAW: Board (5 slots) =====
    _drawBoard(ctx, x, y, w, h, board, side, phase) {
        const slotCount = 5;
        const padding = Math.floor(w * 0.03);
        const gap = Math.floor(w * 0.015);
        const slotW = Math.floor((w - padding * 2 - gap * (slotCount - 1)) / slotCount);
        const slotH = Math.floor(h * 0.85);
        const slotY = y + Math.floor((h - slotH) / 2);

        const rects = [];
        for (let i = 0; i < slotCount; i++) {
            const slotX = x + padding + i * (slotW + gap);
            rects.push({ x: slotX, y: slotY, w: slotW, h: slotH });

            const unit = board[i];

            if (unit && unit.hp > 0) {
                // Draw unit card
                this._drawUnitCard(ctx, slotX, slotY, slotW, slotH, unit, side === 'player');
            } else {
                // Empty slot
                const isSelected = side === 'player' && this._selectedHandIdx >= 0 && this._hoveredSlot === i;
                ctx.fillStyle = isSelected ? 'rgba(68,255,136,0.15)' : 'rgba(255,255,255,0.03)';
                ctx.fillRect(slotX, slotY, slotW, slotH);
                ctx.strokeStyle = isSelected ? '#44ff88' : 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 1;
                ctx.strokeRect(slotX, slotY, slotW, slotH);

                // Slot number
                ctx.font = `${Math.floor(slotH * 0.15)}px monospace`;
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.textAlign = 'center';
                ctx.fillText(`SLOT ${i + 1}`, slotX + slotW / 2, slotY + slotH / 2);
            }
        }

        if (side === 'player') this._playerSlotRects = rects;
    },

    // ===== DRAW: Unit Card on Board =====
    _drawUnitCard(ctx, x, y, w, h, unit, isPlayer) {
        // Card background
        ctx.fillStyle = unit.pixelColor || '#4466aa';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;

        // Border
        ctx.strokeStyle = isPlayer ? '#4488ff' : '#cc4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Emoji (centered, large)
        const emojiSize = Math.floor(h * 0.35);
        ctx.font = `${emojiSize}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(unit.emoji || '❓', x + w / 2, y + h * 0.4);

        // Name
        const nameSize = Math.max(8, Math.floor(w * 0.12));
        ctx.font = `bold ${nameSize}px monospace`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        const name = unit.name.length > 10 ? unit.name.substring(0, 9) + '…' : unit.name;
        ctx.fillText(name, x + w / 2, y + h * 0.6);

        // Stats: ATK | HP
        const statSize = Math.max(8, Math.floor(w * 0.13));
        ctx.font = `bold ${statSize}px monospace`;

        // ATK (left)
        ctx.fillStyle = '#ff6644';
        ctx.textAlign = 'left';
        ctx.fillText(`⚔${unit.atk}`, x + 4, y + h * 0.82);

        // HP (right)
        const hpRatio = unit.hp / unit.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? '#44dd44' : hpRatio > 0.25 ? '#dddd44' : '#dd4444';
        ctx.textAlign = 'right';
        ctx.fillText(`❤${unit.hp}`, x + w - 4, y + h * 0.82);

        // HP bar at bottom
        const barH = Math.max(3, Math.floor(h * 0.05));
        const barY = y + h - barH - 2;
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 4, barY, w - 8, barH);
        ctx.fillStyle = hpRatio > 0.5 ? '#44dd44' : hpRatio > 0.25 ? '#dddd44' : '#dd4444';
        ctx.fillRect(x + 4, barY, Math.floor((w - 8) * hpRatio), barH);
    },

    // ===== DRAW: Divider =====
    _drawDivider(ctx, x, y, w, h, turn, phase) {
        ctx.fillStyle = '#151525';
        ctx.fillRect(x, y, w, h);

        ctx.font = `bold ${Math.floor(h * 0.55)}px monospace`;
        ctx.textAlign = 'center';

        // Turn info
        ctx.fillStyle = '#aaaacc';
        ctx.fillText(`TURN ${turn}`, x + w * 0.2, y + h * 0.65);

        // Phase
        const phaseColors = { draw: '#ffdd44', main: '#44ff88', battle: '#ff4444', end: '#aaaacc' };
        ctx.fillStyle = phaseColors[phase] || '#fff';
        const phaseLabel = { draw: 'DRAW', main: 'PLAY CARDS', battle: '⚔ BATTLE', end: 'RESULT' };
        ctx.fillText(phaseLabel[phase] || phase.toUpperCase(), x + w * 0.5, y + h * 0.65);

        // VS
        ctx.fillStyle = '#444';
        ctx.fillText('VS', x + w * 0.8, y + h * 0.65);
    },

    // ===== DRAW: Energy Bar =====
    _drawEnergyBar(ctx, x, y, w, h, player) {
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(x, y, w, h);

        const crystalW = Math.floor(w * 0.04);
        const gap = Math.floor(w * 0.01);
        const startX = x + 10;
        const maxShow = Math.min(player.maxEnergy, 10);

        ctx.font = `bold ${Math.floor(h * 0.6)}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#88aaff';
        ctx.fillText('⚡', startX, y + h * 0.7);

        for (let i = 0; i < maxShow; i++) {
            const cx = startX + 20 + i * (crystalW + gap);
            const cy = y + Math.floor(h * 0.15);
            const ch = Math.floor(h * 0.7);

            if (i < player.energy) {
                // Filled crystal
                ctx.fillStyle = '#4488ff';
                ctx.fillRect(cx, cy, crystalW, ch);
                ctx.strokeStyle = '#88bbff';
                ctx.lineWidth = 1;
                ctx.strokeRect(cx, cy, crystalW, ch);
            } else {
                // Empty crystal
                ctx.fillStyle = '#222244';
                ctx.fillRect(cx, cy, crystalW, ch);
                ctx.strokeStyle = '#333355';
                ctx.lineWidth = 1;
                ctx.strokeRect(cx, cy, crystalW, ch);
            }
        }

        // Energy text
        ctx.font = `bold ${Math.floor(h * 0.55)}px monospace`;
        ctx.fillStyle = '#88aaff';
        ctx.textAlign = 'right';
        ctx.fillText(`${player.energy}/${player.maxEnergy}`, x + w - 10, y + h * 0.7);
    },

    // ===== DRAW: Hand Cards =====
    _drawHand(ctx, x, y, w, h, hand, energy, phase) {
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(x, y, w, h);

        if (!hand || hand.length === 0) {
            ctx.font = `${Math.floor(h * 0.2)}px monospace`;
            ctx.fillStyle = '#444';
            ctx.textAlign = 'center';
            ctx.fillText('No cards in hand', x + w / 2, y + h / 2);
            this._handRects = [];
            return;
        }

        const padding = Math.floor(w * 0.02);
        const gap = Math.floor(w * 0.01);
        const cardW = Math.floor((w - padding * 2 - gap * (hand.length - 1)) / Math.max(hand.length, 1));
        const cardH = Math.floor(h * 0.85);
        const cardY = y + Math.floor((h - cardH) / 2);

        this._handRects = [];
        for (let i = 0; i < hand.length; i++) {
            const card = hand[i];
            const cardX = x + padding + i * (cardW + gap);
            this._handRects.push({ x: cardX, y: cardY, w: cardW, h: cardH });

            const isSelected = this._selectedHandIdx === i;
            const isHovered = this._hoveredHandIdx === i;
            const canAfford = card.cost <= energy && phase === 'main';

            // Card background
            const bgAlpha = canAfford ? (isSelected ? 0.5 : isHovered ? 0.4 : 0.25) : 0.1;
            ctx.fillStyle = card.pixelColor || '#4466aa';
            ctx.globalAlpha = bgAlpha;
            ctx.fillRect(cardX, cardY, cardW, cardH);
            ctx.globalAlpha = 1;

            // Border
            if (isSelected) {
                ctx.strokeStyle = '#ffdd44';
                ctx.lineWidth = 3;
            } else if (canAfford) {
                ctx.strokeStyle = '#4488ff';
                ctx.lineWidth = 1;
            } else {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
            }
            ctx.strokeRect(cardX, cardY, cardW, cardH);

            // Cost diamond (top-left)
            const diamondSize = Math.floor(cardW * 0.18);
            ctx.fillStyle = canAfford ? '#4488ff' : '#663333';
            this._drawDiamond(ctx, cardX + diamondSize + 4, cardY + diamondSize + 4, diamondSize);
            ctx.font = `bold ${Math.floor(diamondSize * 0.9)}px monospace`;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(card.cost, cardX + diamondSize + 4, cardY + diamondSize + 7);

            // Emoji
            const emojiSize = Math.floor(cardH * 0.3);
            ctx.font = `${emojiSize}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText(card.emoji || '❓', cardX + cardW / 2, cardY + cardH * 0.35);

            // Name
            const nameSize = Math.max(7, Math.floor(cardW * 0.12));
            ctx.font = `bold ${nameSize}px monospace`;
            ctx.fillStyle = canAfford ? '#fff' : '#666';
            ctx.textAlign = 'center';
            const name = card.name.length > 12 ? card.name.substring(0, 11) + '…' : card.name;
            ctx.fillText(name, cardX + cardW / 2, cardY + cardH * 0.55);

            // Stats
            const statSize = Math.max(8, Math.floor(cardW * 0.14));
            ctx.font = `bold ${statSize}px monospace`;
            ctx.fillStyle = '#ff6644';
            ctx.textAlign = 'left';
            ctx.fillText(`⚔${card.atk}`, cardX + 4, cardY + cardH * 0.75);
            ctx.fillStyle = '#44dd44';
            ctx.textAlign = 'right';
            ctx.fillText(`❤${card.hp}`, cardX + cardW - 4, cardY + cardH * 0.75);

            // Description (tiny)
            const descSize = Math.max(6, Math.floor(cardW * 0.09));
            ctx.font = `${descSize}px monospace`;
            ctx.fillStyle = canAfford ? '#aaa' : '#555';
            ctx.textAlign = 'center';
            ctx.fillText(card.desc || '', cardX + cardW / 2, cardY + cardH * 0.92);

            // Dim overlay if can't afford
            if (!canAfford) {
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(cardX, cardY, cardW, cardH);
            }
        }
    },

    // ===== DRAW: Diamond shape =====
    _drawDiamond(ctx, cx, cy, size) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size, cy);
        ctx.closePath();
        ctx.fill();
    },

    // ===== DRAW: End Turn Button =====
    _drawEndTurnButton(ctx) {
        const bw = Math.min(160, Math.floor(this.W * 0.25));
        const bh = 40;
        const bx = this.W - bw - 15;
        const by = this.H - bh - 60;

        // Button bg
        ctx.fillStyle = '#22aa44';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#44dd66';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('END TURN ▶', bx + bw / 2, by + 26);

        this._endTurnRect = { x: bx, y: by, w: bw, h: bh };
    },

    // ===== DRAW: Attack Animation =====
    _drawAttackAnim(ctx, a) {
        const t = a.t;
        const fromX = a.fromX, fromY = a.fromY;
        const toX = a.toX, toY = a.toY;

        // Slash line
        const x = fromX + (toX - fromX) * Math.min(t * 2, 1);
        const y = fromY + (toY - fromY) * Math.min(t * 2, 1);

        if (t < 0.5) {
            // Moving phase
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.globalAlpha = 1;
        } else {
            // Impact flash
            const flashAlpha = (1 - t) * 2;
            ctx.fillStyle = '#ff4444';
            ctx.globalAlpha = flashAlpha * 0.4;
            ctx.beginPath();
            ctx.arc(toX, toY, 30 * (1 - t), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    },

    // ===== HIT TESTING =====
    _getHitSlot(mx, my) {
        for (let i = 0; i < this._playerSlotRects.length; i++) {
            const r = this._playerSlotRects[i];
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
        }
        return -1;
    },

    _getHitHand(mx, my) {
        for (let i = 0; i < this._handRects.length; i++) {
            const r = this._handRects[i];
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
        }
        return -1;
    },

    _isHitEndTurn(mx, my) {
        if (!this._endTurnRect) return false;
        const r = this._endTurnRect;
        return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
    },

    // ===== EVENT HANDLERS =====
    _onClick(e) {
        if (!this.active || !BattleEngine.isRunning) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.W / rect.width;
        const scaleY = this.H / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        const state = BattleEngine.getFieldState();
        if (state.phase !== 'main') return;

        // Check End Turn button
        if (this._isHitEndTurn(mx, my)) {
            this._selectedHandIdx = -1;
            BattleEngine.endTurn();
            return;
        }

        // Check hand card click
        const handIdx = this._getHitHand(mx, my);
        if (handIdx >= 0) {
            if (this._selectedHandIdx === handIdx) {
                // Deselect
                this._selectedHandIdx = -1;
            } else {
                // Select
                this._selectedHandIdx = handIdx;
            }
            return;
        }

        // Check board slot click (play selected card)
        const slotIdx = this._getHitSlot(mx, my);
        if (slotIdx >= 0 && this._selectedHandIdx >= 0) {
            const success = BattleEngine.playCard(this._selectedHandIdx, slotIdx);
            if (success) {
                this._addFloatingText(`Placed!`, mx, my - 20, '#44ff88', 20);
                this._selectedHandIdx = -1;
            } else {
                this._addFloatingText(`Can't play!`, mx, my - 20, '#ff4444', 18);
            }
            return;
        }

        // Click empty area = deselect
        this._selectedHandIdx = -1;
    },

    _onMove(e) {
        if (!this.active) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.W / rect.width;
        const scaleY = this.H / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        this._hoveredHandIdx = this._getHitHand(mx, my);
        this._hoveredSlot = this._getHitSlot(mx, my);
    },

    // ===== CALLBACKS =====
    _onAttack(atk) {
        // Get positions for attack animation
        const playerRects = this._playerSlotRects;
        const slot = atk.attacker.slot;
        const side = atk.attacker.side;

        let fromX, fromY, toX, toY;

        if (side === 'player') {
            const r = playerRects[slot];
            if (r) { fromX = r.x + r.w / 2; fromY = r.y; }
            // Target is enemy board (mirror: same slot index, upper area)
            toX = fromX;
            toY = fromY - this.H * 0.25;
        } else {
            // Enemy attacks down
            const r = playerRects[slot];
            if (r) { toX = r.x + r.w / 2; toY = r.y + r.h; }
            fromX = toX;
            fromY = toY - this.H * 0.25;
        }

        if (fromX !== undefined) {
            this._attackAnims.push({
                fromX, fromY, toX, toY,
                age: 0, duration: 400, t: 0,
            });
        }

        // Damage number
        const dmgX = toX || this.W / 2;
        const dmgY = (toY || this.H / 2) - 10;
        this._addDamageNumber(`-${atk.damage}`, dmgX, dmgY, '#ff4444');

        // Screen shake
        this._shakeDecay = 1;
    },

    _onPhaseChange(phase) {
        if (phase === 'battle') {
            this._selectedHandIdx = -1;
        }
    },

    // ===== HELPERS =====
    _addDamageNumber(text, x, y, color, size = 24) {
        this._damageNumbers.push({ text, x, y, color, size, alpha: 1, age: 0, maxAge: 1200 });
    },

    _addFloatingText(text, x, y, color, size = 16) {
        this._floatingTexts.push({ text, x, y, color, size, alpha: 1, age: 0, maxAge: 1000 });
    },

    // ===== STOP =====
    stop() {
        this.active = false;
        this._selectedHandIdx = -1;
        this._hoveredSlot = -1;
        this._hoveredHandIdx = -1;
        this._handRects = [];
        this._playerSlotRects = [];
        this._endTurnRect = null;
        this._damageNumbers = [];
        this._attackAnims = [];
        this._floatingTexts = [];
        if (this.canvas && this.canvas.parentElement) {
            this.canvas.parentElement.innerHTML = '';
        }
    },
};
