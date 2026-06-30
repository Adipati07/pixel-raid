/* ========================================
 * BattlePhaser — Integration Bridge
 * Connects vanilla battle.js with Phaser rendering
 * ======================================== */

var BattlePhaser = {
    // ===== STATE =====
    _game: null,
    _scene: null,
    _containerId: null,
    _active: false,
    _transitioning: false,

    // ===== INIT =====
    init: function (containerId) {
        this._containerId = containerId || 'battle-canvas-container';

        var container = document.getElementById(this._containerId);
        if (!container) {
            console.error('BattlePhaser: container not found:', this._containerId);
            return;
        }

        // Size to fill container (responsive)
        var rect = container.getBoundingClientRect();
        var W = Math.floor(rect.width) || 800;
        var H = Math.floor(rect.height) || 500;

        // Create Phaser game instance
        var config = {
            type: Phaser.AUTO,
            width: W,
            height: H,
            parent: this._containerId,
            backgroundColor: '#0a0a1a',
            scene: PhaserBattleScene,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            render: {
                pixelArt: false,
                antialias: true
            },
            audio: { noAudio: true },
            banner: false
        };

        try {
            this._game = new Phaser.Game(config);
        } catch (e) {
            console.error('BattlePhaser: failed to create Phaser game:', e);
            return;
        }

        // Wait for scene to be ready
        var self = this;
        var checkScene = function () {
            if (self._game.scene && self._game.scene.getScene('PhaserBattleScene')) {
                self._scene = self._game.scene.getScene('PhaserBattleScene');
                PhaserAnimations.init(self._scene);
                console.log('BattlePhaser: Phaser scene ready');
            } else {
                setTimeout(checkScene, 100);
            }
        };
        checkScene();
    },

    // ===== LIFECYCLE =====
    enter: function (player, enemy, onComplete) {
        if (!this._scene) {
            // Retry after scene loads
            var self = this;
            setTimeout(function () { self.enter(player, enemy, onComplete); }, 200);
            return;
        }

        this._active = true;
        this._transitioning = true;

        // Make container fullscreen overlay
        var container = document.getElementById(this._containerId);
        if (container) {
            container.style.cssText = [
                'position: fixed',
                'top: 0',
                'left: 0',
                'right: 0',
                'bottom: 0',
                'width: 100vw',
                'height: 100vh',
                'max-width: none',
                'min-height: 0',
                'z-index: 9999',
                'background: #0a0a1a',
                'display: block',
                'margin: 0',
                'padding: 0',
                'border: none',
                'border-radius: 0',
                'overflow: hidden'
            ].join('; ') + ';';

            // Move card hand and action buttons inside container
            var cardHand = document.getElementById('card-hand-area');
            var actionRow = document.querySelector('.battle-action-row');
            var infoStrip = document.querySelector('.battle-info-strip');
            var controls = document.querySelector('.battle-controls');
            var els = [cardHand, actionRow, infoStrip, controls];
            for (var i = 0; i < els.length; i++) {
                var el = els[i];
                if (el && el.parentElement !== container) {
                    container.appendChild(el);
                }
                if (el) {
                    el.style.display = '';
                    el.style.position = 'relative';
                    el.style.zIndex = '10000';
                }
            }
        }

        // Hide nav/header
        var hideEls = document.querySelectorAll('.game-nav, .game-header');
        for (var i = 0; i < hideEls.length; i++) {
            hideEls[i].style.display = 'none';
        }

        // Resize Phaser game to fill viewport
        var self = this;
        requestAnimationFrame(function () {
            self._resizeToViewport();
        });

        // Style the Phaser canvas to fill container
        var styleCanvas = function () {
            if (self._game && self._game.canvas) {
                var c = self._game.canvas;
                c.style.width = '100%';
                c.style.height = '100%';
                c.style.display = 'block';
                c.style.objectFit = 'contain';
                c.style.margin = '0 auto';
            }
        };
        setTimeout(styleCanvas, 50);
        setTimeout(styleCanvas, 200);
        setTimeout(styleCanvas, 500);

        // Show enter transition
        this._scene.showTransition('enter', function () {
            this._transitioning = false;
            if (onComplete) onComplete();
        }.bind(this));

        // Initial render
        this.renderField(player, enemy);
    },

    exit: function (onComplete) {
        this._transitioning = true;

        this._scene.showTransition('exit', function () {
            this._active = false;
            this._transitioning = false;

            // Restore from fullscreen
            var container = document.getElementById(this._containerId);
            var screenBattle = document.getElementById('screen-battle');

            // Move elements back
            var movedEls = ['#card-hand-area', '.battle-action-row', '.battle-info-strip', '.battle-controls'];
            for (var i = 0; i < movedEls.length; i++) {
                var el = document.querySelector(movedEls[i]);
                if (el && container && el.parentElement === container && screenBattle) {
                    screenBattle.appendChild(el);
                    el.style.cssText = '';
                }
            }

            if (container) {
                container.style.cssText = '';
            }

            // Restore hidden UI elements
            var showEls = document.querySelectorAll('.game-nav, .game-header');
            for (var i = 0; i < showEls.length; i++) {
                showEls[i].style.display = '';
            }

            // Resize back to standard
            if (this._game) {
                this._game.scale.resize(800, 500);
            }

            if (onComplete) onComplete();
        }.bind(this));
    },

    // ===== RESIZE =====
    _resizeToViewport: function () {
        if (!this._game) return;
        // Keep Phaser internal resolution at 800x500 (pixel art native)
        // Just scale the canvas via CSS to fill viewport
        var canvas = this._game.canvas;
        if (canvas) {
            canvas.style.width = '100%';
            canvas.style.height = 'calc(100vh - 180px)';
            canvas.style.objectFit = 'contain';
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto';
            canvas.style.maxHeight = 'calc(100vh - 180px)';
        }
    },

    // ===== RENDER FIELD =====
    renderField: function (player, enemy) {
        if (!this._scene || !this._active) return;
        this._scene.renderField(player, enemy);
    },

    // ===== ANIMATE CARD PLAY =====
    animateCardPlay: function (card, zoneIndex, isPlayer) {
        if (!this._scene || !this._active) return;
        var zonePos = this._scene.getHeroZonePosition(zoneIndex, isPlayer);
        PhaserAnimations.heroSummon(zonePos.x, zonePos.y);
    },

    // ===== ANIMATE ATTACK =====
    animateAttack: function (attackerIdx, targetIdx, isPlayer, damage, isCrit) {
        if (!this._scene || !this._active) return;
        this._scene.playAttack(attackerIdx, targetIdx || 0, isPlayer, damage, isCrit || false);
    },

    // ===== SPAWN DAMAGE TEXT =====
    spawnDmgText: function (amount, x, y, color) {
        if (!this._scene || !this._active) return;
        var isCrit = (typeof amount === 'string' && (amount.includes('CRIT') || amount.includes('💥')));
        this._scene.spawnDamageNumber(x, y, amount, isCrit);
    },

    // ===== SPAWN HEAL TEXT =====
    spawnHealText: function (amount, x, y) {
        if (!this._scene || !this._active) return;
        this._scene.spawnHealNumber(x, y, amount);
    },

    // ===== SHOW PHASE BANNER =====
    showPhaseBanner: function (phase, isPlayer) {
        if (!this._scene || !this._active) return;
        this._scene.showPhaseBanner(phase, isPlayer);
    },

    // ===== UPDATE LP =====
    updateLP: function (isPlayer, current, max) {
        if (!this._scene || !this._active) return;
        var side = isPlayer ? 'player' : 'enemy';
        this._scene.updateLPBar(side, { lp: current, deck: [], graveyard: [] });
    },

    // ===== TRIGGER SHAKE =====
    triggerShake: function (intensity, duration) {
        if (!this._scene || !this._active) return;
        this._scene.triggerShake(intensity, duration);
    },

    // ===== GET HERO ZONE POSITION =====
    getHeroZonePosition: function (zoneIndex, isPlayer) {
        if (!this._scene) return { x: 300, y: 200 };
        return this._scene.getHeroZonePosition(zoneIndex, isPlayer);
    },

    // ===== ACTIVE STATE =====
    isActive: function () {
        return this._active && this._scene !== null;
    },

    isTransitioning: function () {
        return this._transitioning;
    },

    // ===== PLAY ATTACK (BattleArenaScene-compatible API) =====
    playAttack: function (attackIdx, targetIdx, isPlayerAttacking, damage, isCrit) {
        if (!this._scene || !this._active) return;
        this._scene.playAttack(attackIdx, targetIdx, isPlayerAttacking, damage, isCrit);
    },

    // ===== SPAWN DAMAGE NUMBER (BattleArenaScene-compatible) =====
    spawnDamageNumber: function (x, y, amount, isCrit) {
        if (!this._scene || !this._active) return;
        this._scene.spawnDamageNumber(x, y, amount, isCrit);
    },

    // ===== SPAWN HEAL NUMBER (BattleArenaScene-compatible) =====
    spawnHealNumber: function (x, y, amount) {
        if (!this._scene || !this._active) return;
        this._scene.spawnHealNumber(x, y, amount);
    },

    // ===== SHOW PHASE BANNER (BattleArenaScene-compatible) =====
    showPhaseBanner: function (text, isPlayer) {
        if (!this._scene || !this._active) return;
        this._scene.showPhaseBanner(text, isPlayer);
    },

    // ===== DESTROY =====
    destroy: function () {
        this._active = false;
        PhaserAnimations.stop();
        if (this._game) {
            this._game.destroy(true);
            this._game = null;
        }
        this._scene = null;
    }
};
