/* ========================================
 * Phaser Animation System — Tween-based battle animations
 * Uses Phaser's built-in tween engine for smooth WebGL animations
 * ======================================== */

var PhaserAnimations = {
    scene: null,

    init: function (scene) {
        this.scene = scene;
    },

    // ===== CARD PLAY ANIMATION =====
    // Tween a card sprite from hand position to field zone
    cardPlay: function (cardSprite, targetX, targetY, onComplete) {
        if (!this.scene || !cardSprite) return;

        this.scene.tweens.add({
            targets: cardSprite,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 100,
            ease: 'Power2',
            onComplete: function () {
                this.scene.tweens.add({
                    targets: cardSprite,
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

    // ===== ATTACK ANIMATION =====
    // Move attacker toward defender, flash on impact, return
    attack: function (attackerX, attackerY, targetX, targetY, isCrit, onComplete) {
        if (!this.scene) return;

        // Create flash projectile
        var flash = this.scene.add.graphics();
        flash.fillStyle(isCrit ? 0xff4444 : 0xffffff, 1);
        flash.fillCircle(0, 0, 6);
        flash.setPosition(attackerX, attackerY);

        // Trail
        var trail = this.scene.add.graphics();

        this.scene.tweens.add({
            targets: flash,
            x: targetX,
            y: targetY,
            duration: 250,
            ease: 'Power2',
            onUpdate: function (tween) {
                var t = tween.progress;
                var cx = attackerX + (targetX - attackerX) * t;
                var cy = attackerY + (targetY - attackerY) * t;
                trail.clear();
                trail.lineStyle(isCrit ? 3 : 2, isCrit ? 0xff4444 : 0xffffff, 0.6);
                trail.beginPath();
                trail.moveTo(attackerX, attackerY);
                trail.lineTo(cx, cy);
                trail.strokePath();
            },
            onComplete: function () {
                // Impact flash
                var impact = this.scene.add.graphics();
                impact.fillStyle(isCrit ? 0xff3232 : 0xffffff, isCrit ? 0.5 : 0.3);
                impact.fillCircle(targetX, targetY, 30);

                this.scene.tweens.add({
                    targets: impact,
                    alpha: 0,
                    scaleX: 2,
                    scaleY: 2,
                    duration: 300,
                    onComplete: function () { impact.destroy(); }
                });

                flash.destroy();
                trail.destroy();
                if (onComplete) onComplete();
            }.bind(this)
        });
    },

    // ===== DAMAGE NUMBER =====
    // Float text upward and fade
    damageNumber: function (x, y, text, color, isCrit) {
        if (!this.scene) return;

        var fontSize = isCrit ? '16px' : '12px';
        var dmgText = this.scene.add.text(x, y, String(text), {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: fontSize,
            color: color || '#ffffff',
            fontStyle: 'bold',
            stroke: isCrit ? '#cc0000' : '#000000',
            strokeThickness: 3
        });
        dmgText.setOrigin(0.5, 0.5);
        if (isCrit) dmgText.setScale(1.3);

        this.scene.tweens.add({
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

    // ===== HEAL NUMBER =====
    healNumber: function (x, y, amount) {
        if (!this.scene) return;

        var healText = this.scene.add.text(x, y, '+' + amount, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#44ff88',
            fontStyle: 'bold',
            stroke: '#006622',
            strokeThickness: 3
        });
        healText.setOrigin(0.5, 0.5);

        this.scene.tweens.add({
            targets: healText,
            y: y - 50,
            alpha: 0,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 1200,
            ease: 'Power2',
            onComplete: function () { healText.destroy(); }
        });
    },

    // ===== PHASE BANNER =====
    // Large text that fades in, holds, then fades out
    phaseBanner: function (text, color) {
        if (!this.scene) return;

        var W = this.scene.W || 600;
        var H = this.scene.H || 400;

        var banner = this.scene.add.text(W / 2, H / 2, text.toUpperCase(), {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            color: color || '#ffd700',
            fontStyle: 'bold'
        });
        banner.setOrigin(0.5, 0.5);
        banner.setAlpha(0);
        banner.setScale(0.5);
        banner.setShadow(0, 0, color || '#ffd700', 20);

        // Backdrop
        var backdrop = this.scene.add.graphics();
        backdrop.fillStyle(0x000000, 0);
        backdrop.fillRect(0, H / 2 - 20, W, 40);

        this.scene.tweens.add({
            targets: banner,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: function () {
                this.scene.time.delayedCall(600, function () {
                    this.scene.tweens.add({
                        targets: banner,
                        alpha: 0,
                        scaleX: 1.2,
                        scaleY: 1.2,
                        duration: 400,
                        onComplete: function () {
                            banner.destroy();
                            backdrop.destroy();
                        }
                    });
                }.bind(this));
            }.bind(this)
        });

        this.scene.tweens.add({
            targets: backdrop,
            alpha: 0.5,
            duration: 300,
            yoyo: true,
            hold: 600
        });
    },

    // ===== HERO SUMMON EFFECT =====
    // Expanding circles + fade in at zone position
    heroSummon: function (x, y) {
        if (!this.scene) return;

        // Expanding rings
        var self = this;
        for (var i = 0; i < 3; i++) {
            (function (delay) {
                self.scene.time.delayedCall(delay, function () {
                    var ring = self.scene.add.graphics();
                    ring.lineStyle(2, 0xffd700, 0.8);
                    ring.strokeCircle(0, 0, 10);
                    ring.setPosition(x, y);

                    self.scene.tweens.add({
                        targets: ring,
                        scaleX: 4,
                        scaleY: 4,
                        alpha: 0,
                        duration: 600,
                        ease: 'Power2',
                        onComplete: function () { ring.destroy(); }
                    });
                });
            })(i * 150);
        }

        // Central flash
        var flash = this.scene.add.graphics();
        flash.fillStyle(0xffd700, 0.6);
        flash.fillCircle(0, 0, 20);
        flash.setPosition(x, y);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scaleX: 3,
            scaleY: 3,
            duration: 500,
            ease: 'Power2',
            onComplete: function () { flash.destroy(); }
        });
    },

    // ===== DEATH / DESTROY EFFECT =====
    // Grayscale tint + dissolve
    deathEffect: function (gameObject, onComplete) {
        if (!this.scene || !gameObject) return;

        // Tint to grayscale
        this.scene.tweens.add({
            targets: gameObject,
            alpha: 0,
            scaleX: 0.8,
            scaleY: 0.8,
            duration: 600,
            ease: 'Power2',
            onComplete: function () {
                if (onComplete) onComplete();
            }
        });

        // Dissolve particles (simple approach: multiple small graphics fading)
        var bounds = gameObject.getBounds ? gameObject.getBounds() : null;
        var cx = bounds ? bounds.centerX : gameObject.x;
        var cy = bounds ? bounds.centerY : gameObject.y;

        for (var i = 0; i < 8; i++) {
            var particle = this.scene.add.graphics();
            particle.fillStyle(0x888888, 0.6);
            particle.fillRect(-2, -2, 4, 4);
            particle.setPosition(cx + (Math.random() - 0.5) * 40, cy + (Math.random() - 0.5) * 40);

            this.scene.tweens.add({
                targets: particle,
                y: particle.y - 30 - Math.random() * 20,
                x: particle.x + (Math.random() - 0.5) * 30,
                alpha: 0,
                duration: 500 + Math.random() * 300,
                ease: 'Power2',
                onComplete: function () { particle.destroy(); }
            });
        }
    },

    // ===== SCREEN SHAKE =====
    shakeScreen: function (intensity, duration) {
        if (!this.scene) return;
        this.scene.cameras.main.shake(duration * 1000, intensity / 1000);
    },

    // ===== TRANSITION EFFECT =====
    transitionIn: function (onComplete) {
        if (!this.scene) return;

        var W = this.scene.W || 600;
        var H = this.scene.H || 400;

        var overlay = this.scene.add.graphics();
        overlay.fillStyle(0x000000, 1);
        overlay.fillRect(0, 0, W, H);
        overlay.setDepth(100);

        this.scene.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: 800,
            onComplete: function () {
                overlay.destroy();
                if (onComplete) onComplete();
            }
        });

        // "DUEL!" text
        var text = this.scene.add.text(W / 2, H / 2, '⚔ DUEL! ⚔', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '28px',
            color: '#ffd700',
            fontStyle: 'bold'
        });
        text.setOrigin(0.5, 0.5);
        text.setShadow(0, 0, '#ffd700', 30);
        text.setDepth(101);

        this.scene.tweens.add({
            targets: text,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 1200,
            delay: 400,
            onComplete: function () { text.destroy(); }
        });
    },

    transitionOut: function (onComplete) {
        if (!this.scene) return;

        var W = this.scene.W || 600;
        var H = this.scene.H || 400;

        var overlay = this.scene.add.graphics();
        overlay.fillStyle(0x000000, 0);
        overlay.fillRect(0, 0, W, H);
        overlay.setDepth(100);

        this.scene.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 800,
            onComplete: function () {
                overlay.destroy();
                if (onComplete) onComplete();
            }
        });
    },

    // ===== CLEANUP =====
    stop: function () {
        if (this.scene) {
            this.scene.tweens.killAll();
        }
        this.scene = null;
    }
};
