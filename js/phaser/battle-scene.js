/* ========================================
 * Phaser Battle Scene — WebGL battle field renderer
 * Hero-as-Entity Edition (v5)
 * Each side has one hero entity with HP bar
 * Skills activate in the center battlefield
 * ======================================== */

const PhaserBattleScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function PhaserBattleScene() {
        Phaser.Scene.call(this, { key: 'PhaserBattleScene' });

        // Layout constants
        this.W = 800;
        this.H = 500;

        // Game object refs
        this.bgGraphics = null;
        this.gridGraphics = null;

        // Hero panels (one per side)
        this.heroPanel = { player: null, enemy: null };
        this.heroHPBar = { player: null, enemy: null };
        this.heroHPText = { player: null, enemy: null };
        this.heroNameText = { player: null, enemy: null };
        this.heroSprite = { player: null, enemy: null };
        this.heroStatText = { player: null, enemy: null };
        this.heroClassText = { player: null, enemy: null };
        this.heroLevelText = { player: null, enemy: null };

        // Center divider
        this.phaseText = null;
        this.turnText = null;
        this.vsText = null;

        // Skill activation area
        this.skillSlots = [];

        // Effects
        this.damageNumbers = [];
        this.phaseBanner = null;
        this.attackAnims = [];
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeDecay = 0;

        // Reference to combatant data
        this.playerData = null;
        this.enemyData = null;
    },

    preload: function () {
        // Arena image is pre-loaded externally via bridge.preloadArena()
        // It gets added to texture manager before create() runs
    },

    create: function () {
        var W = this.W;
        var H = this.H;

        // === BACKGROUND ARENA IMAGE ===
        if (this.textures.exists('arena-bg')) {
            var bg = this.add.image(W / 2, H / 2, 'arena-bg');
            bg.setDisplaySize(W, H);
            bg.setDepth(-10);
        } else {
            // Fallback: programmatic background
            this.bgGraphics = this.add.graphics();
            this._drawBackground();
        }

        // === GRID OVERLAY (subtle, over the image) ===
        this.gridGraphics = this.add.graphics();
        this._drawGrid();

        // === HERO PANELS ===
        this._createHeroPanel('player', false); // bottom
        this._createHeroPanel('enemy', true);    // top

        // === CENTER DIVIDER ===
        this._createCenterDivider();

        // === SKILL SLOTS (battlefield area) ===
        this._createSkillSlots();
    },

    // ===== BACKGROUND =====
    _drawBackground: function () {
        var g = this.bgGraphics;
        var W = this.W;
        var H = this.H;
        g.clear();

        // Dark gradient: enemy side (top, blue) → player side (bottom, warm)
        var steps = 20;
        for (var i = 0; i < steps; i++) {
            var t = i / steps;
            var y = Math.floor(t * H);
            var h = Math.ceil(H / steps) + 1;

            var r = Math.floor(13 + t * (26 - 13));
            var gv = Math.floor(13 + t * (13 - 13));
            var b = Math.floor(43 + t * (13 - 43));
            if (t < 0.5) {
                b = Math.floor(43 + (t * 2) * (48 - 43));
            } else {
                r = Math.floor(16 + ((t - 0.5) * 2) * (26 - 16));
                b = Math.floor(48 - ((t - 0.5) * 2) * (48 - 13));
            }
            var color = (r << 16) | (gv << 8) | b;
            g.fillStyle(color, 1);
            g.fillRect(0, y, W, h);
        }
    },

    _drawGrid: function () {
        var g = this.gridGraphics;
        var W = this.W;
        var H = this.H;
        g.clear();

        g.lineStyle(1, 0x4488ff, 0.04);
        for (var gx = 0; gx < W; gx += 30) {
            g.beginPath();
            g.moveTo(gx, 0);
            g.lineTo(gx, H);
            g.strokePath();
        }
        for (var gy = 0; gy < H; gy += 30) {
            g.beginPath();
            g.moveTo(0, gy);
            g.lineTo(W, gy);
            g.strokePath();
        }
    },

    // ===== HERO PANEL (Hero-as-Entity) =====
    _createHeroPanel: function (side, isTop) {
        var W = this.W;
        var H = this.H;
        var panelW = 200;
        var panelH = 160;
        var panelX = side === 'player' ? 30 : W - panelW - 30;
        var panelY = isTop ? 20 : H - panelH - 20;

        var container = this.add.container(panelX, panelY);

        // Panel background
        var bg = this.add.graphics();
        bg.fillStyle(0x0a0a1e, 0.9);
        bg.fillRect(0, 0, panelW, panelH);
        bg.lineStyle(2, side === 'player' ? 0xffd700 : 0x4488ff, 0.8);
        bg.strokeRect(0, 0, panelW, panelH);
        container.add(bg);

        // Class color strip at top
        var strip = this.add.graphics();
        strip.fillStyle(side === 'player' ? 0xffd700 : 0x4488ff, 0.6);
        strip.fillRect(0, 0, panelW, 3);
        container.add(strip);

        // Hero art area (placeholder)
        var artBg = this.add.graphics();
        artBg.fillStyle(0x0f3460, 1);
        artBg.fillRect(8, 10, panelW - 16, 60);
        artBg.lineStyle(1, 0xc8a832, 0.5);
        artBg.strokeRect(8, 10, panelW - 16, 60);
        container.add(artBg);

        var spriteText = this.add.text(panelW / 2, 40, '⚔', {
            fontSize: '28px',
            color: side === 'player' ? 'rgba(255,215,0,0.3)' : 'rgba(68,136,255,0.3)'
        });
        spriteText.setOrigin(0.5, 0.5);
        container.add(spriteText);
        this.heroSprite[side] = spriteText;

        // Name text
        var nameText = this.add.text(8, 74, 'Hero', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        container.add(nameText);
        this.heroNameText[side] = nameText;

        // Class + Level
        var classText = this.add.text(8, 86, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#aaaaaa'
        });
        container.add(classText);
        this.heroClassText[side] = classText;

        var levelText = this.add.text(panelW - 8, 74, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#ffd700'
        });
        levelText.setOrigin(1, 0);
        container.add(levelText);
        this.heroLevelText[side] = levelText;

        // HP bar background
        var hpBarX = 8;
        var hpBarY = 96;
        var hpBarW = panelW - 16;
        var hpBarH = 14;

        var hpBg = this.add.graphics();
        hpBg.fillStyle(0x000000, 0.8);
        hpBg.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
        hpBg.lineStyle(1, 0xffffff, 0.15);
        hpBg.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
        container.add(hpBg);

        // HP bar fill
        var hpFill = this.add.graphics();
        container.add(hpFill);
        this.heroHPBar[side] = {
            fill: hpFill,
            x: hpBarX,
            y: hpBarY,
            w: hpBarW,
            h: hpBarH
        };

        // HP text
        var hpText = this.add.text(hpBarX + hpBarW / 2, hpBarY + hpBarH / 2, 'HP 0 / 0', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        hpText.setOrigin(0.5, 0.5);
        container.add(hpText);
        this.heroHPText[side] = hpText;

        // ATK / DEF stats
        var statY = hpBarY + hpBarH + 4;
        var halfW = (hpBarW - 4) / 2;

        var atkBg = this.add.graphics();
        atkBg.fillStyle(0xe94560, 0.5);
        atkBg.fillRect(hpBarX, statY, halfW, 12);
        container.add(atkBg);

        var atkText = this.add.text(hpBarX + 4, statY + 2, '⚔ 0', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        container.add(atkText);

        var defBg = this.add.graphics();
        defBg.fillStyle(0x4488ff, 0.5);
        defBg.fillRect(hpBarX + halfW + 4, statY, halfW, 12);
        container.add(defBg);

        var defText = this.add.text(hpBarX + halfW + 8, statY + 2, '🛡 0', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        container.add(defText);

        this.heroStatText[side] = { atk: atkText, def: defText };

        this.heroPanel[side] = {
            container: container,
            x: panelX,
            y: panelY,
            w: panelW,
            h: panelH
        };
    },

    _updateHeroPanel: function (side, battleHero) {
        var panel = this.heroPanel[side];
        if (!panel) return;

        if (!battleHero) {
            // Show empty state
            if (this.heroNameText[side]) this.heroNameText[side].setText('No Hero');
            if (this.heroHPText[side]) this.heroHPText[side].setText('HP 0 / 0');
            if (this.heroClassText[side]) this.heroClassText[side].setText('');
            if (this.heroLevelText[side]) this.heroLevelText[side].setText('');
            if (this.heroSprite[side]) this.heroSprite[side].setText('?');
            if (this.heroStatText[side]) {
                this.heroStatText[side].atk.setText('⚔ 0');
                this.heroStatText[side].def.setText('🛡 0');
            }
            this._drawHPBar(side, 0);
            return;
        }

        // Update name
        if (this.heroNameText[side]) {
            this.heroNameText[side].setText(battleHero.name || 'Hero');
        }

        // Update class
        var cls = (typeof CLASSES !== 'undefined') ? CLASSES[battleHero.class] : null;
        if (this.heroClassText[side]) {
            this.heroClassText[side].setText(cls ? cls.name : (battleHero.class || 'Hero'));
            this.heroClassText[side].setColor(cls ? cls.color : '#aaaaaa');
        }

        // Update level
        if (this.heroLevelText[side]) {
            var lvl = battleHero.level || 1;
            this.heroLevelText[side].setText(lvl > 1 ? 'Lv.' + lvl : '');
        }

        // Update sprite emoji
        if (this.heroSprite[side]) {
            var emoji = cls ? cls.emoji : '⚔';
            this.heroSprite[side].setText(emoji);
        }

        // Update HP
        var hp = battleHero.heroHP || 0;
        var maxHP = battleHero.heroMaxHP || 1;
        var pct = Math.max(0, Math.min(1, hp / maxHP));

        if (this.heroHPText[side]) {
            this.heroHPText[side].setText('HP ' + hp + ' / ' + maxHP);
        }

        this._drawHPBar(side, pct);

        // Update stats
        var totalAtk = (battleHero.heroATK || 0) + (battleHero.atkBuff || 0);
        var totalDef = (battleHero.heroDEF || 0) + (battleHero.defBuff || 0);
        if (this.heroStatText[side]) {
            this.heroStatText[side].atk.setText('⚔ ' + totalAtk);
            this.heroStatText[side].def.setText('🛡 ' + totalDef);
        }
    },

    _drawHPBar: function (side, pct) {
        var bar = this.heroHPBar[side];
        if (!bar) return;

        bar.fill.clear();
        if (pct > 0) {
            var color;
            if (pct > 0.55) {
                color = 0x22cc66;
            } else if (pct > 0.25) {
                color = 0xccaa22;
            } else {
                color = 0xcc2222;
            }
            bar.fill.fillStyle(color, 1);
            bar.fill.fillRect(bar.x + 1, bar.y + 1, (bar.w - 2) * pct, bar.h - 2);

            // Shine
            bar.fill.fillStyle(0xffffff, 0.08);
            bar.fill.fillRect(bar.x + 1, bar.y + 1, (bar.w - 2) * pct, (bar.h - 2) / 2);
        }
    },

    // ===== CENTER DIVIDER =====
    _createCenterDivider: function () {
        var W = this.W;
        var H = this.H;
        var centerH = 40;
        var y = (H - centerH) / 2;

        var container = this.add.container(0, y);

        var bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.95);
        bg.fillRect(0, 0, W, centerH);
        bg.fillStyle(0x0f0f23, 0.95);
        bg.fillRect(0, Math.floor(centerH * 0.3), W, Math.floor(centerH * 0.4));
        container.add(bg);

        var accents = this.add.graphics();
        accents.fillStyle(0xffd700, 0.5);
        accents.fillRect(0, 0, W, 1);
        accents.fillRect(0, centerH - 1, W, 1);
        container.add(accents);

        this.vsText = this.add.text(W / 2, centerH / 2 + 1, 'VS', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '20px',
            color: '#ffd700',
            fontStyle: 'bold'
        });
        this.vsText.setOrigin(0.5, 0.5);
        this.vsText.setShadow(0, 0, '#ffd700', 12);
        container.add(this.vsText);

        this.turnText = this.add.text(W / 2 - 50, centerH / 2 + 1, 'Turn 0', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: 'rgba(255,255,255,0.6)'
        });
        this.turnText.setOrigin(1, 0.5);
        container.add(this.turnText);

        this.phaseText = this.add.text(W / 2 + 50, centerH / 2 + 1, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: 'rgba(68,204,136,0.8)'
        });
        this.phaseText.setOrigin(0, 0.5);
        container.add(this.phaseText);

        // Decorative lines
        var lines = this.add.graphics();
        lines.lineStyle(1, 0xffd700, 0.2);
        lines.beginPath();
        lines.moveTo(20, centerH / 2 + 1);
        lines.lineTo(W / 2 - 75, centerH / 2 + 1);
        lines.strokePath();
        lines.beginPath();
        lines.moveTo(W / 2 + 75, centerH / 2 + 1);
        lines.lineTo(W - 20, centerH / 2);
        lines.strokePath();
        container.add(lines);
    },

    updateCenterDivider: function (state) {
        if (this.turnText) this.turnText.setText('Turn ' + state.turn);
        if (this.phaseText) {
            var phaseNames = { draw: 'DRAW', main: 'MAIN', battle: 'BATTLE', end: 'END' };
            this.phaseText.setText(phaseNames[state.phase] || '');
        }
    },

    // ===== SKILL SLOTS (battlefield center area) =====
    _createSkillSlots: function () {
        // 3 slots on each side of center divider for showing played skills
        var W = this.W;
        var H = this.H;
        var slotW = 70;
        var slotH = 50;
        var slotGap = 15;
        var totalW = slotW * 3 + slotGap * 2;
        var startX = (W - totalW) / 2;
        var centerY = H / 2;

        // Player skill slots (just below center)
        for (var i = 0; i < 3; i++) {
            var sx = startX + i * (slotW + slotGap);
            var sy = centerY + 25;
            this._drawSkillSlot(sx, sy, slotW, slotH, 'player', i);
        }

        // Enemy skill slots (just above center)
        for (var i = 0; i < 3; i++) {
            var sx = startX + i * (slotW + slotGap);
            var sy = centerY - 25 - slotH;
            this._drawSkillSlot(sx, sy, slotW, slotH, 'enemy', i);
        }
    },

    _drawSkillSlot: function (x, y, w, h, side, index) {
        var container = this.add.container(x, y);

        var bg = this.add.graphics();
        bg.fillStyle(0x141432, 0.3);
        bg.fillRect(0, 0, w, h);
        bg.lineStyle(1, side === 'player' ? 0xffd700 : 0x4488ff, 0.12);
        bg.strokeRect(0, 0, w, h);
        container.add(bg);

        var icon = this.add.text(w / 2, h / 2, '✨', {
            fontSize: '18px',
            color: 'rgba(155,89,182,0.15)'
        });
        icon.setOrigin(0.5, 0.5);
        container.add(icon);

        this.skillSlots.push({
            container: container,
            x: x,
            y: y,
            w: w,
            h: h,
            side: side,
            index: index
        });
    },

    // ===== RENDER FIELD STATE =====
    renderField: function (player, enemy) {
        this.playerData = player;
        this.enemyData = enemy;

        var state = {
            player: player,
            enemy: enemy,
            turn: BattleEngine.turnNumber,
            phase: BattleEngine.currentPhase
        };

        // Update hero panels
        this._updateHeroPanel('player', player.battleHero);
        this._updateHeroPanel('enemy', enemy.battleHero);

        // Update center divider
        this.updateCenterDivider(state);
    },

    // ===== PHASE BANNER =====
    showPhaseBanner: function (text, isPlayer) {
        if (this.phaseBanner) {
            this.phaseBanner.destroy();
            this.phaseBanner = null;
        }

        var color = isPlayer ? '#ffd700' : '#88ccff';
        var banner = this.add.text(this.W / 2, this.H / 2, text.toUpperCase(), {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '20px',
            color: color,
            fontStyle: 'bold'
        });
        banner.setOrigin(0.5, 0.5);
        banner.setAlpha(0);
        banner.setScale(0.5);
        banner.setShadow(0, 0, color, 20);

        var backdrop = this.add.graphics();
        backdrop.fillStyle(0x000000, 0);
        backdrop.fillRect(0, this.H / 2 - 20, this.W, 40);

        this.phaseBanner = banner;
        this.phaseBanner._backdrop = backdrop;

        var scene = this;

        this.tweens.add({
            targets: banner,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: function () {
                scene.time.delayedCall(600, function () {
                    scene.tweens.add({
                        targets: banner,
                        alpha: 0,
                        scaleX: 1.2,
                        scaleY: 1.2,
                        duration: 400,
                        onComplete: function () {
                            if (backdrop) backdrop.destroy();
                            banner.destroy();
                            if (scene.phaseBanner === banner) scene.phaseBanner = null;
                        }
                    });
                });
            }
        });

        this.tweens.add({
            targets: backdrop,
            alpha: 0.5,
            duration: 300,
            yoyo: true,
            hold: 600
        });
    },

    // ===== DAMAGE NUMBERS =====
    spawnDamageNumber: function (x, y, amount, isCrit) {
        var color = isCrit ? '#ff4444' : '#ffffff';
        var fontSize = isCrit ? '16px' : '12px';

        var dmgText = this.add.text(x, y, String(amount), {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: fontSize,
            color: color,
            fontStyle: 'bold',
            stroke: isCrit ? '#cc0000' : '#000000',
            strokeThickness: 3
        });
        dmgText.setOrigin(0.5, 0.5);
        if (isCrit) dmgText.setScale(1.3);

        this.tweens.add({
            targets: dmgText,
            y: y - 60,
            alpha: 0,
            scaleX: isCrit ? 1.6 : 1.2,
            scaleY: isCrit ? 1.6 : 1.2,
            duration: 1500,
            ease: 'Power2',
            onComplete: function () { dmgText.destroy(); }
        });
    },

    spawnHealNumber: function (x, y, amount) {
        var dmgText = this.add.text(x, y, '+' + amount, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#44ff88',
            fontStyle: 'bold',
            stroke: '#006622',
            strokeThickness: 3
        });
        dmgText.setOrigin(0.5, 0.5);

        this.tweens.add({
            targets: dmgText,
            y: y - 50,
            alpha: 0,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 1200,
            ease: 'Power2',
            onComplete: function () { dmgText.destroy(); }
        });
    },

    // ===== ATTACK ANIMATION (Hero → Hero) =====
    playAttack: function (attackIdx, targetIdx, isPlayerAttacking, damage, isCrit) {
        var scene = this;

        // Get hero panel positions
        var srcPanel = isPlayerAttacking ? this.heroPanel.player : this.heroPanel.enemy;
        var tgtPanel = isPlayerAttacking ? this.heroPanel.enemy : this.heroPanel.player;

        if (!srcPanel || !tgtPanel) return;

        var srcX = srcPanel.x + srcPanel.w / 2;
        var srcY = srcPanel.y + srcPanel.h / 2;
        var tgtX = tgtPanel.x + tgtPanel.w / 2;
        var tgtY = tgtPanel.y + tgtPanel.h / 2;

        // Attack flash projectile
        var flash = this.add.graphics();
        flash.fillStyle(isCrit ? 0xff4444 : 0xffffff, 1);
        flash.fillCircle(0, 0, isCrit ? 10 : 7);
        flash.setPosition(srcX, srcY);
        flash.setDepth(50);

        var trail = this.add.graphics();
        trail.setDepth(49);

        this.tweens.add({
            targets: flash,
            x: tgtX,
            y: tgtY,
            duration: 280,
            ease: 'Power2',
            onUpdate: function (tween) {
                var progress = tween.progress;
                var cx = srcX + (tgtX - srcX) * progress;
                var cy = srcY + (tgtY - srcY) * progress;
                trail.clear();
                trail.lineStyle(isCrit ? 4 : 2, isCrit ? 0xff4444 : 0xffffff, 0.7);
                trail.beginPath();
                trail.moveTo(srcX, srcY);
                trail.lineTo(cx, cy);
                trail.strokePath();
            },
            onComplete: function () {
                // Impact effects
                scene.spawnDamageNumber(tgtX + (Math.random() - 0.5) * 30, tgtY - 20, damage, isCrit);
                scene.triggerShake(isCrit ? 12 : 5, isCrit ? 0.8 : 0.4);

                // Flash on target
                var impactFlash = scene.add.graphics();
                impactFlash.setDepth(48);
                impactFlash.fillStyle(isCrit ? 0xff3232 : 0xffffff, isCrit ? 0.5 : 0.35);
                impactFlash.fillRect(tgtPanel.x, tgtPanel.y, tgtPanel.w, tgtPanel.h);

                scene.tweens.add({
                    targets: impactFlash,
                    alpha: 0,
                    duration: 400,
                    onComplete: function () { impactFlash.destroy(); }
                });

                // Slash X mark
                var slash = scene.add.graphics();
                slash.setDepth(51);
                var slashColor = isCrit ? 0xff2222 : 0xffffff;
                var slashSize = isCrit ? 22 : 16;
                slash.lineStyle(isCrit ? 4 : 3, slashColor, 0.9);
                slash.beginPath();
                slash.moveTo(tgtX - slashSize, tgtY - slashSize);
                slash.lineTo(tgtX + slashSize, tgtY + slashSize);
                slash.strokePath();
                slash.beginPath();
                slash.moveTo(tgtX + slashSize, tgtY - slashSize);
                slash.lineTo(tgtX - slashSize, tgtY + slashSize);
                slash.strokePath();

                scene.tweens.add({
                    targets: slash,
                    alpha: 0,
                    scaleX: 1.5,
                    scaleY: 1.5,
                    duration: 400,
                    ease: 'Power2',
                    onComplete: function () { slash.destroy(); }
                });

                // Particle burst
                var particleCount = isCrit ? 14 : 8;
                var particleColor = isCrit ? 0xff4444 : 0xffd700;
                for (var p = 0; p < particleCount; p++) {
                    (function (index) {
                        var angle = (index / particleCount) * Math.PI * 2;
                        var speed = 40 + Math.random() * 50;
                        var particle = scene.add.graphics();
                        var pSize = isCrit ? 3 + Math.random() * 3 : 2 + Math.random() * 2;
                        particle.fillStyle(particleColor, 0.9);
                        particle.fillCircle(0, 0, pSize);
                        particle.setPosition(tgtX, tgtY);
                        particle.setDepth(52);

                        scene.tweens.add({
                            targets: particle,
                            x: tgtX + Math.cos(angle) * speed,
                            y: tgtY + Math.sin(angle) * speed,
                            alpha: 0,
                            scaleX: 0.2,
                            scaleY: 0.2,
                            duration: 350 + Math.random() * 200,
                            ease: 'Power2',
                            onComplete: function () { particle.destroy(); }
                        });
                    })(p);
                }

                // Brief full-screen flash
                var fullFlash = scene.add.graphics();
                fullFlash.setDepth(47);
                fullFlash.fillStyle(isCrit ? 0xff2222 : 0xffffff, isCrit ? 0.08 : 0.05);
                fullFlash.fillRect(0, 0, scene.W, scene.H);
                scene.tweens.add({
                    targets: fullFlash,
                    alpha: 0,
                    duration: 200,
                    onComplete: function () { fullFlash.destroy(); }
                });

                flash.destroy();
                trail.destroy();
            }
        });
    },

    // ===== SCREEN SHAKE =====
    triggerShake: function (intensity, duration) {
        this.cameras.main.shake(duration * 1000, intensity / 1000);
    },

    // ===== GET HERO POSITION (for damage numbers) =====
    getHeroZonePosition: function (zoneIndex, isPlayer) {
        var panel = isPlayer ? this.heroPanel.player : this.heroPanel.enemy;
        if (!panel) return { x: this.W / 2, y: this.H / 2 };
        return {
            x: panel.x + panel.w / 2,
            y: panel.y + panel.h / 2
        };
    },

    // ===== TRANSITION =====
    showTransition: function (type, onComplete) {
        if (type === 'enter') {
            this._showCountdownSequence(onComplete);
        } else {
            var overlay = this.add.graphics();
            overlay.fillStyle(0x000000, 1);
            overlay.fillRect(0, 0, this.W, this.H);
            overlay.setDepth(100);
            overlay.setAlpha(0);
            this.tweens.add({
                targets: overlay,
                alpha: 1,
                duration: 800,
                onComplete: function () {
                    overlay.destroy();
                    if (onComplete) onComplete();
                }
            });
        }
    },

    // ===== COUNTDOWN 3-2-1 SEQUENCE =====
    _showCountdownSequence: function (onComplete) {
        var W = this.W;
        var H = this.H;
        var scene = this;

        var overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 1);
        overlay.fillRect(0, 0, W, H);
        overlay.setDepth(100);

        this.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: 600,
            onComplete: function () { overlay.destroy(); }
        });

        var numbers = ['3', '2', '1'];
        var colors = ['#ff4444', '#ffaa00', '#44ff88'];
        var glows = ['#ff0000', '#ff8800', '#00ff44'];
        var delay = 700;

        for (var i = 0; i < numbers.length; i++) {
            (function (index) {
                scene.time.delayedCall(600 + index * delay, function () {
                    scene._showCountdownNumber(numbers[index], colors[index], glows[index]);
                });
            })(i);
        }

        scene.time.delayedCall(600 + numbers.length * delay + 200, function () {
            scene._showFightText();
        });

        var totalTime = 600 + numbers.length * delay + 200 + 1200;
        scene.time.delayedCall(totalTime, function () {
            if (onComplete) onComplete();
        });
    },

    _showCountdownNumber: function (num, color, glowColor) {
        var W = this.W;
        var H = this.H;
        var scene = this;

        var text = this.add.text(W / 2, H / 2, num, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '72px',
            color: color,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        });
        text.setOrigin(0.5, 0.5);
        text.setDepth(102);
        text.setScale(0.3);
        text.setAlpha(0);
        text.setShadow(0, 0, glowColor, 20, true, true, 8);

        var ring = this.add.graphics();
        ring.lineStyle(3, Phaser.Display.Color.HexStringToColor(glowColor).color, 0.6);
        ring.strokeCircle(0, 0, 50);
        ring.setPosition(W / 2, H / 2);
        ring.setDepth(101);
        ring.setAlpha(0);
        ring.setScale(0.5);

        var backdrop = this.add.graphics();
        backdrop.fillStyle(Phaser.Display.Color.HexStringToColor(glowColor).color, 0.05);
        backdrop.fillRect(0, 0, W, H);
        backdrop.setDepth(100);
        backdrop.setAlpha(0);

        this.tweens.add({
            targets: text,
            scaleX: 1.1,
            scaleY: 1.1,
            alpha: 1,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: function () {
                scene.tweens.add({
                    targets: text,
                    scaleX: 1.8,
                    scaleY: 1.8,
                    alpha: 0,
                    duration: 400,
                    delay: 200,
                    ease: 'Power2',
                    onComplete: function () { text.destroy(); }
                });
            }
        });

        this.tweens.add({
            targets: ring,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0.8,
            duration: 200,
            ease: 'Power2',
            onComplete: function () {
                scene.tweens.add({
                    targets: ring,
                    scaleX: 3,
                    scaleY: 3,
                    alpha: 0,
                    duration: 500,
                    onComplete: function () { ring.destroy(); }
                });
            }
        });

        this.tweens.add({
            targets: backdrop,
            alpha: 0.3,
            duration: 150,
            yoyo: true,
            onComplete: function () { backdrop.destroy(); }
        });
    },

    _showFightText: function () {
        var W = this.W;
        var H = this.H;
        var scene = this;

        var text = this.add.text(W / 2, H / 2, 'FIGHT!', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '48px',
            color: '#ffd700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        });
        text.setOrigin(0.5, 0.5);
        text.setDepth(102);
        text.setScale(0.2);
        text.setAlpha(0);
        text.setShadow(0, 0, '#ffd700', 30, true, true, 10);

        var screenFlash = this.add.graphics();
        screenFlash.fillStyle(0xffd700, 0.15);
        screenFlash.fillRect(0, 0, W, H);
        screenFlash.setDepth(100);
        screenFlash.setAlpha(0);

        this.cameras.main.shake(600, 0.008);

        this.tweens.add({
            targets: text,
            scaleX: 1.15,
            scaleY: 1.15,
            alpha: 1,
            duration: 250,
            ease: 'Back.easeOut',
            onComplete: function () {
                scene.tweens.add({
                    targets: text,
                    scaleX: 2.5,
                    scaleY: 2.5,
                    alpha: 0,
                    duration: 800,
                    delay: 400,
                    ease: 'Power3',
                    onComplete: function () { text.destroy(); }
                });
            }
        });

        this.tweens.add({
            targets: screenFlash,
            alpha: 0.4,
            duration: 150,
            yoyo: true,
            onComplete: function () { screenFlash.destroy(); }
        });
    },

    // ===== UPDATE LOOP =====
    update: function (time, delta) {
        // Phaser handles the render loop
    }
});
