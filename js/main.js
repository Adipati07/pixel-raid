/* ========================================
 * PIXEL RAID — Main Entry Point
 * Card Collector Auto-Battle RPG
 * ======================================== */

(function() {
    'use strict';

    // Load save or init new game
    const hasSave = GameState.load();
    
    if (!hasSave) {
        // Starter cards are now given by the Tutorial character creation step
        // Only init basic player data here
        console.log('🎮 New game! Tutorial will handle character creation...');

        // Init empty inventory if needed
        if (!GameState.inventory) GameState.inventory = [];

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
