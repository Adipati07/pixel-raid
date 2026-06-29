/* ========================================
 * PIXEL RAID — Main Entry Point
 * Card Collector Auto-Battle RPG
 * ======================================== */

// Loading screen animation controller
const LoadingScreen = {
    el: null,
    bar: null,
    tip: null,
    tips: [
        'Gathering heroes from the frontier...',
        'Forging card battle engine...',
        'Loading pixel art assets...',
        'Preparing the arena...',
        'Sharpening swords...',
        'Enchanting skill cards...'
    ],
    show() {
        this.el = document.getElementById('loading-screen');
        this.bar = document.getElementById('loading-bar-inner');
        this.tip = document.getElementById('loading-tip');
        if (!this.el) return;
        this.el.style.display = 'flex';
        this.el.style.opacity = '1';
        this._animate();
    },
    _animate() {
        if (!this.bar) return;
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress > 100) progress = 100;
            this.bar.style.width = progress + '%';
            if (this.tip && Math.random() > 0.5) {
                this.tip.textContent = this.tips[Math.floor(Math.random() * this.tips.length)];
            }
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => this.hide(), 300);
            }
        }, 120);
    },
    hide() {
        if (!this.el) return;
        this.el.classList.add('fade-out');
        setTimeout(() => { this.el.style.display = 'none'; }, 500);
    }
};

(function() {
    'use strict';

    // Error boundary — catch and display friendly errors
    window.addEventListener('error', (e) => {
        console.error('Game error:', e.error || e.message);
        // Don't break the game for non-critical errors
        return true;
    });
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
        return true;
    });

    // Load save or init new game
    const hasSave = GameState.load();
    
    if (!hasSave || GameState.collection.length === 0) {
        console.log('🎮 New game! Giving starter heroes...');

        // Init empty inventory if needed
        if (!GameState.inventory) GameState.inventory = [];

        // Give 3 starter heroes immediately (don't depend on tutorial)
        GameState.player.name = GameState.player.name || 'Adventurer';
        const starterNames = ['Silver Knight', 'Fire Wielder', 'Princess'];
        starterNames.forEach(heroName => {
            const tmpl = CARD_TEMPLATES.find(t => t.name === heroName);
            if (tmpl) {
                const card = generateCard(tmpl, 'common');
                GameState.addToCollection(card);
                GameState.deck.push(card.id);
                card.inDeck = true;
            }
        });

        // Give starter items
        if (!GameState.inventory || GameState.inventory.length === 0) {
            const starterSword = createItem(ITEM_TEMPLATES.find(t => t.name === 'Rusty Sword'));
            const starterArmor = createItem(ITEM_TEMPLATES.find(t => t.name === 'Leather Vest'));
            if (starterSword) GameState.addItem(starterSword);
            if (starterArmor) GameState.addItem(starterArmor);
        }

        GameState.save();
    }

    // Init UI
    UI.init();
    if (typeof Sound !== 'undefined') Sound.init();

    // Show loading screen animation
    LoadingScreen.show();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case '1': UI.showScreen('battle'); break;
            case '2': UI.showScreen('heroes'); break;
            case '3': UI.showScreen('formation'); break;
            case '4': UI.showScreen('inventory'); break;
            case '5': UI.showScreen('shop'); break;
            case ' ': 
                e.preventDefault();
                if (!BattleEngine.isRunning) UI.startBattle();
                break;
        }
    });

    // Auto-save every 30 seconds
    setInterval(() => GameState.save(), 30000);

    // Welcome message
    if (hasSave) {
        console.log(`🎮 Save loaded! Stage ${GameState.player.stage}, ${GameState.collection.length} cards`);
    }

    // Auto-start tutorial for new players
    if (!hasSave || !GameState.stats.tutorialDone) {
        setTimeout(() => Tutorial.start(), 1500); // After loading screen fades
    }

    // Debug helpers
    window.DEBUG = {
        state: GameState,
        battle: BattleEngine,
        economy: Economy,
        formation: Formation,
        addGold: (n) => { Economy.addGold(n); UI.updateHeader(); },
        addGems: (n) => { Economy.addGems(n); UI.updateHeader(); },
        openPack: (type) => { const cards = Economy.buyPack(type || 'basic'); UI.updateHeader(); return cards; },
        skipStage: () => { GameState.player.stage++; GameState.player.wave = 1; GameState.save(); UI.renderBattleScreen(); },
    };

    console.log('⚔️ PIXEL RAID — Card Collector Battle RPG');
    console.log('Type DEBUG.help() for debug commands');
})();
