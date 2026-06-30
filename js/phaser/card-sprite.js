/* ========================================
 * Phaser Card Sprite — TCG Chaos Rising style card container
 * Used for cards on the battle field (not hand — hand stays DOM)
 * Portrait orientation: 120x170
 * ======================================== */

var PhaserCardSprite = new Phaser.Class({
    Extends: Phaser.GameObjects.Container,

    initialize: function PhaserCardSprite(scene, x, y, card, options) {
        Phaser.GameObjects.Container.call(this, scene, x, y);

        this.scene = scene;
        this.card = card;
        this.options = options || {};
        this.cardW = this.options.width || 120;
        this.cardH = this.options.height || 170;
        this.isHovering = false;
        this.isPlayable = false;
        this._glowTween = null;
        this._pulseTween = null;

        this._buildCard();
        scene.add.existing(this);
    },

    _buildCard: function () {
        var card = this.card;
        var w = this.cardW;
        var h = this.cardH;

        // Resolve class and rarity info
        var cls = (typeof CLASSES !== 'undefined') ? CLASSES[card.class || card.type || card.cls] : null;
        var rarityInfo = (typeof RARITIES !== 'undefined') ? RARITIES[card.rarity] : null;

        var clsColor = cls ? cls.color : '#888888';
        var clsHex = Phaser.Display.Color.HexStringToColor(clsColor).color;
        var rarityColor = rarityInfo ? rarityInfo.color : '#aaaaaa';
        var rarityHex = Phaser.Display.Color.HexStringToColor(rarityColor).color;

        // === CARD BODY ===
        var body = this.scene.add.graphics();
        // Dark body
        body.fillStyle(0x1a1a2e, 1);
        body.fillRoundedRect(-w / 2, -h / 2, w, h, 4);

        // Rarity border
        body.lineStyle(2, rarityHex, 1);
        body.strokeRoundedRect(-w / 2, -h / 2, w, h, 4);

        // Class-colored name banner at top
        body.fillStyle(clsHex, 1);
        body.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 20);

        this.add(body);

        // === NAME TEXT ===
        var nameText = this.scene.add.text(0, -h / 2 + 12, card.name || 'Card', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        nameText.setOrigin(0.5, 0.5);
        this.add(nameText);

        // === RARITY STARS ===
        var rarityStars = this._getRarityStars(card.rarity);
        if (rarityStars > 0) {
            var starsText = this.scene.add.text(0, -h / 2 + 26, '★'.repeat(rarityStars), {
                fontSize: '8px',
                color: '#ffd700'
            });
            starsText.setOrigin(0.5, 0.5);
            this.add(starsText);
        }

        // === ART WINDOW ===
        var artX = -w / 2 + 8;
        var artY = -h / 2 + 34;
        var artW = w - 16;
        var artH = 60;

        var artBg = this.scene.add.graphics();
        artBg.fillStyle(0x0f3460, 1);
        artBg.fillRect(artX, artY, artW, artH);
        // Golden art frame
        artBg.lineStyle(1, 0xc8a832, 1);
        artBg.strokeRect(artX, artY, artW, artH);
        this.add(artBg);

        // Sprite (class emoji placeholder — pixel art would use CardRenderer)
        var emoji = cls ? cls.emoji : '⚔';
        var spriteText = this.scene.add.text(0, artY + artH / 2, emoji, {
            fontSize: '24px'
        });
        spriteText.setOrigin(0.5, 0.5);
        this.add(spriteText);

        // === TYPE BADGE ===
        var typeY = artY + artH + 4;
        var typeInfo = (typeof CARD_TYPES !== 'undefined') ? CARD_TYPES[card.type] : null;
        var typeName = cls ? cls.name : (typeInfo ? typeInfo.name : 'Hero');

        var typeBadge = this.scene.add.graphics();
        typeBadge.fillStyle(0x000000, 0.4);
        typeBadge.fillRect(-w / 2 + 6, typeY, w - 12, 12);
        this.add(typeBadge);

        var typeText = this.scene.add.text(-w / 2 + 8, typeY + 2, typeName, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '5px',
            color: clsColor
        });
        this.add(typeText);

        var rarityText = this.scene.add.text(w / 2 - 8, typeY + 2, rarityInfo ? rarityInfo.name : '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '5px',
            color: rarityColor
        });
        rarityText.setOrigin(1, 0);
        this.add(rarityText);

        // === HP BAR (for heroes) ===
        if (card.currentHp !== undefined || card.maxHp !== undefined) {
            var hpBarY = typeY + 16;
            var hpBarW = w - 20;
            var hpPct = Math.max(0, (card.currentHp || 0) / (card.maxHp || 1));

            var hpBar = this.scene.add.graphics();
            hpBar.fillStyle(0x222222, 1);
            hpBar.fillRect(-hpBarW / 2, hpBarY, hpBarW, 6);

            var hpColor = hpPct > 0.6 ? 0x22cc66 : hpPct > 0.3 ? 0xffcc00 : 0xff3333;
            hpBar.fillStyle(hpColor, 1);
            hpBar.fillRect(-hpBarW / 2, hpBarY, hpBarW * hpPct, 6);
            hpBar.lineStyle(0.5, 0xffffff, 0.15);
            hpBar.strokeRect(-hpBarW / 2, hpBarY, hpBarW, 6);
            this.add(hpBar);

            var hpLabel = this.scene.add.text(0, hpBarY + 3, (card.currentHp || 0) + '/' + (card.maxHp || 0), {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '4px',
                color: '#ffffff'
            });
            hpLabel.setOrigin(0.5, 0.5);
            this.add(hpLabel);
        }

        // === ATK/DEF STATS BAR ===
        var statsY = (card.currentHp !== undefined) ? typeY + 26 : typeY + 16;
        var totalAtk = ((card.stats && card.stats.atk) || card.atk || 0) + (card.atkBuff || 0);
        var totalDef = ((card.stats && card.stats.def) || card.def || 0) + (card.defBuff || 0);

        var atkBg = this.scene.add.graphics();
        atkBg.fillStyle(0xe94560, 0.5);
        atkBg.fillRect(-w / 2 + 6, statsY, (w - 16) / 2, 12);
        this.add(atkBg);

        var atkText = this.scene.add.text(-w / 2 + 8, statsY + 3, '⚔' + totalAtk, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        this.add(atkText);

        var defBg = this.scene.add.graphics();
        defBg.fillStyle(0x4488ff, 0.5);
        defBg.fillRect(2, statsY, (w - 16) / 2, 12);
        this.add(defBg);

        var defText = this.scene.add.text(w / 2 - 8, statsY + 3, '🛡' + totalDef, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        defText.setOrigin(1, 0);
        this.add(defText);

        // === DESCRIPTION (for skill cards) ===
        if (card.description && card.currentHp === undefined) {
            var descBg = this.scene.add.graphics();
            descBg.fillStyle(0x000000, 0.3);
            descBg.fillRect(-w / 2 + 6, statsY + 16, w - 12, 30);
            this.add(descBg);

            var descText = this.scene.add.text(0, statsY + 26, card.description, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '4px',
                color: '#aaaaff',
                wordWrap: { width: w - 20 }
            });
            descText.setOrigin(0.5, 0.5);
            descText.setAlpha(0.7);
            this.add(descText);
        }

        // === GLOW EFFECT (for rarity) ===
        this._glowGraphics = this.scene.add.graphics();
        this._glowGraphics.setAlpha(0);
        this.add(this._glowGraphics);
        this._glowGraphics.lineStyle(3, rarityHex, 0.6);
        this._glowGraphics.strokeRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 6);
    },

    _getRarityStars: function (rarity) {
        switch (rarity) {
            case 'common': return 1;
            case 'rare': return 2;
            case 'epic': return 3;
            case 'legendary': return 4;
            case 'mythic': return 5;
            default: return 0;
        }
    },

    // ===== HOVER EFFECTS =====
    enableHover: function () {
        this.setSize(this.cardW, this.cardH);
        this.setInteractive();

        this.on('pointerover', function () {
            this.isHovering = true;
            this.scene.tweens.add({
                targets: this,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 300,
                ease: 'Power2'
            });
            if (this._glowGraphics) {
                this.scene.tweens.add({
                    targets: this._glowGraphics,
                    alpha: 1,
                    duration: 300
                });
            }
        }, this);

        this.on('pointerout', function () {
            this.isHovering = false;
            this.scene.tweens.add({
                targets: this,
                scaleX: 1,
                scaleY: 1,
                duration: 300,
                ease: 'Power2'
            });
            if (this._glowGraphics) {
                this.scene.tweens.add({
                    targets: this._glowGraphics,
                    alpha: 0,
                    duration: 300
                });
            }
        }, this);
    },

    // ===== PLAYABLE PULSE =====
    setPlayable: function (playable) {
        this.isPlayable = playable;
        if (playable && !this._pulseTween) {
            this._pulseTween = this.scene.tweens.add({
                targets: this._glowGraphics,
                alpha: { from: 0.3, to: 0.8 },
                duration: 800,
                yoyo: true,
                repeat: -1
            });
        } else if (!playable && this._pulseTween) {
            this._pulseTween.stop();
            this._pulseTween = null;
            if (this._glowGraphics) this._glowGraphics.setAlpha(0);
        }
    },

    // ===== PLAY ANIMATION =====
    animatePlay: function (targetX, targetY, onComplete) {
        var origX = this.x;
        var origY = this.y;

        // Scale up then settle
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 100,
            ease: 'Power2',
            onComplete: function () {
                this.scene.tweens.add({
                    targets: this,
                    x: targetX,
                    y: targetY,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 200,
                    ease: 'Power2',
                    onComplete: function () {
                        if (onComplete) onComplete();
                    }.bind(this)
                });
            }.bind(this)
        });
    },

    // ===== DESTROY =====
    destroyCard: function () {
        if (this._pulseTween) this._pulseTween.stop();
        if (this._glowTween) this._glowTween.stop();
        this.destroy();
    }
});
