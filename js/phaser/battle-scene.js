/* ========================================
 * Phaser Battle Scene — WebGL battle field renderer
 * Replaces vanilla Canvas rendering in BattleArenaScene
 * ======================================== */

const PhaserBattleScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function PhaserBattleScene() {
        Phaser.Scene.call(this, { key: 'PhaserBattleScene' });

        // Layout constants (match BattleArenaScene)
        this.W = 600;
        this.H = 400;
        this.LP_BAR_H = 18;
        this.FIELD_GAP = 6;
        this.CENTER_H = 32;
        this.ZONE_W = 80;
        this.ZONE_H = 100;
        this.ZONE_GAP = 6;
        this.SKILL_ZONE_W = 56;
        this.SKILL_ZONE_H = 80;

        // Game object refs
        this.bgGraphics = null;
        this.gridGraphics = null;
        this.lpBars = { player: null, enemy: null };
        this.lpTexts = { player: null, enemy: null };
        this.phaseText = null;
        this.turnText = null;
        this.vsText = null;
        this.heroZones = { player: [], enemy: [] };
        this.skillZones = { player: [], enemy: [] };
        this.zoneContainers = { player: [], enemy: [] };
        this.skillContainers = { player: [], enemy: [] };
        this.damageNumbers = [];
        this.phaseBanner = null;
        this.attackAnims = [];
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeDecay = 0;
        this.heroLabels = { player: [], enemy: [] };
        this.skillLabels = { player: [], enemy: [] };

        // Reference to combatant data
        this.playerData = null;
        this.enemyData = null;
    },

    create: function () {
        var W = this.W;
        var H = this.H;

        // === BACKGROUND ===
        this.bgGraphics = this.add.graphics();
        this._drawBackground();

        // === GRID OVERLAY ===
        this.gridGraphics = this.add.graphics();
        this._drawGrid();

        // === LP BARS ===
        this._createLPBar('enemy', true);
        this._createLPBar('player', false);

        // === CENTER DIVIDER ===
        this._createCenterDivider();

        // === HERO ZONES (3 per player) ===
        this._createHeroZones();
        this._createSkillZones();
    },

    // ===== BACKGROUND =====
    _drawBackground: function () {
        var g = this.bgGraphics;
        var W = this.W;
        var H = this.H;
        g.clear();

        // Dark gradient: enemy side (top, darker blue) → player side (bottom, warmer)
        var steps = 20;
        for (var i = 0; i < steps; i++) {
            var t = i / steps;
            var y = Math.floor(t * H);
            var h = Math.ceil(H / steps) + 1;

            var r = Math.floor(13 + t * (26 - 13));
            var gv = Math.floor(13 + t * (13 - 13));
            var b = Math.floor(43 + t * (13 - 43));
            // Tint enemy side blue, player side red
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

        // Subtle stone tile grid lines
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

    // ===== LP BARS =====
    _createLPBar: function (side, isTop) {
        var W = this.W;
        var H = this.H;
        var lpH = this.LP_BAR_H;
        var y = isTop ? 0 : H - lpH;

        var container = this.add.container(0, y);

        // Background
        var bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.85);
        bg.fillRect(0, 0, W, lpH);
        bg.fillStyle(0x0a0a1e, 0.9);
        bg.fillRect(0, 1, W, lpH - 1);
        container.add(bg);

        // Accent line
        var accent = this.add.graphics();
        accent.fillStyle(isTop ? 0x4488ff : 0xffd700, 0.5);
        accent.fillRect(0, 0, W, 1);
        container.add(accent);

        // Name text
        var nameText = this.add.text(26, lpH - 5, side === 'player' ? 'Player' : 'Enemy', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        container.add(nameText);

        // LP bar background
        var barX = 160;
        var barW = 240;
        var barY = 3;
        var barH = lpH - 6;

        var barBg = this.add.graphics();
        barBg.fillStyle(0x000000, 0.7);
        barBg.fillRect(barX, barY, barW, barH);
        barBg.lineStyle(1, 0xffffff, 0.15);
        barBg.strokeRect(barX, barY, barW, barH);
        container.add(barBg);

        // LP bar fill (will be updated)
        var barFill = this.add.graphics();
        container.add(barFill);

        // LP text
        var lpText = this.add.text(barX + barW / 2, barY + barH - 4, 'LP 4000 / 4000', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        lpText.setOrigin(0.5, 0.5);
        container.add(lpText);

        // Deck / GY text
        var deckText = this.add.text(W - 8, lpH - 10, 'DECK: 0', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#b4b4b4'
        });
        deckText.setOrigin(1, 0.5);
        container.add(deckText);

        var gyText = this.add.text(W - 8, lpH - 3, 'GY: 0', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#888888'
        });
        gyText.setOrigin(1, 0.5);
        container.add(gyText);

        this.lpBars[side] = { container: container, fill: barFill, barX: barX, barY: barY, barW: barW, barH: barH };
        this.lpTexts[side] = { lp: lpText, deck: deckText, gy: gyText, name: nameText };
    },

    updateLPBar: function (side, combatant) {
        if (!this.lpBars[side] || !combatant) return;
        var maxLP = 4000;
        var pct = Math.max(0, Math.min(1, combatant.lp / maxLP));
        var bar = this.lpBars[side];

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
            bar.fill.fillRect(bar.barX + 1, bar.barY + 1, (bar.barW - 2) * pct, bar.barH - 2);

            // Shine
            bar.fill.fillStyle(0xffffff, 0.08);
            bar.fill.fillRect(bar.barX + 1, bar.barY + 1, (bar.barW - 2) * pct, (bar.barH - 2) / 2);
        }

        if (this.lpTexts[side]) {
            this.lpTexts[side].lp.setText('LP ' + combatant.lp + ' / ' + maxLP);
            this.lpTexts[side].deck.setText('DECK: ' + (combatant.deck ? combatant.deck.length : 0));
            this.lpTexts[side].gy.setText('GY: ' + (combatant.graveyard ? combatant.graveyard.length : 0));
            this.lpTexts[side].name.setText(combatant.name || (side === 'player' ? 'Player' : 'Enemy'));
        }
    },

    // ===== CENTER DIVIDER =====
    _createCenterDivider: function () {
        var W = this.W;
        var H = this.H;
        var centerH = this.CENTER_H;
        var lpH = this.LP_BAR_H;
        var gap = this.FIELD_GAP;
        var totalFixed = lpH * 2 + centerH + gap * 4;
        var fieldH = (H - totalFixed) / 2;
        var y = lpH + gap + fieldH + gap;

        var container = this.add.container(0, y);

        // Background
        var bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.95);
        bg.fillRect(0, 0, W, centerH);
        bg.fillStyle(0x0f0f23, 0.95);
        bg.fillRect(0, Math.floor(centerH * 0.3), W, Math.floor(centerH * 0.4));
        container.add(bg);

        // Gold accent lines
        var accents = this.add.graphics();
        accents.fillStyle(0xffd700, 0.5);
        accents.fillRect(0, 0, W, 1);
        accents.fillRect(0, centerH - 1, W, 1);
        container.add(accents);

        // VS text
        this.vsText = this.add.text(W / 2, centerH / 2, 'VS', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            color: '#ffd700',
            fontStyle: 'bold'
        });
        this.vsText.setOrigin(0.5, 0.5);
        this.vsText.setShadow(0, 0, '#ffd700', 12);
        container.add(this.vsText);

        // Turn text
        this.turnText = this.add.text(W / 2 - 40, centerH / 2, 'Turn 0', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: 'rgba(255,255,255,0.6)'
        });
        this.turnText.setOrigin(1, 0.5);
        container.add(this.turnText);

        // Phase text
        this.phaseText = this.add.text(W / 2 + 40, centerH / 2, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: 'rgba(68,204,136,0.8)'
        });
        this.phaseText.setOrigin(0, 0.5);
        container.add(this.phaseText);

        // Decorative lines
        var lines = this.add.graphics();
        lines.lineStyle(1, 0xffd700, 0.2);
        lines.beginPath();
        lines.moveTo(20, centerH / 2);
        lines.lineTo(W / 2 - 60, centerH / 2);
        lines.strokePath();
        lines.beginPath();
        lines.moveTo(W / 2 + 60, centerH / 2);
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

    // ===== HERO ZONES =====
    _createHeroZones: function () {
        var W = this.W;
        var H = this.H;
        var lpH = this.LP_BAR_H;
        var gap = this.FIELD_GAP;
        var centerH = this.CENTER_H;
        var zoneW = this.ZONE_W;
        var zoneH = this.ZONE_H;
        var zoneGap = this.ZONE_GAP;
        var totalFixed = lpH * 2 + centerH + gap * 4;
        var fieldH = (H - totalFixed) / 2;

        var totalHeroW = zoneW * 3 + zoneGap * 2;

        // Player field (bottom)
        var playerFieldY = lpH + gap + fieldH + gap + centerH + gap;
        var heroStartX = (W - totalHeroW) / 2;
        var heroY = playerFieldY + (fieldH - zoneH) / 2;

        for (var i = 0; i < 3; i++) {
            var zx = heroStartX + i * (zoneW + zoneGap);
            var container = this.add.container(0, 0);
            this._drawEmptyHeroZone(container, zx, heroY, zoneW, zoneH, i);
            var label = this.add.text(zx + zoneW / 2, heroY - 3, 'HERO ' + (i + 1), {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '5px',
                color: 'rgba(68,136,255,0.3)'
            });
            label.setOrigin(0.5, 1);
            this.heroZones.player.push(container);
            this.zoneContainers.player.push({ x: zx, y: heroY, w: zoneW, h: zoneH });
            this.heroLabels.player.push(label);
        }

        // Enemy field (top)
        var enemyFieldY = lpH + gap;
        var enemyHeroY = enemyFieldY + (fieldH - zoneH) / 2;

        for (var i = 0; i < 3; i++) {
            var zx = heroStartX + i * (zoneW + zoneGap);
            var container = this.add.container(0, 0);
            this._drawEmptyHeroZone(container, zx, enemyHeroY, zoneW, zoneH, i);
            var label = this.add.text(zx + zoneW / 2, enemyHeroY - 3, 'HERO ' + (i + 1), {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '5px',
                color: 'rgba(68,136,255,0.3)'
            });
            label.setOrigin(0.5, 1);
            this.heroZones.enemy.push(container);
            this.zoneContainers.enemy.push({ x: zx, y: enemyHeroY, w: zoneW, h: zoneH });
            this.heroLabels.enemy.push(label);
        }
    },

    _drawEmptyHeroZone: function (container, x, y, w, h, index) {
        var bg = this.add.graphics();
        bg.fillStyle(0x141432, 0.4);
        bg.fillRect(x, y, w, h);
        bg.lineStyle(1, 0x4488ff, 0.15);
        // Dashed border approximation: just a solid thin border
        bg.strokeRect(x, y, w, h);
        container.add(bg);

        // Placeholder icon
        var icon = this.add.text(x + w / 2, y + h / 2, '⚔', {
            fontSize: '20px',
            color: 'rgba(68,136,255,0.12)'
        });
        icon.setOrigin(0.5, 0.5);
        container.add(icon);
    },

    // ===== SKILL ZONES =====
    _createSkillZones: function () {
        var W = this.W;
        var H = this.H;
        var lpH = this.LP_BAR_H;
        var gap = this.FIELD_GAP;
        var centerH = this.CENTER_H;
        var zoneW = this.ZONE_W;
        var zoneGap = this.ZONE_GAP;
        var skillW = this.SKILL_ZONE_W;
        var skillH = this.SKILL_ZONE_H;
        var totalFixed = lpH * 2 + centerH + gap * 4;
        var fieldH = (H - totalFixed) / 2;
        var totalHeroW = zoneW * 3 + zoneGap * 2;
        var heroStartX = (W - totalHeroW) / 2;

        // Player skill zones
        var playerFieldY = lpH + gap + fieldH + gap + centerH + gap;
        var skillY = playerFieldY + (fieldH - skillH) / 2;
        var leftSkillX = heroStartX - skillW - 18;
        var rightSkillX = heroStartX + totalHeroW + 18;

        for (var i = 0; i < 2; i++) {
            var sx = i === 0 ? leftSkillX : rightSkillX;
            var container = this.add.container(0, 0);
            this._drawEmptySkillZone(container, sx, skillY, skillW, skillH, i);
            this.skillZones.player.push(container);
            this.skillContainers.player.push({ x: sx, y: skillY, w: skillW, h: skillH });
        }

        // Enemy skill zones
        var enemyFieldY = lpH + gap;
        var enemySkillY = enemyFieldY + (fieldH - skillH) / 2;

        for (var i = 0; i < 2; i++) {
            var sx = i === 0 ? leftSkillX : rightSkillX;
            var container = this.add.container(0, 0);
            this._drawEmptySkillZone(container, sx, enemySkillY, skillW, skillH, i);
            this.skillZones.enemy.push(container);
            this.skillContainers.enemy.push({ x: sx, y: enemySkillY, w: skillW, h: skillH });
        }
    },

    _drawEmptySkillZone: function (container, x, y, w, h, index) {
        var bg = this.add.graphics();
        bg.fillStyle(0x141432, 0.3);
        bg.fillRect(x, y, w, h);
        bg.lineStyle(1, 0x9b59b6, 0.15);
        bg.strokeRect(x, y, w, h);
        container.add(bg);

        var icon = this.add.text(x + w / 2, y + h / 2 - 4, '✨', {
            fontSize: '16px',
            color: 'rgba(155,89,182,0.12)'
        });
        icon.setOrigin(0.5, 0.5);
        container.add(icon);
    },

    // ===== RENDER FIELD STATE =====
    renderField: function (player, enemy) {
        this.playerData = player;
        this.enemyData = enemy;

        var state = { player: player, enemy: enemy, turn: BattleEngine.turnNumber, phase: BattleEngine.currentPhase };

        // Update LP bars
        this.updateLPBar('player', player);
        this.updateLPBar('enemy', enemy);

        // Update center divider
        this.updateCenterDivider(state);

        // Update hero zones
        for (var i = 0; i < 3; i++) {
            this._updateHeroZone('player', i, player.heroZones ? player.heroZones[i] : null);
            this._updateHeroZone('enemy', i, enemy.heroZones ? enemy.heroZones[i] : null);
        }

        // Update skill zones
        for (var i = 0; i < 2; i++) {
            this._updateSkillZone('player', i, player.skillZones ? player.skillZones[i] : null);
            this._updateSkillZone('enemy', i, enemy.skillZones ? enemy.skillZones[i] : null);
        }
    },

    _updateHeroZone: function (side, index, hero) {
        var container = this.heroZones[side][index];
        if (!container) return;

        // Clear old contents
        container.removeAll(true);

        var pos = this.zoneContainers[side][index];
        if (!pos) return;
        var x = pos.x;
        var y = pos.y;
        var w = pos.w;
        var h = pos.h;

        if (!hero) {
            this._drawEmptyHeroZone(container, x, y, w, h, index);
            return;
        }

        // Rarity glow + border
        var rarityInfo = typeof RARITIES !== 'undefined' ? RARITIES[hero.rarity] : null;
        var rarityColor = rarityInfo ? rarityInfo.color : '#555555';
        var rarityHex = Phaser.Display.Color.HexStringToColor(rarityColor).color;

        var cls = typeof CLASSES !== 'undefined' ? CLASSES[hero.class || hero.type] : null;
        var clsColor = cls ? cls.color : '#888888';
        var clsHex = Phaser.Display.Color.HexStringToColor(clsColor).color;

        // Card body
        var body = this.add.graphics();
        body.fillStyle(0x000a1e, 0.85);
        body.fillRect(x + 1, y + 1, w - 2, h - 2);

        // Rarity border glow
        body.lineStyle(2, rarityHex, 1);
        body.strokeRect(x, y, w, h);
        container.add(body);

        // Class color top strip
        var strip = this.add.graphics();
        strip.fillStyle(clsHex, 1);
        strip.fillRect(x + 1, y + 1, w - 2, 3);
        container.add(strip);

        // Name + HP header
        var headerBg = this.add.graphics();
        headerBg.fillStyle(0x000000, 0.5);
        headerBg.fillRect(x + 4, y + 5, w - 8, 13);
        container.add(headerBg);

        var nameText = this.add.text(x + 6, y + 5 + 4.5, hero.name || 'Hero', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '5px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        container.add(nameText);

        var hpText = this.add.text(x + w - 6, y + 5 + 4.5, 'HP ' + (hero.currentHp || 0), {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '5px',
            color: '#ff4444',
            fontStyle: 'bold'
        });
        hpText.setOrigin(1, 0);
        container.add(hpText);

        // Art area
        var artY = y + 19;
        var artH = h * 0.4;
        var artBg = this.add.graphics();
        artBg.fillStyle(0x0f3460, 1);
        artBg.fillRect(x + 4, artY, w - 8, artH);
        artBg.lineStyle(1, 0xc8a832, 1);
        artBg.strokeRect(x + 4, artY, w - 8, artH);
        container.add(artBg);

        // Sprite — class emoji as placeholder (Pixel art textures loaded async)
        var spriteSize = Math.min(w - 12, artH - 4);
        var spriteX = x + 4 + (w - 8 - spriteSize) / 2;
        var spriteY = artY + (artH - spriteSize) / 2;

        var clsInfo = typeof CLASSES !== 'undefined' ? CLASSES[hero.class || hero.type] : null;
        var emoji = clsInfo ? clsInfo.emoji : '⚔';
        var spriteText = this.add.text(spriteX + spriteSize / 2, spriteY + spriteSize / 2, emoji, {
            fontSize: Math.floor(spriteSize * 0.5) + 'px'
        });
        spriteText.setOrigin(0.5, 0.5);
        container.add(spriteText);

        // Type + rarity line
        var infoY = artY + artH + 2;
        var infoBg = this.add.graphics();
        infoBg.fillStyle(0x000000, 0.4);
        infoBg.fillRect(x + 4, infoY, w - 8, 8);
        container.add(infoBg);

        var typeName = cls ? cls.name : 'Hero';
        var typeText = this.add.text(x + 6, infoY + 2, typeName, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '4px',
            color: clsColor
        });
        container.add(typeText);

        var rarityName = rarityInfo ? rarityInfo.name : '';
        var rarityText = this.add.text(x + w - 6, infoY + 2, rarityName, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '4px',
            color: rarityColor
        });
        rarityText.setOrigin(1, 0);
        container.add(rarityText);

        // Stats box
        var statsY = infoY + 10;
        var statsBg = this.add.graphics();
        statsBg.fillStyle(0x000000, 0.5);
        statsBg.fillRect(x + 4, statsY, w - 8, h - statsY + y - 4);
        container.add(statsBg);

        // HP bar
        var hpBarX = x + 6;
        var hpBarW = w - 12;
        var hpBarY2 = statsY + 2;
        var hpBarH = 6;
        var hpPct = Math.max(0, (hero.currentHp || 0) / (hero.maxHp || 1));

        var hpBar = this.add.graphics();
        hpBar.fillStyle(0x222222, 1);
        hpBar.fillRect(hpBarX, hpBarY2, hpBarW, hpBarH);

        var hpColor = hpPct > 0.6 ? 0x22cc66 : hpPct > 0.3 ? 0xffcc00 : 0xff3333;
        hpBar.fillStyle(hpColor, 1);
        hpBar.fillRect(hpBarX, hpBarY2, hpBarW * hpPct, hpBarH);
        hpBar.lineStyle(0.5, 0xffffff, 0.15);
        hpBar.strokeRect(hpBarX, hpBarY2, hpBarW, hpBarH);
        container.add(hpBar);

        var hpBarText = this.add.text(x + 4 + (w - 8) / 2, hpBarY2 + 3, (hero.currentHp || 0) + '/' + (hero.maxHp || 0), {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '4px',
            color: '#ffffff'
        });
        hpBarText.setOrigin(0.5, 0.5);
        container.add(hpBarText);

        // ATK / DEF
        var totalAtk = ((hero.stats && hero.stats.atk) || 0) + (hero.atkBuff || 0);
        var totalDef = ((hero.stats && hero.stats.def) || 0) + (hero.defBuff || 0);
        var statBoxY = hpBarY2 + hpBarH + 2;
        var halfW = (w - 12) / 2;

        var atkBg = this.add.graphics();
        atkBg.fillStyle(0xe94560, 0.5);
        atkBg.fillRect(x + 6, statBoxY, halfW, 8);
        container.add(atkBg);

        var atkText = this.add.text(x + 8, statBoxY + 2, '⚔' + totalAtk, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '5px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        container.add(atkText);

        var defBg = this.add.graphics();
        defBg.fillStyle(0x4488ff, 0.5);
        defBg.fillRect(x + 8 + halfW, statBoxY, halfW, 8);
        container.add(defBg);

        var defText = this.add.text(x + w - 8, statBoxY + 2, '🛡' + totalDef, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '5px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        defText.setOrigin(1, 0);
        container.add(defText);

        // Defense position indicator
        if (hero.position === 'defense') {
            var defOverlay = this.add.graphics();
            defOverlay.fillStyle(0x4488ff, 0.2);
            defOverlay.fillRect(x, y, w, h);
            container.add(defOverlay);

            var defLabel = this.add.text(x + w / 2, y + h - 4, 'DEF', {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '4px',
                color: 'rgba(68,136,255,0.9)',
                fontStyle: 'bold'
            });
            defLabel.setOrigin(0.5, 1);
            container.add(defLabel);
        }

        // Can-attack pulse glow
        if (hero.canAttack && !hero.hasAttacked && hero.position === 'attack') {
            var glow = this.add.graphics();
            glow.lineStyle(2, 0xffd700, 0.6);
            glow.strokeRect(x + 1, y + 1, w - 2, h - 2);
            container.add(glow);

            // Pulse tween on the glow
            this.tweens.add({
                targets: glow,
                alpha: { from: 0.3, to: 0.8 },
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
    },

    _updateSkillZone: function (side, index, card) {
        var container = this.skillZones[side][index];
        if (!container) return;

        container.removeAll(true);

        var pos = this.skillContainers[side][index];
        if (!pos) return;
        var x = pos.x;
        var y = pos.y;
        var w = pos.w;
        var h = pos.h;

        if (!card) {
            this._drawEmptySkillZone(container, x, y, w, h, index);
            return;
        }

        var typeInfo = (typeof CARD_TYPES !== 'undefined') ? CARD_TYPES[card.type] : null;
        var rarityColor = (typeof RARITIES !== 'undefined' && RARITIES[card.rarity]) ? RARITIES[card.rarity].color : '#aaaaaa';
        var rarityHex = Phaser.Display.Color.HexStringToColor(rarityColor).color;

        // Background
        var bg = this.add.graphics();
        bg.fillStyle(0x140a28, 0.8);
        bg.fillRect(x, y, w, h);
        bg.lineStyle(1.5, rarityHex, 1);
        bg.strokeRect(x, y, w, h);
        bg.lineStyle(0.5, rarityHex, 1);
        bg.strokeRect(x + 3, y + 3, w - 6, h - 6);
        container.add(bg);

        // Icon
        var emoji = typeInfo ? typeInfo.emoji : '✨';
        var icon = this.add.text(x + w / 2, y + h / 2 - 4, emoji, {
            fontSize: '18px'
        });
        icon.setOrigin(0.5, 0.5);
        container.add(icon);

        // Name
        var nameText = this.add.text(x + w / 2, y + h - 10, card.name || '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '4px',
            color: rarityColor
        });
        nameText.setOrigin(0.5, 0.5);
        container.add(nameText);

        // Description
        if (card.description) {
            var desc = card.description.length > 18 ? card.description.substring(0, 18) + '...' : card.description;
            var descText = this.add.text(x + w / 2, y + h - 4, desc, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '3px',
                color: '#aaaaff'
            });
            descText.setOrigin(0.5, 0.5);
            descText.setAlpha(0.6);
            container.add(descText);
        }
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
            fontSize: '16px',
            color: color,
            fontStyle: 'bold'
        });
        banner.setOrigin(0.5, 0.5);
        banner.setAlpha(0);
        banner.setScale(0.5);
        banner.setShadow(0, 0, color, 20);

        // Backdrop
        var backdrop = this.add.graphics();
        backdrop.fillStyle(0x000000, 0);
        backdrop.fillRect(0, this.H / 2 - 20, this.W, 40);

        this.phaseBanner = banner;
        this.phaseBanner._backdrop = backdrop;

        // Fade in + scale up
        this.tweens.add({
            targets: banner,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: function () {
                // Fade out after hold
                this.time.delayedCall(600, function () {
                    this.tweens.add({
                        targets: banner,
                        alpha: 0,
                        scaleX: 1.2,
                        scaleY: 1.2,
                        duration: 400,
                        onComplete: function () {
                            if (backdrop) backdrop.destroy();
                            banner.destroy();
                            if (this.phaseBanner === banner) this.phaseBanner = null;
                        }.bind(this)
                    });
                }.bind(this));
            }.bind(this)
        });

        // Animate backdrop alpha
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

    // ===== ATTACK ANIMATIONS =====
    playAttack: function (attackIdx, targetIdx, isPlayerAttacking, damage, isCrit) {
        var zoneW = this.ZONE_W;
        var zoneGap = this.ZONE_GAP;
        var totalHeroW = zoneW * 3 + zoneGap * 2;

        var srcField = isPlayerAttacking ? this.zoneContainers.player : this.zoneContainers.enemy;
        var tgtField = isPlayerAttacking ? this.zoneContainers.enemy : this.zoneContainers.player;

        if (!srcField[attackIdx] || !tgtField[targetIdx]) return;

        var srcX = srcField[attackIdx].x + zoneW / 2;
        var srcY = srcField[attackIdx].y + this.ZONE_H / 2;
        var tgtX = tgtField[targetIdx].x + zoneW / 2;
        var tgtY = tgtField[targetIdx].y + this.ZONE_H / 2;

        // Attack flash circle
        var flash = this.add.graphics();
        flash.fillStyle(isCrit ? 0xff4444 : 0xffffff, 1);
        flash.fillCircle(0, 0, 6);
        flash.setPosition(srcX, srcY);

        // Trail line
        var trail = this.add.graphics();
        trail.lineStyle(isCrit ? 3 : 2, isCrit ? 0xff4444 : 0xffffff, 0.6);
        trail.beginPath();
        trail.moveTo(srcX, srcY);
        trail.lineTo(srcX, srcY);
        trail.strokePath();

        // Lunge animation
        this.tweens.add({
            targets: flash,
            x: tgtX,
            y: tgtY,
            duration: 300,
            ease: 'Power2',
            onUpdate: function (tween) {
                // Update trail
                var progress = tween.progress;
                var cx = srcX + (tgtX - srcX) * progress;
                var cy = srcY + (tgtY - srcY) * progress;
                trail.clear();
                trail.lineStyle(isCrit ? 3 : 2, isCrit ? 0xff4444 : 0xffffff, 0.6);
                trail.beginPath();
                trail.moveTo(srcX, srcY);
                trail.lineTo(cx, cy);
                trail.strokePath();
            },
            onComplete: function () {
                // Impact flash
                this.spawnDamageNumber(tgtX + (Math.random() - 0.5) * 30, tgtY - 20, damage, isCrit);
                this.triggerShake(isCrit ? 8 : 4, isCrit ? 0.6 : 0.3);

                // Flash on target zone
                var impactFlash = this.add.graphics();
                impactFlash.fillStyle(isCrit ? 0xff3232 : 0xffffff, isCrit ? 0.4 : 0.3);
                impactFlash.fillRect(tgtX - zoneW / 2, tgtY - this.ZONE_H / 2, zoneW, this.ZONE_H);

                this.tweens.add({
                    targets: impactFlash,
                    alpha: 0,
                    duration: 400,
                    onComplete: function () { impactFlash.destroy(); }
                });

                // Cleanup
                flash.destroy();
                trail.destroy();
            }.bind(this)
        });
    },

    // ===== SCREEN SHAKE =====
    triggerShake: function (intensity, duration) {
        // Use Phaser camera shake
        this.cameras.main.shake(duration * 1000, intensity / 1000);
    },

    // ===== GET HERO ZONE POSITION =====
    getHeroZonePosition: function (zoneIndex, isPlayer) {
        var zones = isPlayer ? this.zoneContainers.player : this.zoneContainers.enemy;
        if (!zones[zoneIndex]) return { x: this.W / 2, y: this.H / 2 };
        return {
            x: zones[zoneIndex].x + this.ZONE_W / 2,
            y: zones[zoneIndex].y + this.ZONE_H / 2
        };
    },

    // ===== TRANSITION =====
    showTransition: function (type, onComplete) {
        var overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 1);
        overlay.fillRect(0, 0, this.W, this.H);
        overlay.setDepth(100);

        if (type === 'enter') {
            // Fade from black
            this.tweens.add({
                targets: overlay,
                alpha: 0,
                duration: 800,
                onComplete: function () {
                    overlay.destroy();
                    if (onComplete) onComplete();
                }
            });

            // "DUEL!" text
            var duelText = this.add.text(this.W / 2, this.H / 2, '⚔ DUEL! ⚔', {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '28px',
                color: '#ffd700',
                fontStyle: 'bold'
            });
            duelText.setOrigin(0.5, 0.5);
            duelText.setShadow(0, 0, '#ffd700', 30);
            duelText.setDepth(101);

            this.tweens.add({
                targets: duelText,
                alpha: 0,
                scaleX: 2,
                scaleY: 2,
                duration: 1200,
                delay: 400,
                onComplete: function () { duelText.destroy(); }
            });
        } else {
            // Fade to black
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

    // ===== UPDATE LOOP =====
    update: function (time, delta) {
        // Phaser handles the render loop — no manual RAF needed
        // All state updates come from renderField() calls
    }
});
